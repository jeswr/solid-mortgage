// AUTHORED-BY Claude Opus 5.5
/**
 * A corrupt or incompatible snapshot never bricks the host: that pod falls back to its seed
 * snapshot, then to an empty baseline pod, the fallback is reported in `info()`, and the other
 * pods keep their state. `reset()` works whatever state the host is in.
 */
import { describe, expect, test } from "vitest";
import { memoryStorage, type PodStorage, type Seed } from "../../src/node.js";
import { doc, makeHost, put, url, webid } from "../helpers.js";

const seed: Seed = async (ctx) => [
  {
    body: await doc(ctx.podUrl("bank", "statements/1")),
    contentType: "text/turtle",
    method: "PUT",
    path: "/statements/1",
    pod: "bank",
  },
];

const GARBAGE = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 1, 2, 3, 4, 5, 6, 7, 8]);

/** A seeded storage where bank and alex each wrote something after the seed. */
async function used(): Promise<PodStorage> {
  const storage = memoryStorage();
  const host = makeHost({ seed, storage });
  await host.ready;
  expect((await put(host.fetchAs("bank"), url("bank", "/later/x"), await doc("x"))).status).toBe(201);
  expect((await put(host.fetchAs("alex"), url("alex", "/later/y"), await doc("y"))).status).toBe(201);
  return storage;
}

const status = async (host: ReturnType<typeof makeHost>, owner: "alex" | "bank", path: string) =>
  (await host.fetchAs(owner)(url(owner, path))).status;

describe("corrupt snapshots", () => {
  test("a garbage current snapshot falls back to the seed; other pods are untouched", async () => {
    const storage = await used();
    await storage.putSnapshot("bank", "current", GARBAGE);
    const host = makeHost({ storage });
    await host.ready;
    expect(await status(host, "bank", "/statements/1")).toBe(200);
    expect(await status(host, "bank", "/later/x")).toBe(404);
    expect(await status(host, "alex", "/later/y")).toBe(200);
    const info = await host.info();
    expect(info.restoreIssues).toEqual([
      expect.objectContaining({ fellBackTo: "seed", owner: "bank", snapshot: "current" }),
    ]);
    // The bad snapshot was replaced: the next start is clean.
    const again = makeHost({ storage });
    expect((await again.info()).restoreIssues).toEqual([]);
  });

  test("a truncated real snapshot is handled the same way", async () => {
    const storage = await used();
    const bytes = (await storage.getSnapshot("bank", "current")) as Uint8Array;
    await storage.putSnapshot("bank", "current", bytes.slice(0, Math.floor(bytes.length / 2)));
    const host = makeHost({ storage });
    await host.ready;
    expect(await status(host, "bank", "/statements/1")).toBe(200);
    expect(await status(host, "alex", "/later/y")).toBe(200);
    expect((await host.info()).restoreIssues).toHaveLength(1);
  });

  test("with the seed snapshot corrupt too, the pod starts empty (baseline) and still works", async () => {
    const storage = await used();
    await storage.putSnapshot("bank", "current", GARBAGE);
    await storage.putSnapshot("bank", "seed", GARBAGE);
    const host = makeHost({ storage });
    await host.ready;
    expect(await status(host, "bank", "/statements/1")).toBe(404);
    expect(await status(host, "bank", "/profile/card")).toBe(200);
    expect((await host.fetchAs(null)(url("bank", "/profile/card"))).status).toBe(200);
    expect(await status(host, "alex", "/later/y")).toBe(200);
    expect((await host.info()).restoreIssues).toEqual([
      expect.objectContaining({ fellBackTo: "seed", owner: "bank", snapshot: "current" }),
      expect.objectContaining({ fellBackTo: "baseline", owner: "bank", snapshot: "seed" }),
    ]);
    // Reset still works: bank's seed is unusable, so it resets to the baseline and says so.
    await host.reset();
    expect(await status(host, "alex", "/later/y")).toBe(404);
    expect(await status(host, "bank", "/profile/card")).toBe(200);
    expect((await host.info()).restoreIssues).toEqual([
      expect.objectContaining({ fellBackTo: "baseline", owner: "bank", snapshot: "seed" }),
    ]);
    expect(webid("bank")).toMatch(/bank/);
  });

  test("reset works even when the host failed to start", async () => {
    const storage = memoryStorage();
    let broken = true;
    const flaky: PodStorage = {
      ...storage,
      getMeta: async <T,>(key: string) => {
        if (broken) throw new Error("storage unavailable");
        return storage.getMeta<T>(key);
      },
    };
    const host = makeHost({ storage: flaky });
    await expect(host.ready).rejects.toThrow(/unavailable/);
    broken = false;
    await host.reset();
    expect(await status(host, "alex", "/profile/card")).toBe(200);
    expect((await put(host.fetchAs("alex"), url("alex", "/n/z"), await doc("z"))).status).toBe(201);
  });
});
