// AUTHORED-BY Claude Opus 5.5
/**
 * Records, from the REAL host and wasm, the entries the Lens's holder tests read
 * (`packages/lens/test/fixtures/holders.json`): Maya, a holder other than Alex, shares a
 * credential with Alder Bank, the bank reads it, Alex opens his own profile, Maya withdraws the
 * bank and its next read is refused. Fails when the host's output drifts from the fixture.
 * Regenerate with `UPDATE_LENS_FIXTURE=1 pnpm vitest run test/host/holders-lens-fixture.test.ts`,
 * then `biome check --write` the fixture.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { HOLDER_IDS } from "@mortgage/demo-kit/registry";
import { expect, test } from "vitest";
import { grantAccess, revokeAccess } from "../../src/acl.js";
import { doc, makeHost, put, url, webid } from "../helpers.js";

const FIXTURE = new URL("../../../lens/test/fixtures/holders.json", import.meta.url);
const INCOME = url("maya", "/credentials/income");

test("the holders Lens fixture is what the real host emits", async () => {
  let minute = 0;
  const clock = () => new Date(Date.UTC(2026, 8, 1, 10, minute++)).toISOString();
  const host = makeHost({
    clock,
    identities: { wallet: "alex" },
    owners: [...HOLDER_IDS, "bank", "bureau", "payroll"],
  });
  await host.ready;
  const tour = (step: string) => ({ tour: { demo: "lending", step } });
  const maya = (step: string) => host.fetchAs("maya", tour(step));
  const scope = {
    owner: webid("maya"),
    podRoot: url("maya", "/"),
    resourceUrl: url("maya", "/credentials/"),
  };

  expect((await put(maya("deliver"), INCOME, await doc(INCOME))).status).toBe(201);
  expect(
    (
      await grantAccess({
        ...scope,
        fetch: maya("share"),
        grant: { agent: webid("bank"), modes: ["Read"] },
      })
    ).ok,
  ).toBe(true);
  expect((await host.fetchAs("bank", tour("share"))(INCOME)).status).toBe(200);
  expect((await host.fetchAs("alex", tour("share"))(url("alex", "/profile/card"))).status).toBe(
    200,
  );
  expect((await revokeAccess({ ...scope, agent: webid("bank"), fetch: maya("withdraw") })).ok).toBe(
    true,
  );
  expect((await host.fetchAs("bank", tour("withdraw"))(INCOME)).status).toBe(403);

  const entries: LensEntry[] = await host.events();
  const text = `${JSON.stringify(entries, null, 2)}\n`;
  if (process.env.UPDATE_LENS_FIXTURE === "1") writeFileSync(FIXTURE, text);
  expect(JSON.parse(readFileSync(FIXTURE, "utf8"))).toEqual(entries);
});
