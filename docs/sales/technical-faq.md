# Technical FAQ + architecture brief — the Solid Mortgage Showcase

> **DRAFT — internal to EDMA's engagement team.** Pending legal review (sm-5q2);
> not cleared for external circulation.

For the engineers and architects your engagement conversations will surface. Part 1 is the
two-page architecture brief; Part 2 is the FAQ. Companions: the story is in
[`master-narrative.md`](master-narrative.md), the numbers in
[`benefits-one-sheet.md`](benefits-one-sheet.md), and the standards deliverable in
[`fibo-mismo-binding.md`](fibo-mismo-binding.md). Grounding: `SPEC.md`,
`docs/research/zkp-fit.md`, `docs/research/vocab.md`, `docs/research/prior-art.md`, and the
numbered decision records in `decisions/` — every claim below traces to one of them. Bracketed
numbers = the source list in `docs/research/mortgage-process.md`.

*Concept demonstration — all data simulated; organisations shown role-first ("modelled on X");
no affiliation or endorsement implied.*

---

## Part 1 — Architecture brief

### The system in one paragraph

Eight Next.js applications — tour shell, borrower Data Vault (wallet), three issuer flows,
two competing lenders, an AUS, a property (appraisal + title) app, and an eClose/servicing
app — share one Solid data layer: every persona (the borrower and each stakeholder
organisation) has a pod and a WebID. Verifications are W3C Verifiable Credentials 2.0 stored
in the borrower's pod; access is governed by WAC ACLs the borrower's wallet manages; every
grant and revocation writes a DPV consent receipt; pre-qualification thresholds are proved
with zero-knowledge proofs so the underlying values never leave the pod (SPEC §§2–4).

### Pods and identity

- **Every party is a pod + WebID.** Borrower data lives in the borrower's pod under
  `/mortgage/` and `/credentials/`; stakeholder orgs have their own pods and dereferenceable
  WebIDs (SPEC §3).
- **Three deployment modes** (decision 0011). Mode 1, the default visitor experience: pods run
  *in the visitor's own browser* (the sparq WASM Solid server in a SharedWorker runtime,
  seeded on load) — free, instant, zero server state; **login is simulated and the on-screen
  honesty panel says so**. Mode 2a: org pods on a hard read-only hosted endpoint so org WebIDs
  dereference publicly. Mode 2b: a hosted Community Solid Server instance (pinned 7.1.9) with
  **real Solid-OIDC logins** for facilitated multi-actor sessions — deliberately a second
  implementation, framed as an interoperability proof.
- **Why one shared domain:** `vercel.app` is on the Public Suffix List and Chrome 115+
  partitions all storage by top-level site, so in-browser pods cannot be shared across
  origins; the eight apps therefore serve under one domain via Next.js multi-zones with the
  tour app as shell (decision 0011).
- **Partner-phase path:** migrate storage to the sparq native server + Keycloak (DPoP support
  is official in Keycloak 26.4+); apps change only runtime-config base URLs (decision 0011).

### Credentials

- **W3C VC Data Model 2.0, JSON-LD** — so every credential is *already RDF* and loads through
  the same typed accessors as pod data (vocab.md §3.2). `credentialSubject.id` is the
  borrower's WebID (holder binding); `credentialSchema` points at our published SHACL shapes
  (decision 0004).
- **Signatures:** standards-track `eddsa-rdfc-2022` Data Integrity proofs for tamper-evidence.
  Credentials that participate in ZK flows are **dual-signed at seed time**: the same
  credential also carries a Schnorr-over-Baby-JubJub attestation of a Poseidon2 commitment —
  the only suite the ZK circuits can verify (decision 0004; zkp-fit Q1).
- **Revocation vs freshness are deliberately separate** (decision 0007): Bitstring Status List
  per issuer handles *revocation only*; *freshness* is short validity windows plus one-click
  re-issue through an existing grant — which is exactly the beat scene 4 dramatizes against
  the 10-business-day employment-verification rule [10].
- **Validation:** nine closed SHACL shapes, one per pod resource, CI-validated; the shapes pin
  the ZK digit budgets so shapes and circuits cannot drift (`packages/data-model`).

### Access control and consent

