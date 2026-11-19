// AUTHORED-BY Claude Opus 5.5
/**
 * The 0.1.8 wasm implements no Solid Notifications Protocol: no storage description to discover a
 * subscription service from, no `.well-known/solid`, no `Updates-Via` on responses (the name
 * appears only in the CORS expose list), and no channel endpoints. This is why change
 * notification is a runtime service (`src/host/services.ts`) labelled as such in the Lens. If an
 * upgrade adds it, this test fails: switch the runtime over to the server's own channels.
 */
import { beforeAll, describe, expect, test } from "vitest";
import { BASE, doc, header, initWasm, newPod, OWNER, req, TURTLE } from "./helpers.js";

beforeAll(initWasm);

describe("Solid Notifications in the 0.1.8 wasm", () => {
  test("nothing advertises or serves a notification channel", async () => {
    const pod = newPod();
    expect(
      (await req(pod, "PUT", "/a/x", { as: OWNER, body: doc(`${BASE}a/x`), headers: TURTLE }))
        .status,
    ).toBe(201);
    for (const path of ["/", "/a/x"]) {
      const res = await req(pod, "GET", path, { as: OWNER });
      expect(res.status).toBe(200);
      expect(header(res, "updates-via")).toBeUndefined();
      expect(header(res, "link") ?? "").not.toMatch(/storageDescription|notification/i);
    }
    for (const path of [
      "/.well-known/solid",
      "/.notifications/",
      "/.notifications/WebSocketChannel2023/",
      "/.notifications/WebhookChannel2023/",
    ]) {
      expect((await req(pod, "GET", path, { as: OWNER })).status, path).toBe(404);
    }
    expect(
      (
        await req(pod, "POST", "/.notifications/WebhookChannel2023/", {
          as: OWNER,
          body: JSON.stringify({ topic: `${BASE}a/x` }),
          headers: { "content-type": "application/ld+json" },
        })
      ).status,
    ).toBe(404);
  });
});
