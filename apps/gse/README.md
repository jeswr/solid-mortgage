# gse — automated underwriting service (AUS)

The **automated underwriting service (AUS)** seat in the Solid Mortgage Showcase — the
Freddie Mac role in the GSE model (journey scenes 3 and 4). Concept demonstration only:
not affiliated with, sponsored by, or endorsed by Freddie Mac; every surface carries the
shared disclaimer banner and noindex metadata. All copy is role-based — no GSE product
names are rendered anywhere.

## What it does

- Reads the **granted loan file** from the borrower's Data Vault pod over the app's OWN
  service identity (decision 0015 L4): the borrower's wallet grant (sm-28) names the AUS
  WebID on the `/mortgage/` container, and the pod's WAC — not app code — enforces it.
  There is no anonymous fallback; a missing or revoked grant fails the run closed.
- **Verifies every credential** (employment+income, assets, credit score, appraisal) with
  vc-kit's fail-closed `verifyCredential`: signature, trusted issuer, validity window,
  Bitstring status, SHACL shape — plus the decision-0015 L3 subject binding. The
  appraisal must ADDITIONALLY appraise the application's subject property
  (canonicalized-address binding — the shapes expose no property IRI/parcel id): a
  genuine appraisal of a different property fails the evidence gate and can never set
  the LTV denominator.
- Runs **DETERMINISTIC rules** (`lib/aus/rules.ts` — pure functions, no clock, no
  randomness): an evidence gate ahead of three published threshold rules (credit score,
  P&I-only DTI, LTV). Assets ÷ monthly P&I is a display-only figure (funds to close
  are not deducted — not a reserve assessment) and never decides the outcome.
  Outcomes: `approve` / `refer` (evidence cannot be relied on) / `caution` (risk
  threshold failed; stored as FIBO `UnderwritingDecision-Ineligible` but always
  displayed as "Caution — manual underwriting review required"). When the evidence gate fails, the risk rules are
  NOT evaluated and no qualifying figures are emitted (`qualifying.evaluated: false`) —
  untrusted numbers are never presented as risk-scored.
- **Delivers the result two ways**: the FULL findings report goes to the requesting
  party in the response payload; the shape-validated `/mortgage/decision` DOCUMENT —
  decision status, AUS recommendation, approved amount (approve only), and conditions
  quoting every FAILED finding verbatim — is written back into the pod (conditional PUT
  via the granted service write). The per-rule pass findings are NOT persisted in the
  pod: the closed `mshape:UnderwritingDecisionShape` admits no findings predicate and
  this repo writes no unshaped RDF, so findings-as-RDF is a data-model follow-up.
- **Scene 4**: a lapsed employment credential refers the file; after the one-click
  re-issue through the existing grant, the same route re-runs to approve.

## Routes

| Route | Method | Boundary |
| --- | --- | --- |
| `/gse/api/aus/run` | POST | Decision-0015: DPoP-bound Solid-OIDC caller required; `pod`/`webid` request parameters rejected; pod derived from the token WebID's bidirectional `pim:storage` binding. |
| `/gse/api/health` | GET | Liveness. |

## Environment

| Variable | Purpose |
| --- | --- |
| `MORTGAGE_TRUSTED_OIDC_ISSUERS` | Comma-separated issuers trusted for caller tokens (unset ⇒ 503). |
| `MORTGAGE_TRUSTED_CREDENTIAL_ISSUERS` | Issuers trusted to sign loan-file credentials (unset ⇒ 503). |
| `MORTGAGE_POD_ALLOWED_ORIGINS` | SSRF allowlist of pod origins (unset ⇒ 503). |
| `MORTGAGE_AUS_SERVICE_WEBID` | This app's service WebID — the agent borrower grants name. |
| `MORTGAGE_AUS_POD_SERVICE_ISSUER` | OIDC issuer for the service identity (client_credentials + DPoP). |
| `MORTGAGE_AUS_POD_SERVICE_CLIENT_ID` / `MORTGAGE_AUS_POD_SERVICE_CLIENT_SECRET` | Confidential client for the service identity (server env only). |
| `MORTGAGE_DEV_ALLOW_LOOPBACK` | Dev/e2e only: permit loopback HTTP transports. Never relaxes a verification gate. |

## Tests

- `test/aus-rules.test.ts` — the pure deterministic rules: approve / refer / caution
  paths, precedence, fail-closed degenerate input, purity.
- `test/pod-auth.test.ts` — the decision-0015 boundary and the REAL grant path: a real
  WAC-enforcing sparq pod, real DPoP tokens, the real client-credentials service
  identity reading through a real borrower grant, real Ed25519-signed credentials
  through the real verifier, decision written and re-read from the pod; non-granted and
  revoked identities are denied by the pod itself. No mocked auth, grant-read, or
  verification anywhere.
