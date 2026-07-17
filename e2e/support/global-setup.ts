/**
 * sm-65 + sm-36 — Playwright GLOBAL SETUP: one pre-seeded borrower pod per
 * e2e run (SPEC §7 "Cross-app e2e: global-setup-owned lifecycle"). Boots a
 * sparq dev-server account, seeds the full scripted-persona mortgage layout
 * (strict `create` mode — a doubly seeded pod is a harness bug) and exports
 * the pod's coordinates to the suites via environment variables:
 *
 * - `MORTGAGE_E2E_POD_ORIGIN` — the seeded pod's origin;
 * - `MORTGAGE_E2E_POD_WEBID`  — the borrower WebID (a run-long dev-OIDC
 *   identity — see below);
 * - `MORTGAGE_E2E_SEEDED_AT`  — the seed instant (ISO), so suites can reason
 *   about the backdated employment window without re-reading the clock.
 *
 * sm-36 additions — the cross-app journey needs the seeded state to be
 * DRIVEABLE through the apps' real decision-0015 auth boundaries:
 *
 * - The borrower identity is a run-long dev Solid-OIDC issuer (started here,
 *   stopped by the returned teardown) with a `client_credentials` client, so
 *   worker processes can mint REAL DPoP-bound tokens over HTTP
 *   (`e2e/support/borrower-auth.ts`). Every seeded credential's
 *   `credentialSubject` is that WebID (decision-0015 L3), and the pod's
 *   profile card carries the backward `pim:storage` acknowledgment (L2):
 *   - `MORTGAGE_E2E_BORROWER_OIDC_ISSUER` / `_CLIENT_ID` / `_CLIENT_SECRET`.
 * - The per-role seed-issuer identities (IRI, verification method, status
 *   list URL, private JWK) are exported as `MORTGAGE_E2E_SEED_ISSUERS`
 *   (JSON), so the journey can configure the verifications app AS the seeded
 *   issuers — the scene-4 one-click re-issue re-signs the SEEDED employment
 *   VC, which only the signing issuer identity can do. Keys are per-run
 *   ephemeral and live only in this process environment.
 *
 * The server and issuer live in the runner process for the whole run; the
 * returned teardown stops them. Suites that need write isolation keep booting
 * their own per-suite pods exactly as before — this pod is the sm-36
 * journey's borrower vault (ONE writer suite; other suites must not touch it).
 */

import { randomUUID } from "node:crypto";
import { seedMortgagePod } from "@mortgage/solid-kit/mortgage-seed";
import {
  profileCardFixture,
  seedPod,
  startDevOidcIssuer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { createMortgageIssuance, nativeBridgeFromEnv } from "./mortgage-issuance";

/** The run-long borrower confidential client (secret minted fresh per run). */
export const BORROWER_CLIENT_ID = "mortgage-e2e-borrower";

export default async function globalSetup(): Promise<() => Promise<void>> {
  const clientSecret = randomUUID();
  // Forward pim:storage claim (decision 0015 L2) lives on the issuer-served
  // WebID document; the client_credentials grant lets WORKER processes act
  // as this identity over HTTP (the issuer's key never leaves this process).
  // The pod URL is not known yet — the dev issuer reads `options.storage`
  // PER REQUEST, so the claim is filled in right after the pod binds (the
  // issuer ↔ pod bootstrap is circular: the pod's fixed-owner identity must
  // BE this WebID for the seeded owner-only ACLs to authorize its requests).
  const issuerOptions: Parameters<typeof startDevOidcIssuer>[0] = {
    clientCredentials: { clientId: BORROWER_CLIENT_ID, clientSecret },
  };
  const borrowerIssuer = await startDevOidcIssuer(issuerOptions);
  const server = await startSolidServer({ ownerWebid: borrowerIssuer.webid }).catch(
    async (error) => {
      await borrowerIssuer.stop();
      throw error;
    },
  );
  try {
    const account = server.accounts[0];
    if (account === undefined) throw new Error("solid server booted with no primary account");
    const podBase = `${account.baseUrl}/`;
    issuerOptions.storage = podBase;
    const now = new Date();
    const issuance = createMortgageIssuance({
      podOrigin: account.baseUrl,
      now,
      ...(nativeBridgeFromEnv() ?? {}),
    });
    const seeded = await seedMortgagePod({
      target: {
        webid: borrowerIssuer.webid,
        baseUrl: account.baseUrl,
        authFetch: account.authFetch,
      },
      issuance,
      now,
      mode: "create",
    });
    // Backward acknowledgment (decision 0015 L2.3): the pod's owner-controlled
    // profile card names the borrower WebID and its storage. The WebID lives at
    // the dev issuer, so the mortgage layout cannot seed this card itself.
    await seedPod(
      account.baseUrl,
      [
        profileCardFixture({
          webid: borrowerIssuer.webid,
          name: seeded.persona.displayName,
          storage: podBase,
        }),
      ],
      { fetch: account.authFetch, ownerWebid: account.webid },
    );
    process.env.MORTGAGE_E2E_POD_ORIGIN = new URL(seeded.baseUrl).origin;
    process.env.MORTGAGE_E2E_POD_WEBID = seeded.webid;
    process.env.MORTGAGE_E2E_SEEDED_AT = now.toISOString();
    process.env.MORTGAGE_E2E_BORROWER_OIDC_ISSUER = borrowerIssuer.issuer;
    process.env.MORTGAGE_E2E_BORROWER_CLIENT_ID = BORROWER_CLIENT_ID;
    process.env.MORTGAGE_E2E_BORROWER_CLIENT_SECRET = clientSecret;
    process.env.MORTGAGE_E2E_SEED_ISSUERS = JSON.stringify(await issuance.exportSeedIssuers());
  } catch (error) {
    await borrowerIssuer.stop();
    await server.stop();
    throw error;
  }
  return async () => {
    await borrowerIssuer.stop();
    await server.stop();
  };
}