- **WAC** (Web Access Control) throughout, written only through typed access-control wrappers —
  never hand-built ACL documents. Grants are scoped to named resources, revocable, and created
  or revoked by the borrower's wallet.
- **Every grant/revoke writes a DPV consent receipt** into the pod; the wallet renders the
  ledger scene 5 ends on. This ledger is an **application-level feature, not a Solid protocol
  feature** (decision 0006) — we never claim the protocol audits for free. It records
  grants and revocations (a complete authorization history), not every individual read.

### Presentation and cross-app trust

- **Dual rail** (decision 0012): proofs travel by challenge'd VP-POST to the verifier's API —
  per-session nonce, DPoP-bound Solid-OIDC holder authentication, shaped like OID4VP
  `direct_post` for a standards-track migration path. Data access travels the other rail:
  pod-native ODRL/DPV grant requests approved in the wallet.
- **Server-side pod routes never trust the request** (decision 0015): every route that reads
  another party's pod requires DPoP-bound Solid-OIDC (no simulated bypass in server code, in
  any mode); the pod is *derived from the verified WebID* via a bidirectional `pim:storage`
  binding plus an origin allowlist, fail-closed. "Whose pod" never comes from a query
  parameter.

### Zero-knowledge layer (engineers will probe — lead with the honesty panel)

- **Stack:** Noir circuits proved with Barretenberg UltraHonk (BN254, no trusted setup);
  credential graphs canonicalized (RDFC-1.0) and committed via Poseidon2; issuers attest
  commitments with Schnorr-over-Baby-JubJub (zkp-fit Q1).
- **Tier A — live in the browser:** integer threshold proofs (income ≥ T via `filter_int_d4`,
  score ≥ 620 via `filter_int_d3`) prove in-tab in roughly 0.3–1.5 s and verify in
  ~63–174 ms with ~8.4 kB proofs (indicative, non-canonical measurements — zkp-fit Q2). Every
  live proof only counts alongside its issuer-signed operand-anchor credential — a bare
  filter proof would be forgeable (decision 0012).
- **Tier B — precomputed, verified live:** composed manifests (cross-credential join +
  hidden-issuer + not-revoked + holder proof-of-possession) need the native Rust toolchain, so
  they are generated offline at seed time and each sub-proof is verified live in the tab —
  labelled on screen "proved offline · verified live" (zkp-fit Q4).
- **Explicitly out of scope (Tier C):** the full manifest verifier on serverless, any TS
  reimplementation of it, and BBS+ selective disclosure (zkp-fit Q4).
- **The honesty panel, verbatim on every proving surface** (decision 0005): the stack is
  research-grade — internally re-audited, external cryptographer sign-off pending; a passing
  proof is not a production guarantee. The honest claim is "the value is not disclosed and
  cannot be forged," *not* "the verifier cannot possibly learn it" — for low-entropy values
  (a credit score has 551 possible values) a determined verifier could enumerate candidates.

### Data model

FIBO-primary — EDMA/OMG's own finance ontology, whose LOAN domain covers mortgages,
origination, applications, underwriting, and URLA-aligned controlled vocabularies at real,
dereference-checked IRIs — with schema.org for person/address/employment, DPV for consent,
ODRL for usage terms, GLEIF LEI for org identity, and a small published residue vocabulary
(`mort:`) for what no real namespace provides. MISMO v3.4 is bound as a documentation-level
field mapping — see [`fibo-mismo-binding.md`](fibo-mismo-binding.md), the CoP standards
deliverable (vocab.md; SPEC §5). No IRI in the codebase is minted against a namespace we do
not control or publish; a CI lint dereference-checks every IRI.

---

## Part 2 — FAQ

### Security

**Is the ZK stack production-ready?**
No, and the demo says so on screen. It is research-grade: internally re-audited, external
cryptographer sign-off still pending (tracked upstream). A passing proof is not a production
guarantee (zkp-fit; decision 0005). External audit is an explicit partner-phase workstream.

**Can the lender learn the hidden value anyway?**
For low-entropy values, potentially: literal encodings are deterministic and salt-free, so a
determined verifier could enumerate candidates (a credit score has 551 possible values). The
honest claim is "the value is not disclosed and cannot be forged," not "cannot possibly be
learned" — this is stated in the on-screen honesty panel (zkp-fit Q3).

