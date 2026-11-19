// AUTHORED-BY Claude Fable 5.2
/**
 * Organisation-to-organisation deliveries and what organisations keep in their own stores.
 *
 * A delivery is an `as:Announce` appended to the recipient's `inbox/`. It carries pointers, not
 * payloads: the thing delivered stays in the sender's pod, and the sender adds an ACL entry so
 * that this recipient can read it. Every delivery also emits an "app said" Lens note, because
 * the point the Lens makes is that these exchanges do not touch Alex's pod.
 */

import {
  buildDeliveredDocument,
  buildInboxMessage,
  InboxMessage,
  type MessageKindIri,
} from "@mortgage/data-model";
import type { OrgSlug, PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { aclDataset, aclTurtle } from "./acl.js";
import { LOAN } from "./facts.js";
import { membersOf } from "./grants.js";
import {
  at,
  documentUrl,
  PodRequestError,
  podUrl,
  postResource,
  put,
  readDataset,
  toTurtle,
  type World,
  webid,
} from "./world.js";

export interface Delivery {
  readonly from: Exclude<PodOwner, "alex">;
  readonly to: Exclude<PodOwner, "alex">;
  readonly kind: MessageKindIri;
  /** One sentence: what is being delivered. Shown in the recipient's inbox and in the Lens. */
  readonly summary: string;
  /** The resources the message is about. */
  readonly objects?: readonly string[];
  readonly time: string;
  readonly inReplyTo?: string;
}

/** Append a delivery to the recipient's inbox. Returns the message URL the server assigned. */
export async function deliver(world: World, delivery: Delivery): Promise<string> {
  const slug = delivery.kind.slice(delivery.kind.lastIndexOf("-") + 1).toLowerCase();
  const url = await postResource(
    world.fetchAs(delivery.from),
    podUrl(world, delivery.to, "inbox/"),
    slug,
    (iri) =>
      buildInboxMessage({
        actor: webid(world, delivery.from),
        iri,
        loanNumber: LOAN.loanNumber,
        messageKind: delivery.kind,
        published: at(world, delivery.time),
        summary: delivery.summary,
        ...(delivery.inReplyTo === undefined ? {} : { inReplyTo: delivery.inReplyTo }),
        ...(delivery.objects === undefined ? {} : { objects: delivery.objects }),
      }),
  );
  world.note({
    kind: "org-to-org",
    org: delivery.from as OrgSlug,
    refs: [url, ...(delivery.objects ?? [])],
    text: delivery.summary,
  });
  return url;
}

/** The recipient reads a message from its own inbox. */
export async function readMessage(
  world: World,
  owner: PodOwner,
  url: string,
): Promise<InboxMessage> {
  return new InboxMessage(url, await readDataset(world.fetchAs(owner), url), DataFactory);
}

/**
 * An organisation lets other organisations read something in its own pod: a resource, or a
 * container and what is in it. The document names every reader, so call it with the full list.
 */
export async function shareInOwnPod(
  world: World,
  owner: Exclude<PodOwner, "alex">,
  path: string,
  readers: readonly PodOwner[],
): Promise<void> {
  const target = podUrl(world, owner, path);
  const dataset = aclDataset(
    webid(world, owner),
    target,
    readers.map((reader) => ({ agent: webid(world, reader), inheritable: true, modes: ["Read"] })),
  );
  await put(world.fetchAs(owner), `${target}.acl`, await aclTurtle(dataset), "text/turtle");
}

// --- Answering a message once --------------------------------------------------------------------
//
// The journey calls an organisation's agent in line, so the tour is deterministic, while in the
// browser the agent runner also wakes the same agent from the inbox write. Either may run first,
// and both may run at once. Each agent therefore claims a message before it does anything: it
// creates a record in its own `handled/` drawer with `If-None-Match: *`. The pod server handles
// requests one at a time, so exactly one claim succeeds; the other caller gets 412 and stops.

/** The record in `owner`'s own pod that says it has taken `messageUrl` in hand. */
export function handledUrl(world: World, owner: PodOwner, messageUrl: string): string {
  const name = new URL(messageUrl).pathname.split("/").filter(Boolean).at(-1) ?? "message";
  return podUrl(world, owner, `handled/${name}`);
}

/**
 * Claim a message for answering. Returns `true` to the one caller that may answer it, `false` to
 * every later caller (the message is already being answered or has been).
 */
export async function claimMessage(
  world: World,
  owner: Exclude<PodOwner, "alex">,
  messageUrl: string,
  time: string,
): Promise<boolean> {
  const record = buildDeliveredDocument({
    about: messageUrl,
    creator: webid(world, owner),
    description:
      "Taken in hand by this organisation's back office. Kept so that a message is answered once, whoever picks it up first.",
    issued: at(world, time),
    iri: handledUrl(world, owner, messageUrl),
    loanNumber: LOAN.loanNumber,
    name: "Inbox message taken in hand",
  });
  const url = documentUrl(record.value);
  const response = await world.fetchAs(owner)(url, {
    body: await toTurtle(record),
    headers: { "content-type": "text/turtle", "if-none-match": "*" },
    method: "PUT",
  });
  if (response.status === 412) return false;
  if (!response.ok) throw new PodRequestError("PUT", url, response.status);
  return true;
}

/**
 * Give a claim back: the claimant failed before it answered, so the next caller may try. A claim
 * that is already gone is fine.
 */
export async function releaseClaim(
  world: World,
  owner: Exclude<PodOwner, "alex">,
  messageUrl: string,
): Promise<void> {
  const url = handledUrl(world, owner, messageUrl);
  const response = await world.fetchAs(owner)(url, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new PodRequestError("DELETE", url, response.status);
  }
}

/**
 * Answer a message at most once. Claims it; returns `undefined` when another caller holds the
 * claim. When `work` throws, the claim is given back before the error propagates, so a failed
 * answer does not leave the message stuck as "taken in hand".
 */
export async function answerOnce<T>(
  world: World,
  owner: Exclude<PodOwner, "alex">,
  messageUrl: string,
  time: string,
  work: () => Promise<T>,
): Promise<T | undefined> {
  if (!(await claimMessage(world, owner, messageUrl, time))) return undefined;
  try {
    return await work();
  } catch (error) {
    // Best effort: the original failure is what the caller needs to see.
    await releaseClaim(world, owner, messageUrl).catch(() => undefined);
    throw error;
  }
}

export interface AwaitOptions {
  /** Give up after this long. Default 20 s. */
  readonly timeoutMs?: number;
  /** How often to look again. Default 250 ms. */
  readonly intervalMs?: number;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The first member of a container that `read` accepts; members that fail to parse are skipped. */
export async function findMember<T>(
  fetcher: typeof fetch,
  container: string,
  read: (url: string) => Promise<T | undefined>,
): Promise<T | undefined> {
  for (const member of await membersOf(fetcher, container)) {
    // Proof presentations are JSON, not RDF: a member that does not parse is not a candidate.
    const found = await read(member).catch(() => undefined);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** The reply to `messageUrl` in `owner`'s inbox, if one has landed. */
export function findReply(
  world: World,
  owner: PodOwner,
  messageUrl: string,
): Promise<string | undefined> {
  return findMember(world.fetchAs(owner), podUrl(world, owner, "inbox/"), async (url) =>
    (await readMessage(world, owner, url)).inReplyToIri === messageUrl ? url : undefined,
  );
}

/**
 * Wait until `owner`'s inbox holds the reply to `messageUrl` and return the reply's URL. Used by a
 * journey step when the agent it called found the message already claimed: the other caller is
 * answering it, and the reply lands where it always does.
 */
export async function awaitReply(
  world: World,
  owner: PodOwner,
  messageUrl: string,
  options: AwaitOptions = {},
): Promise<string> {
  const until = Date.now() + (options.timeoutMs ?? 20_000);
  for (;;) {
    const reply = await findReply(world, owner, messageUrl);
    if (reply !== undefined) return reply;
    if (Date.now() >= until) {
      throw new Error(`no reply to ${messageUrl} reached ${podUrl(world, owner, "inbox/")}`);
    }
    await pause(options.intervalMs ?? 250);
  }
}

/** Who answers a message, and how a waiting caller sees that it has been answered. */
export interface Answering<T> {
  /** The organisation whose `handled/` record claims the message. */
  readonly claimant: Exclude<PodOwner, "alex">;
  readonly messageUrl: string;
  /** Runs the claimant's agent; `undefined` when another caller holds the claim. */
  readonly answer: () => Promise<T | undefined>;
  /** Looks once for the other caller's result; `undefined` while it has not landed. */
  readonly look: () => Promise<T | undefined>;
}

/**
 * Answer a message, or wait for whoever holds its claim. While waiting, a claim that disappears
 * means the other caller failed and gave it back (see `answerOnce`): the agent then runs once
 * more here, so one crashed answer does not stall the step until the timeout.
 */
export async function answerOrAwait<T>(
  world: World,
  answering: Answering<T>,
  options: AwaitOptions = {},
): Promise<T> {
  const mine = await answering.answer();
  if (mine !== undefined) return mine;
  const claimant = world.fetchAs(answering.claimant);
  const claim = handledUrl(world, answering.claimant, answering.messageUrl);
  const until = Date.now() + (options.timeoutMs ?? 20_000);
  let retried = false;
  for (;;) {
    const found = await answering.look();
    if (found !== undefined) return found;
    if (!retried && (await claimant(claim, { method: "HEAD" })).status === 404) {
      retried = true;
      const again = await answering.answer();
      if (again !== undefined) return again;
    }
    if (Date.now() >= until) {
      throw new Error(`${answering.messageUrl} was not answered by ${answering.claimant}`);
    }
    await pause(options.intervalMs ?? 250);
  }
}

/** `answerOrAwait` for an agent whose answer is a reply in `recipient`'s inbox. */
export function answerOrAwaitReply(
  world: World,
  recipient: PodOwner,
  claimant: Exclude<PodOwner, "alex">,
  messageUrl: string,
  answer: () => Promise<string | undefined>,
  options: AwaitOptions = {},
): Promise<string> {
  return answerOrAwait(
    world,
    { answer, claimant, look: () => findReply(world, recipient, messageUrl), messageUrl },
    options,
  );
}
