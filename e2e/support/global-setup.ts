/**
 * sm-65 — Playwright GLOBAL SETUP: one pre-seeded borrower pod per e2e run
 * (SPEC §7 "Cross-app e2e: global-setup-owned lifecycle"). Boots a sparq
 * dev-server account, seeds the full scripted-persona mortgage layout
 * (strict `create` mode — a doubly seeded pod is a harness bug) and exports
 * the pod's coordinates to the suites via environment variables:
 *
 * - `MORTGAGE_E2E_POD_ORIGIN` — the seeded pod's origin;
 * - `MORTGAGE_E2E_POD_WEBID`  — the borrower WebID (fixed-owner mode);
 * - `MORTGAGE_E2E_SEEDED_AT`  — the seed instant (ISO), so suites can reason
 *   about the backdated employment window without re-reading the clock.
 *
 * The server lives in the runner process for the whole run; the returned
 * teardown stops it. Suites that need write isolation keep booting their own
 * per-suite pods exactly as before — this pod is the shared READ-ONLY
 * journey fixture (sm-36 consumes it).
 */

import { seedMortgagePod } from "@mortgage/solid-kit/mortgage-seed";
import { startSolidServer } from "@mortgage/solid-kit/testing";
import { createMortgageIssuance, nativeBridgeFromEnv } from "./mortgage-issuance";

export default async function globalSetup(): Promise<() => Promise<void>> {
  const server = await startSolidServer({});
  try {
    const account = server.accounts[0];
    if (account === undefined) throw new Error("solid server booted with no primary account");
    const now = new Date();
    const issuance = createMortgageIssuance({
      podOrigin: account.baseUrl,
      now,
      ...(nativeBridgeFromEnv() ?? {}),
    });
    const seeded = await seedMortgagePod({
      target: { webid: account.webid, baseUrl: account.baseUrl, authFetch: account.authFetch },
      issuance,
      now,
      mode: "create",
    });
    process.env.MORTGAGE_E2E_POD_ORIGIN = new URL(seeded.baseUrl).origin;
    process.env.MORTGAGE_E2E_POD_WEBID = seeded.webid;
    process.env.MORTGAGE_E2E_SEEDED_AT = now.toISOString();
  } catch (error) {
    await server.stop();
    throw error;
  }
  return async () => {
    await server.stop();
  };
}