**What stops me presenting someone else's credential?**
Holder binding: `credentialSubject.id` is the borrower's WebID, and presentation requires
DPoP-bound Solid-OIDC proof of control of that WebID, with a per-session nonce (decisions
0012, 0015). In the default in-browser mode the login — and therefore this binding — is
simulated and labelled as such; real authenticated presentation happens in the live
multi-actor mode.

**What stops a recipient keeping a copy of what it fetched?**
Nothing technical, and we never claim otherwise. The honest claim: *authorizations* become
scoped, enumerable, and revocable; unnecessary durable copies get fewer, not zero; regulated
parties still retain what retention rules require; and revoking a grant does not claw back a
retained copy (master narrative §6).

**How do you handle revocation and staleness?**
Separately, on purpose (decision 0007). Revocation: Bitstring Status List per issuer.
Staleness: short credential validity windows plus one-click re-issue through the existing
grant — modelled directly on the industry's freshness rules (credit documents ≤ 4 months
[12]; verbal VOE ≤ 10 business days before note [10]).

**How are server-side pod reads secured?**
Fail-closed, four layers (decision 0015): DPoP-bound Solid-OIDC on every pod route (anonymous
= 401, no simulated bypass in any mode); the target pod derived from the verified token's
WebID via bidirectional `pim:storage` binding, never from a request parameter; an
origin allowlist as the SSRF rail (zero or multiple surviving candidates = 403); then WAC.

### Regulation

**Does the demo comply with TRID / RESPA / ECOA / FCRA?**
The demo *dramatizes* regulatory clocks — Loan Estimate ≤ 3 business days, Closing Disclosure
≥ 3 business days before closing, RESPA servicing-transfer notices [4][5][25][30] — it does
not claim legal compliance, because nothing in it is a real credit transaction (every payload
is watermarked `simulated: true`, and no surface makes an offer or solicitation of credit —
decision 0002). A production build's compliance analysis (FCRA treatment of bureau-issued
credentials, ECOA/Reg B adverse-action duties, GLBA safeguarding, state law) is a named
partner-phase workstream with the member's own counsel — that honest boundary is on every
one-pager.

**Is there a regulator in the demo?**
An unbranded "Examiner View" presents the journey through public-rule content (TRID
timelines, HMDA-shaped fields). It explicitly states non-affiliation with the CFPB; for the
partner phase the regulator lens is convened through member public bodies (FDIC, Federal
Reserve banks) rather than agency branding (org-map role 11).

**What about GDPR / EU relevance?**
The architecture is data-minimisation-first (prove thresholds, not values; access in place,
not copies; DPV-recorded consent — the DPV vocabulary is the W3C community's GDPR-aligned
consent model). For European EDMA members the regulatory tailwind is eIDAS 2.0: certified
EU Digital Identity Wallets are mandatory in every member state by end-2026 and regulated
relying parties — banks included — must accept them; bank-facing analyses name
mortgage-with-verified-income-attestations as the flagship use case (prior-art §7). The
showcase is that story with a data store, ZK, and receipts already built.

### Data ownership

**Who hosts the borrower's pod?**
Whoever the borrower chooses — that is the point of an open protocol. In the demo the pod
runs in the visitor's own browser (default) or on the hosted community server (live mode);
the wallet app models a consumer-scale host (the Verizon-modelled Data Vault, decision 0003).
Precedents for both postures exist: NatWest piloted bank-hosted pods with Inrupt; Flanders'
Athumi runs a government-scale pod platform in production (prior-art §8).

**What if the pod host disappears?**
The data is portable by construction: standard RDF resources behind a standard protocol with
multiple independent server implementations — the demo itself runs on two (sparq's server and
CSS). Contrast: the closest prior mortgage-VC effort, FormFree Passport, was built on a
single corporate platform (Web5) that was discontinued underneath it; what survives platform
death is the standard, which is what we build on (prior-art §3).

