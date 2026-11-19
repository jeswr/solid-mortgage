// AUTHORED-BY Claude Opus 5.5
/**
 * Records, from the REAL host and wasm, the entries the Lens tests for change notification,
 * one-time grants, provenance history and the examiner view read
 * (`packages/lens/test/fixtures/runtime-services.json`), and fails when the host's output drifts
 * from it. So the Lens is tested on what the runtime emits, not on hand-written entries.
 * Regenerate with `UPDATE_LENS_FIXTURE=1 pnpm vitest run test/host/lens-fixture.test.ts`, then
 * `biome check --write` the fixture (the comparison is on the parsed JSON, not the text).
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { expect, test } from "vitest";
import { grantAccess, revokeAccess } from "../../src/acl.js";
import { makeGrantOneTime, watchResource } from "../../src/agents/index.js";
import type { Seed } from "../../src/node.js";
import { doc, makeHost, put, url, webid } from "../helpers.js";

const FIXTURE = new URL("../../../lens/test/fixtures/runtime-services.json", import.meta.url);
const ADDRESS = url("alex", "/profile/address");
const BADGE = url("alex", "/certificates/badge");

const seed: Seed = async (ctx) => [
  {
    body: await doc(ctx.podUrl("alex", "profile/address")),
    contentType: "text/turtle",
    method: "PUT",
    path: "/profile/address",
    pod: "alex",
  },
  {
    body: await doc(ctx.podUrl("alex", "certificates/badge")),
    contentType: "text/turtle",
    method: "PUT",
    path: "/certificates/badge",
    pod: "alex",
  },
];

test("the runtime-services Lens fixture is what the real host emits", async () => {
  let minute = 0;
  const clock = () => new Date(Date.UTC(2026, 7, 31, 9, minute++)).toISOString();
  const host = makeHost({ clock, identities: { wallet: "alex" }, seed });
  await host.ready;
  const tour = (step: string) => ({ tour: { demo: "trail", step } });
  const alex = (step: string) => host.fetchAs("alex", tour(step));
  const grant = async (agent: "bank" | "payroll", resource: string, step: string) =>
    expect(
      (
        await grantAccess({
          fetch: alex(step),
          grant: { agent: webid(agent), modes: ["Read"] },
          owner: webid("alex"),
          podRoot: url("alex", "/"),
          resourceUrl: resource,
        })
      ).ok,
    ).toBe(true);

  // Two organisations get standing read access to one resource and subscribe to it.
  await grant("bank", ADDRESS, "share");
  await grant("payroll", ADDRESS, "share");
  await watchResource(host.fetchAs("bank"), ADDRESS);
  await watchResource(host.fetchAs("payroll"), ADDRESS);
  // A change: both are told, both read it.
  expect(
    (await put(alex("change"), ADDRESS, await doc(ADDRESS, "https://schema.org/Place"))).status,
  ).toBe(204);
  expect((await host.fetchAs("bank", tour("change"))(ADDRESS)).status).toBe(200);
  expect((await host.fetchAs("payroll", tour("change"))(ADDRESS)).status).toBe(200);
  // The holder withdraws the bank; the next change still tells it, and its read is refused.
  expect(
    (
      await revokeAccess({
        agent: webid("bank"),
        fetch: alex("withdraw"),
        owner: webid("alex"),
        podRoot: url("alex", "/"),
        resourceUrl: ADDRESS,
      })
    ).ok,
  ).toBe(true);
  expect((await put(alex("correct"), ADDRESS, await doc(ADDRESS))).status).toBe(204);
  expect((await host.fetchAs("bank", tour("correct"))(ADDRESS)).status).toBe(403);
  expect((await host.fetchAs("payroll", tour("correct"))(ADDRESS)).status).toBe(200);
  // A one-time grant: one read, then refused.
  await grant("bank", BADGE, "once");
  await makeGrantOneTime(host.fetchAs("alex"), { agent: webid("bank"), resource: BADGE });
  expect((await host.fetchAs("bank", tour("once"))(BADGE)).status).toBe(200);
  expect((await host.fetchAs("bank", tour("once"))(BADGE)).status).toBe(403);

  const entries: LensEntry[] = await host.events();
  const text = `${JSON.stringify(entries, null, 2)}\n`;
  if (process.env.UPDATE_LENS_FIXTURE === "1") writeFileSync(FIXTURE, text);
  expect(JSON.parse(readFileSync(FIXTURE, "utf8"))).toEqual(entries);
});
