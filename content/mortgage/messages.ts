// AUTHORED-BY Claude Fable 5.2
/**
 * Organisation-to-organisation deliveries and what organisations keep in their own stores.
 *
 * A delivery is an `as:Announce` appended to the recipient's `inbox/`. It carries pointers, not
 * payloads: the thing delivered stays in the sender's pod, and the sender adds an ACL entry so
 * that this recipient can read it. Every delivery also emits an "app said" Lens note, because
 * the point the Lens makes is that these exchanges do not touch Alex's pod.
 */

import { buildInboxMessage, InboxMessage, type MessageKindIri } from "@mortgage/data-model";
import type { OrgSlug, PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { aclDataset, aclTurtle } from "./acl.js";
import { LOAN } from "./facts.js";
import { at, podUrl, postResource, put, readDataset, type World, webid } from "./world.js";

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
