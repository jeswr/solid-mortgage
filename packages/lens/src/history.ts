// AUTHORED-BY Claude Opus 5.5
/**
 * Provenance history of a resource: who wrote each version, from the writes the pod server
 * accepted in this session (pod saw). Nothing comes from the resource's own content, so a writer
 * cannot misstate it. Seeded resources start with the first write after the seed.
 */
import { isDenied, isOk, isPod, type LensModel } from "./model.js";
import { isAclPath, nodeOf, podRelative } from "./paths.js";

export interface ResourceVersion {
  /** The Lens entry id of the write. */
  id: number;
  /** Arrival order in the Lens. */
  seq: number;
  /** Demo-calendar ISO time of the write. */
  at: string;
  /** Map node of the writer (an organisation's pod owner, or the holder). */
  writer: string;
  writerName: string;
  /** True when an organisation's back-office agent made the write. */
  viaAgent: boolean;
  method: string;
  status: number;
  change: "created" | "changed" | "deleted";
  /** The policy IRI the pod reported as allowing it, when one did. */
  grant?: string;
  step?: string;
}

/** Every accepted write and delete of `path` in `pod`'s pod, oldest first. */
export function resourceHistory(model: LensModel, pod: string, path: string): ResourceVersion[] {
  const rel = podRelative(path);
  if (isAclPath(rel)) return [];
  const out: ResourceVersion[] = [];
  for (const rec of model.received) {
    const e = rec.entry;
    if (!isPod(e) || e.pod !== pod || podRelative(e.path) !== rel) continue;
    if (isDenied(e) || !isOk(e.status) || (e.kind !== "write" && e.kind !== "delete")) continue;
    const writer = nodeOf(model.registry, e.actor.org);
    out.push({
      at: e.at,
      change:
        e.kind === "delete"
          ? "deleted"
          : e.method === "POST" || e.status === 201
            ? "created"
            : "changed",
      id: e.id,
      method: e.method,
      seq: rec.seq,
      status: e.status,
      viaAgent: e.actor.viaAgent,
      writer,
      writerName: model.nameOf(writer),
      ...(e.grant === undefined ? {} : { grant: e.grant }),
      ...(rec.step === undefined ? {} : { step: rec.step }),
    });
  }
  return out;
}