**Is this blockchain?**
No. No token, no ledger, no on-chain anchoring. Pods are plain web servers; credentials are
W3C standards; proofs are client-side cryptography. The token-financed and ledger-centric
efforts of 2016–2022 are prior art precisely for what they lacked — a consumer-held store, a
lender-side rail, privacy tech (prior-art §§4, 6, 9).

**Who owns the standards artifacts the CoP produces?**
The FIBO↔MISMO binding table and the reference implementation are CoP deliverables — usable
by every member whether or not they build an app. FIBO is EDMA/OMG's own ontology; the
residue vocabulary is published openly (decision 0010).

### What is real vs simulated

**Real, working technology:** the pods and WAC enforcement (two server implementations); VC
2.0 issuance/verification with `eddsa-rdfc-2022` signatures; SHACL validation in CI; the
DPV consent receipts; the in-browser ZK proving and verification (real Noir/UltraHonk
cryptography — never a mock); the FIBO data model at dereferenceable IRIs.

**Simulated, and labelled on screen:** all personas and data (`simulated: true` on every API
payload); the default mode's login and holder binding; the credit pull, AUS findings logic,
eClose ceremony, and eNote registry (simulations of the real artifacts — the AUS app models
the role, it does not run GSE underwriting); the scene-4 time jump (credentials seeded with
back-dated validity windows — no fake clock). Tier B composed proofs are precomputed offline
and verified live, labelled exactly that way (master narrative §6; zkp-fit Q4).

**Who else has done this?**
Everyone has done a piece: the GSEs' validation programmes proved verified digital data saves
up to 12 days [20]; FormFree proved a GSE-approved vendor will issue borrower-held VCs;
Athumi proved production pods at government scale; GLEIF+BIS proved reusable org credentials
cut repeated onboarding; the EU is legislating wallet acceptance into every bank. Nobody has
combined a user-held general data store + cross-party credential reuse + ZK disclosure +
receipted consent — that combination is this showcase (prior-art, differentiation table §9).

### Engineering choices

**Why two Solid servers?**
sparq's WASM server is the primary rail (it is what makes free in-browser pods possible);
CSS 7.1.9 serves the live-login mode. Running the same apps against both is an
interoperability proof, not an accident (decision 0011).

**Why not BBS+ selective disclosure?**
Two reasons. The W3C `bbs-2023` cryptosuite provides selective disclosure and unlinkability
only — no range/threshold proofs over hidden values, which is the pre-qualification story.
And the sparq estate has not implemented it (named as a later phase). Today's honest stack:
`eddsa-rdfc-2022` full-disclosure signatures + ZK threshold proofs (zkp-fit Q1, Q4).

**Can you prove DTI in zero knowledge?**
Not over two hidden operands — the circuits do no arithmetic between two hidden values, and
we say so rather than fake it. Honest recasts exist (disclose income and ZK-prove hidden debt
≤ a public bound derived from it), and the demo's scope keeps ZK to pre-qualification
thresholds only; at formal underwriting it switches, on screen, to granted access with real
figures (zkp-fit Q3; master narrative scene 2 watch-outs).

**What are the proving numbers?**
Indicative, non-canonical (zkp-fit Q2): in-browser prove ~306 ms–1.29 s for a threshold proof
(multithreaded vs single-threaded — the deployment sets the cross-origin-isolation headers
that unlock ~4x multithreading); verify ~63–174 ms; proof ~8.4 kB; native precompute
0.78–1.83 s per composed sub-proof.

**What would building it for real take?**
Per role, roughly what each one-pager's "what building it for real entails" section says. The
shared platform path is already mapped (decision 0011): native sparq server + Keycloak for
identity, an external ZK audit, per-org sanctioned branding sign-off, MISMO engagement
through its open workgroups, and CDMC as the governance frame. Per-role product proposals
(scope, effort bands, pilot structure) follow for each org that engages (sales PLAN item 7).

---

*Sources: `SPEC.md` §§2–9; `docs/research/zkp-fit.md`; `docs/research/vocab.md`;
`docs/research/prior-art.md`; `docs/research/org-map.md`; decisions 0002, 0004–0007,
0010–0012, 0015; bracketed numbers = the source list in `docs/research/mortgage-process.md`.
Refresh pass due after the apps ship (sales PLAN item 6).*
