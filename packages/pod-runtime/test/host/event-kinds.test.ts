// AUTHORED-BY Claude Opus 5.5
/** The Lens never shows a write that did not happen: failed state changes are "denied" or absent. */
import { beforeEach, expect, test } from "vitest";
import type { PodHost } from "../../src/node.js";
import { doc, makeHost, put, recorder, url, webid } from "../helpers.js";

let host: PodHost;
beforeEach(async () => {
  host = makeHost();
  await host.ready;
});

test("refused state changes are 'denied'; other failed ones emit no event", async () => {
  const alex = host.fetchAs("alex");
  const target = url("alex", "/notes/a");
  await put(alex, target, await doc(target));
  const log = recorder(host);

  // 403: someone else's pod.
  expect((await put(host.fetchAs("bank"), target, await doc(target))).status).toBe(403);
  // 412: a stale precondition.
  const stale = await alex(target, {
    body: await doc(target),
    headers: { "content-type": "text/turtle", "if-match": '"nope"' },
    method: "PUT",
  });
  expect(stale.status).toBe(412);
  // 409: a container that still has members; 422: a PATCH the server cannot apply; 400: bad Turtle.
  expect((await alex(url("alex", "/notes/"), { method: "DELETE" })).status).toBe(409);
  const patch = await alex(target, {
    body: "not n3",
    headers: { "content-type": "text/n3" },
    method: "PATCH",
  });
  expect(patch.status).toBe(422);
  expect((await put(alex, url("alex", "/notes/d"), "<<< not turtle")).status).toBe(400);
  // 409 from the ACL policy, 400 from the guard.
  expect((await put(alex, url("alex", "/notes/.acl"), await doc(webid("alex")))).status).toBe(409);
  expect(
    (
      await put(
        alex,
        url("alex", "/notes/b"),
        `${"[".repeat(500)}${"]".repeat(500)}`,
        "application/ld+json",
      )
    ).status,
  ).toBe(400);

  expect(log.events.map((e) => [e.method, e.status, e.kind])).toEqual([["PUT", 403, "denied"]]);

  // A successful write and a read of something missing are still reported.
  await put(alex, url("alex", "/notes/c"), await doc(url("alex", "/notes/c")));
  await alex(url("alex", "/notes/none"));
  expect(log.events.slice(1).map((e) => [e.method, e.status, e.kind])).toEqual([
    ["PUT", 201, "write"],
    ["GET", 404, "read"],
  ]);
});
