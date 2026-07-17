# End-to-end tests

Cross-application Playwright journey tests live here. Each suite must boot its own in-memory
`@jeswr/solid-server` instance and must not assume a fixed port.

The scaffold test verifies that the root Playwright runner loads without downloading a browser.
Run the suite from the repository root with `pnpm run test:e2e`.

## The shared seeded pod (sm-65)

`support/global-setup.ts` (wired via `globalSetup` in `playwright.config.ts`) boots ONE
pre-seeded borrower pod per run — the sm-20 primary persona's documents plus five REAL
vc-kit-signed credentials (the employment VC backdated −30d/+14d for the scene-4 freshness
beat), both operand anchors carrying the CAPTURED genuine sparq encodings, and the
pod-hosted issuer documents + status lists the verifiers need. Suites read its coordinates
from `MORTGAGE_E2E_POD_ORIGIN` / `MORTGAGE_E2E_POD_WEBID` / `MORTGAGE_E2E_SEEDED_AT`.

The pod is the sm-36 journey's borrower vault — `journey.spec.ts` is its ONE writer suite
(it drives the five SPEC §2 scenes over it); every other suite treats it as read-only, and
suites that write still boot their own per-suite pods. Setting `SPARQ_CHECKOUT` additionally
seeds the borrower-only ZK witnesses through the REAL native dual-sign rail. The same layout
backs `pnpm run dev:pod` and the wallet's Mode-1 in-browser seed
(`@mortgage/solid-kit/mortgage-seed`).

For sm-36 the setup also exports (run-scoped, never committed): the run-long borrower
dev-OIDC issuer + `client_credentials` (`MORTGAGE_E2E_BORROWER_*`) so workers mint REAL
DPoP-bound sessions, and the seed-issuer identities/keys (`MORTGAGE_E2E_SEED_ISSUERS`) so
the journey can run the verifications app AS the seeded issuers (the scene-4 one-click
re-issue re-signs the seeded employment VC and revokes its status index for real).
