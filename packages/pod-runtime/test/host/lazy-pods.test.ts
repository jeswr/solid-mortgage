// AUTHORED-BY Claude Opus 5.5
/**
 * Pods are made when first needed. A cold start does work for the pods the seed writes and for
 * no other, however many owners the registry lists, and a pod made later behaves exactly as one
 * made at start: its baseline (owner-only root, public profile), WAC, persistence across a
 * restart, and "Restart the demo".
 */
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { describe, expect, test } from "vitest";
import { aclDocument } from "../../src/acl.js";
import { memoryStorage, type PodStorage, type Seed } from "../../src/node.js";
import { doc, makeHost, ORIGIN, put } from "../helpers.js";

/** Thirty owners: the four the other tests use, then padding. */
const MANY = [
  "alex",
  "bank",
  "bureau",
  "payroll",
  ...Array.from({ length: 26 }, (_, index) => `extra-${String(index + 1).padStart(2, "0")}`),
] as PodOwner[];
const LAST = MANY.at(-1) as PodOwner;
const at = (owner: PodOwner, path: string) => `${ORIGIN}/pods/${owner}/${path}`;

const seed: Seed = async (ctx) => [
  {
    body: await doc(ctx.podUrl("bank", "statements/1")),
    contentType: "text/turtle",
    method: "PUT",
    path: "/statements/1",
    pod: "bank",
  },
];

/** Storage that counts snapshot writes, and the module loads behind the host. */
function counting(storage: PodStorage = memoryStorage()) {
  const writes: string[] = [];
  const counted: PodStorage = {
    ...storage,
    putSnapshot: async (owner, kind, bytes) => {
      writes.push(`${kind}:${owner}`);
      return storage.putSnapshot(owner, kind, bytes);
    },
  };
  return { storage: counted, writes };
}

describe("lazy pods", () => {
  test("a cold start with thirty owners saves only the pod the seed wrote", async () => {
    const { storage, writes } = counting();
    const host = makeHost({ owners: MANY, storage });
    await host.ready;
    // Not seeded yet: a later start makes the pods afresh, so nothing is saved.
    expect(writes).toEqual([]);
    expect(await host.applySeed(seed)).toBe(true);
    expect(writes.sort()).toEqual(["current:bank", "seed:bank"]);
    const info = await host.info();
    expect(info.owners).toEqual(MANY);
    expect(info.seeded).toBe(true);
  });

  test("a pod made later has its baseline: owner-only root, public profile, real WAC", async () => {
    const host = makeHost({ owners: MANY, seed });
    await host.ready;
    const card = await host.fetchAs(null)(at(LAST, "profile/card"));
    expect(card.status).toBe(200);
    expect(await card.text()).toContain(`/pods/${LAST}/`);
    expect((await host.fetchAs(null)(at(LAST, ""))).status).toBe(401);
    expect((await host.fetchAs("bank")(at(LAST, ""))).status).toBe(403);
    expect((await host.fetchAs(LAST)(at(LAST, ""))).status).toBe(200);
    // An owner the registry does not list still has no pod.
    expect((await host.fetchAs(null)(at("nobody" as PodOwner, "profile/card"))).status).toBe(404);
    // A grant in a pod made later is checked by the wasm like any other.
    const target = at(LAST, "shared/note");
    expect((await put(host.fetchAs(LAST), target, await doc(target))).status).toBe(201);
    expect((await host.fetchAs("bank")(target)).status).toBe(403);
    const acl = await aclDocument({
      aclUrl: `${target}.acl`,
      grants: [{ agent: `${ORIGIN}/pods/bank/profile/card#me`, modes: ["Read"] }],
      owner: `${ORIGIN}/pods/${LAST}/profile/card#me`,
    });
    expect((await put(host.fetchAs(LAST), `${target}.acl`, acl)).status).toBeLessThan(300);
    expect((await host.fetchAs("bank")(target)).status).toBe(200);
  });

  test("a write to a pod made later survives a restart, and reset returns it to its baseline", async () => {
    const storage = memoryStorage();
    const first = makeHost({ owners: MANY, seed, storage });
    await first.ready;
    const note = at(LAST, "notes/a");
    expect((await put(first.fetchAs(LAST), note, await doc(note))).status).toBe(201);

    const second = makeHost({ owners: MANY, storage });
    await second.ready;
    expect((await second.fetchAs(LAST)(note)).status).toBe(200);
    expect((await second.fetchAs("bank")(at("bank", "statements/1"))).status).toBe(200);
    expect((await second.info()).restoreIssues).toEqual([]);

    await second.reset();
    expect((await second.fetchAs(LAST)(note)).status).toBe(404);
    expect((await second.fetchAs(null)(at(LAST, "profile/card"))).status).toBe(200);
    expect((await second.fetchAs("bank")(at("bank", "statements/1"))).status).toBe(200);
    // The reset is saved: a third start sees the seed state, not the note.
    const third = makeHost({ owners: MANY, storage });
    await third.ready;
    expect((await third.fetchAs(LAST)(note)).status).toBe(404);
  });

  test("a snapshot saved before the seed does not outlive it", async () => {
    const storage = memoryStorage();
    const unseeded = makeHost({ owners: MANY, storage });
    await unseeded.ready;
    const early = at(LAST, "early/x");
    expect((await put(unseeded.fetchAs(LAST), early, await doc(early))).status).toBe(201);
    // The seed starts every pod afresh, as it always has; the early write is gone for good.
    const later = makeHost({ owners: MANY, storage });
    await later.ready;
    expect(await later.applySeed(seed)).toBe(true);
    expect((await later.fetchAs(LAST)(early)).status).toBe(404);
    const restarted = makeHost({ owners: MANY, storage });
    await restarted.ready;
    expect((await restarted.fetchAs(LAST)(early)).status).toBe(404);
    expect((await restarted.fetchAs(null)(at(LAST, "profile/card"))).status).toBe(200);
  });

  test("a restart restores only the pods with something saved", async () => {
    const { storage, writes } = counting();
    const first = makeHost({ owners: MANY, seed, storage });
    await first.ready;
    writes.length = 0;
    const reads: string[] = [];
    const watched: PodStorage = {
      ...storage,
      getSnapshot: async (owner, kind) => {
        const bytes = await storage.getSnapshot(owner, kind);
        if (bytes !== undefined) reads.push(`${kind}:${owner}`);
        return bytes;
      },
    };
    const second = makeHost({ owners: MANY, storage: watched });
    await second.ready;
    expect(reads).toEqual(["current:bank"]);
    expect(writes).toEqual([]);
  });
});
