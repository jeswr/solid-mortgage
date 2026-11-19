// AUTHORED-BY Claude Opus 5.5
/** Snapshot/restore: 0.1.8 ships SolidServer.withSnapshot + snapshot(); a journal replay is optional. */
import { SolidServer } from "@sparq-org/solid-server/wasm";
import { beforeAll, describe, expect, test } from "vitest";
import {
  acl,
  BASE,
  doc,
  initWasm,
  newPod,
  OWNER,
  ownerRule,
  PARTNER,
  req,
  TURTLE,
} from "./helpers.js";

beforeAll(initWasm);

async function populate(pod: SolidServer) {
  await req(pod, "PUT", "/a/x", { headers: TURTLE, body: doc(`${BASE}a/x`), as: OWNER });
  await req(pod, "PUT", "/a/.acl", {
    headers: TURTLE,
    body: acl(`${BASE}a/.acl`, [
      ownerRule(`${BASE}a/`),
      { id: "l", accessTo: `${BASE}a/`, default: `${BASE}a/`, agents: [PARTNER], modes: ["Read"] },
    ]),
    as: OWNER,
  });
  await req(pod, "PUT", "/bin", {
    headers: { "content-type": "application/octet-stream" },
    body: new Uint8Array(1000).fill(7),
    as: OWNER,
  });
  await req(pod, "PUT", "/tmp", { headers: TURTLE, body: doc(`${BASE}tmp`), as: OWNER });
  await req(pod, "DELETE", "/tmp", { as: OWNER });
}

describe("snapshot API", () => {
  test("a pod made with `new SolidServer` is not persistent: snapshot() is undefined, revision 0", () => {
    const pod = newPod();
    expect(pod.snapshot()).toBeUndefined();
    expect(pod.snapshotRevision()).toBe(0);
  });

  test("withSnapshot(base, owner, empty) is a fresh persistent pod (revision 1 = the provisioned root .acl)", () => {
    const pod = SolidServer.withSnapshot(BASE, OWNER, new Uint8Array());
    expect(pod.snapshotRevision()).toBe(1);
    expect(pod.snapshot()?.byteLength).toBeGreaterThan(0);
  });

  test("revision counts successful mutations only (not reads, not denied writes)", async () => {
    const pod = SolidServer.withSnapshot(BASE, OWNER, new Uint8Array());
    const r0 = pod.snapshotRevision();
    await req(pod, "PUT", "/a/x", { headers: TURTLE, body: doc(`${BASE}a/x`), as: OWNER });
    const r1 = pod.snapshotRevision();
    expect(r1).toBeGreaterThan(r0);
    await req(pod, "GET", "/a/x", { as: OWNER });
    await req(pod, "PUT", "/a/y", { headers: TURTLE, body: doc(`${BASE}a/y`), as: PARTNER });
    expect(pod.snapshotRevision()).toBe(r1);
  });

  test("round trip restores documents, ACLs (enforced), binary bodies and deletions", async () => {
    const pod = SolidServer.withSnapshot(BASE, OWNER, new Uint8Array());
    await populate(pod);
    const bytes = pod.snapshot();
    expect(bytes).toBeInstanceOf(Uint8Array);
    const restored = SolidServer.withSnapshot(BASE, OWNER, bytes ?? new Uint8Array());
    expect((await req(restored, "GET", "/a/x", { as: PARTNER })).status).toBe(200);
    expect(
      (
        await req(restored, "PUT", "/a/y", {
          headers: TURTLE,
          body: doc(`${BASE}a/y`),
          as: PARTNER,
        })
      ).status,
    ).toBe(403);
    expect((await req(restored, "GET", "/tmp", { as: OWNER })).status).toBe(404);
    const bin = await req(restored, "GET", "/bin", { as: OWNER });
    expect(bin.bytes.byteLength).toBe(1000);
    expect(bin.bytes[0]).toBe(7);
    // The encoding is folded: restoring and re-snapshotting gives the same size.
    expect(restored.snapshot()?.byteLength).toBe(bytes?.byteLength);
  });

  test("the snapshot is keyed by absolute URL: restoring under a different base URL boots but finds nothing", async () => {
    const pod = SolidServer.withSnapshot(BASE, OWNER, new Uint8Array());
    await populate(pod);
    const other = SolidServer.withSnapshot(
      "https://other.example/pods/alex/",
      OWNER,
      pod.snapshot() ?? new Uint8Array(),
    );
    expect((await req(other, "GET", "/a/x", { as: OWNER })).status).toBe(404);
  });

  test("the owner ACL is not re-provisioned when the snapshot already has a root .acl (a new owner gets nothing)", async () => {
    const pod = SolidServer.withSnapshot(BASE, OWNER, new Uint8Array());
    await populate(pod);
    const restored = SolidServer.withSnapshot(BASE, PARTNER, pod.snapshot() ?? new Uint8Array());
    expect((await req(restored, "GET", "/a/", { as: OWNER })).status).toBe(200);
    expect(
      (await req(restored, "PUT", "/z", { headers: TURTLE, body: doc(`${BASE}z`), as: PARTNER }))
        .status,
    ).toBe(403);
  });

  test("corrupt or truncated snapshots throw synchronously (plain Error), never a partial pod", async () => {
    const pod = SolidServer.withSnapshot(BASE, OWNER, new Uint8Array());
    await populate(pod);
    const bytes = pod.snapshot() ?? new Uint8Array();
    expect(() => SolidServer.withSnapshot(BASE, OWNER, new Uint8Array([1, 2, 3, 4]))).toThrow(
      /not a sparq-lws journal/,
    );
    expect(() =>
      SolidServer.withSnapshot(BASE, OWNER, bytes.slice(0, bytes.byteLength - 5)),
    ).toThrow(/ends mid-record/);
  });

  test("a snapshot is a plain byte string with a 'LWSJ' magic, storable as-is in IndexedDB", async () => {
    const pod = SolidServer.withSnapshot(BASE, OWNER, new Uint8Array());
    const bytes = pod.snapshot() ?? new Uint8Array();
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("LWSJ");
    const copy = structuredClone(bytes);
    expect(() => SolidServer.withSnapshot(BASE, OWNER, copy)).not.toThrow();
  });
});
