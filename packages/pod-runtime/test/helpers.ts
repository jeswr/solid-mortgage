// AUTHORED-BY Claude Opus 5.5
/** Shared fixtures: a Node pod host over the REAL wasm, and RDF builders (n3.Writer, never strings). */
import type { LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { createNodePodHost, type PodHost, type PodHostOptions } from "../src/node.js";
import { toTurtle } from "../src/rdf.js";

export const ORIGIN = "https://pods.example";
export const OWNERS: PodOwner[] = ["alex", "bank", "bureau", "payroll"];
export const webid = (owner: PodOwner) => `${ORIGIN}/pods/${owner}/profile/card#me`;
export const url = (owner: PodOwner, path: string) =>
  `${ORIGIN}/pods/${owner}/${path.replace(/^\//, "")}`;

export function makeHost(options: Partial<PodHostOptions> = {}): PodHost {
  return createNodePodHost({ origin: ORIGIN, owners: OWNERS, ...options });
}

/** A small Turtle document: `<url> a <type>` (n3.Writer). */
export function doc(subject: string, type = "https://schema.org/Thing"): Promise<string> {
  return toTurtle([
    DataFactory.quad(
      DataFactory.namedNode(subject),
      DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DataFactory.namedNode(type),
    ),
  ]);
}

export async function put(
  f: typeof fetch,
  target: string,
  body: string,
  contentType = "text/turtle",
) {
  return f(target, { body, headers: { "content-type": contentType }, method: "PUT" });
}

/** Collect pod events emitted by a host. */
export function recorder(host: PodHost): {
  events: PodEvent[];
  all: LensEntry[];
  stop: () => void;
} {
  const events: PodEvent[] = [];
  const all: LensEntry[] = [];
  const stop = host.subscribe((m) => {
    if (m.type !== "event") return;
    all.push(m.entry);
    if (m.entry.source === "pod") events.push(m.entry);
  });
  return { all, events, stop };
}
