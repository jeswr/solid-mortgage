// AUTHORED-BY Claude Opus 5.5
/**
 * Organisation-to-organisation messages of the motor claim, and answering each one once. The
 * same mechanism as the mortgage's (`../mortgage/messages.ts`): an Activity Streams announcement
 * appended to the recipient's inbox, and a `handled/` record created with `If-None-Match: *` so
 * that exactly one of the in-line journey step and the agent woken by the inbox write answers it.
 * The records here carry the claim number, never the mortgage's loan number.
 */

import {
  buildDeliveredDocument,
  buildInboxMessage,
  InboxMessage,
  type MessageKindIri,
} from "@mortgage/data-model";
import type { OrgSlug, PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { handledUrl, releaseClaim } from "../mortgage/messages.js";
import {
  at,
  documentUrl,
  PodRequestError,
  podUrl,
  postResource,
  readDataset,
  toTurtle,
  type World,
  webid,
} from "../mortgage/world.js";
import { CLAIM_NUMBER } from "./facts.js";

export type MotorOrg = "insurer" | "repairer";

export interface MotorDelivery {
  readonly from: MotorOrg;
  readonly to: MotorOrg;
  readonly kind: MessageKindIri;
  readonly summary: string;
  readonly objects?: readonly string[];
  readonly time: string;
}

/** The inbox slug of a message kind: `mort:MessageKind-RepairReferral` → `repairreferral`. */
export const slugOfKind = (kind: string): string =>
  kind.slice(kind.lastIndexOf("-") + 1).toLowerCase();

/** Append a message to the other organisation's inbox. Returns its URL. */
export async function send(world: World, delivery: MotorDelivery): Promise<string> {
  const url = await postResource(
    world.fetchAs(delivery.from),
    podUrl(world, delivery.to, "inbox/"),
    slugOfKind(delivery.kind),
    (iri) =>
      buildInboxMessage({
        actor: webid(world, delivery.from),
        iri,
        messageKind: delivery.kind,
        published: at(world, delivery.time),
        summary: delivery.summary,
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
export async function readMotorMessage(
  world: World,
  owner: MotorOrg,
  url: string,
): Promise<InboxMessage> {
  return new InboxMessage(url, await readDataset(world.fetchAs(owner), url), DataFactory);
}

/** Is this inbox member a message of `kind` (by the slug the sender gave it)? */
export function isMessageOf(path: string, kind: string): boolean {
  const name = path.split("?")[0]?.split("/").filter(Boolean).at(-1) ?? "";
  return name.startsWith(slugOfKind(kind));
}

async function claim(world: World, owner: MotorOrg, messageUrl: string, time: string) {
  const record = buildDeliveredDocument({
    about: messageUrl,
    creator: webid(world, owner),
    description:
      "Taken in hand by this organisation's back office. Kept so that a message is answered once, whoever picks it up first.",
    issued: at(world, time),
    iri: handledUrl(world, owner as PodOwner, messageUrl),
    name: `Inbox message on claim ${CLAIM_NUMBER} taken in hand`,
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
 * Answer a message at most once: `undefined` when another caller holds it. A failed answer gives
 * the message back before the error propagates.
 */
export async function answerMotorOnce<T>(
  world: World,
  owner: MotorOrg,
  messageUrl: string,
  time: string,
  work: () => Promise<T>,
): Promise<T | undefined> {
  if (!(await claim(world, owner, messageUrl, time))) return undefined;
  try {
    return await work();
  } catch (error) {
    await releaseClaim(world, owner, messageUrl).catch(() => undefined);
    throw error;
  }
}
