# FIBO ↔ MISMO binding table — the CoP standards deliverable (draft v0.1)

> **DRAFT — internal to EDMA's engagement team.** Pending legal review (sm-5q2);
> not cleared for external circulation. Additionally: MISMO-side element names are
> **workgroup-verification-pending** (see "Verification status" below) — do not present the
> MISMO column as authoritative until a MISMO v3.4 licensee has checked it.

This is the artifact every EDMA member can use whether or not they build an app: a
field-level binding between **FIBO** — the EDMA/OMG finance ontology the showcase's pod data
is expressed in — and **MISMO v3.4**, the operative US mortgage data standard behind the
redesigned URLA (Form 1003) and the ULAD mapping that members' LOS/AUS integrations already
speak (org-map role 9). Pod data in FIBO terms, credential payloads mapped to MISMO fields:
that mapping *is* the CoP's "bindings" deliverable (SPEC §11).

Grounding: `docs/research/vocab.md` (every FIBO/schema.org/DPV/VC IRI below was
dereference-checked there, 2026-07-15) and the implemented model in `packages/data-model`
(closed SHACL shapes + typed vocabulary bindings — the code is the normative FIBO side).
`SPEC.md` §5 names `docs/mismo-mapping.md` as the engineering home of the full field census;
this document is its seed and sales packaging.

## Why a binding table (and not a MISMO ontology)

MISMO publishes **no RDF form** — the v3.x Reference Model is XML Schema, with no stable
per-field IRIs — so the correct artifact is a *documentation-level field mapping*, not a
minted namespace (vocab.md §3.1; no-minted-IRIs rule). FIBO, by contrast, covers loans,
mortgages, applications, underwriting, LTV/DTI, appraisal, and even URLA-aligned controlled
vocabularies at real, dereferenceable `spec.edmcouncil.org` IRIs (vocab.md §2). The binding
lets both worlds keep their strengths: pods and credentials speak FIBO (semantic, open,
EDMA-stewarded); members' existing systems keep speaking MISMO XML at the integration edge.

## Verification status — read this first

| Mark | Meaning |
|---|---|
| ✓ | **Verified**: IRI dereference-checked (`docs/research/vocab.md`, 2026-07-15) and/or bound in `packages/data-model` with CI-validated SHACL |
| ◇ | **Draft**: MISMO v3.4 target named at container/concept level from public GSE URLA/ULAD documentation. The MISMO v3.4 Reference Model itself is member-licensed and was **not** inspected for this draft — exact data-point names/paths must be verified by a MISMO workgroup participant before publication. MISMO workgroups are open to non-members (org-map role 9) — this verification is itself the natural first CoP↔MISMO engagement. |

URLA section references are to the public redesigned Form 1003 / ULAD documentation published
by the GSEs (links in the source list of `docs/research/vocab.md` and `org-map.md`).

## The binding, by pod resource

Nine pod resources, one closed SHACL shape each (`packages/data-model/shapes/`); `mort:` is
the CoP's small published residue vocabulary (decision 0010) — used only where no real
namespace provides the term, with each term documenting the FIBO/MISMO concept it
approximates.

### 1. Borrower profile — `/mortgage/profile` ✓

| Concept | Pod representation (FIBO / schema.org / mort) | MISMO v3.4 target ◇ | URLA ref |
|---|---|---|---|
| Borrower party | `fibo-fbc-dae-dbt:Borrower` + `schema:Person` ✓ | PARTY with BORROWER role | §1a |
| Name / DOB / contact | `schema:name`, `schema:birthDate`, `schema:telephone`, `schema:email` ✓ | party name / individual detail | §1a |
| Current address | `schema:PostalAddress` (street, locality, region, postal code) ✓ | party address | §1a |
| Marital status | `mort:maritalStatus` → SKOS concepts Married / Separated / Unmarried ✓ | marital status enumeration | §1a |

*(URLA's Unmarried/Married/Separated tri-state is exactly the `mort:` SKOS scheme — neither
schema.org nor core DPV has the property, hence residue vocab: vocab.md §4.)*

### 2. Employment + income credential — `/credentials/income` ✓

| Concept | Pod representation | MISMO v3.4 target ◇ | URLA ref |
|---|---|---|---|
| Credential envelope | `cred:VerifiableCredential` + `mort:EmploymentIncomeCredential` ✓ | *(no counterpart — see "gap contributions")* | — |
| Employer | `schema:worksFor` → `schema:Organization` (+ GLEIF LEI) ✓ | EMPLOYMENT / employer detail | §1b |
| Job title / start date | `schema:jobTitle`, `schema:startDate` ✓ | employment position / start date | §1b |
| Monthly gross income (ZK operand) | `mort:monthlyGrossIncomeUsd` — plain `xsd:integer`, USD/month, bounds 0–9999 pinned in-shape ✓ | monthly income amount | §1b totals |
| Verification provenance | `cred:issuer`, `cred:validFrom`/`validUntil`, `cred:evidence` → `fibo-loan-ln-app:IncomeVerificationReport` ✓ | GSE verification-report concept (vendor income/employment report) | — |

### 3. Asset credential — `/credentials/assets` ✓

| Concept | Pod representation | MISMO v3.4 target ◇ | URLA ref |
|---|---|---|---|
| Account | `schema:DepositAccount` + `schema:provider` (org + LEI) ✓ | ASSET / deposit account type | §2a |
| Balance | `schema:MonetaryAmount` (`schema:value`, `schema:currency`) ✓ | asset value amount | §2a |
| Account reference | `mort:accountLast4` ✓ | account identifier (masked) | §2a |
| Statement window | `cred:validFrom` / `cred:validUntil` ✓ | verification/statement dates | — |

### 4. Credit-score credential — `/credentials/credit` ✓

| Concept | Pod representation | MISMO v3.4 target ◇ | URLA ref |
|---|---|---|---|
| Rating | `fibo-loan-ln-app:IndividualPersonCreditRating` ✓ | CREDIT_SCORE | *(not a borrower-completed URLA section — credit is lender-pulled; referenced in lender loan information)* |
| Score value (ZK operand) | `mort:creditScoreValue` — `xsd:integer` 300–850, bounds pinned in-shape ✓ | credit score value | — |
| Score model | `mort:scoreModel` → SKOS (e.g. FICO Score 8 — no real IRI exists for score models) ✓ | credit score model enumeration | — |
| Total monthly debt (ZK operand, bureau-sourced tradelines) | `mort:totalMonthlyDebtUsd` — `xsd:integer` USD/month 0–9999 ✓ | liability monthly payment total | §2c |
| Bureau | `cred:issuer` as `fibo-fnd-arr-rt:RatingAgency` (+ LEI) ✓ | credit repository/bureau identifier | — |

*(Deliberate modelling note: the credential carries **no** disclosed FIBO `RatingScore` node
beside the hidden ZK operand — a disclosed derivative would defeat hiding; the closed shape
makes that a validation error. Decision 0005; shapes README.)*

### 5. Appraisal credential — `/credentials/appraisal` ✓

| Concept | Pod representation | MISMO v3.4 target ◇ | URLA ref |
|---|---|---|---|
| Subject property | `fibo-fnd-plc-rp:RealEstate` + `schema:PostalAddress`; `mort:subjectProperty` links credential → property ✓ | COLLATERAL / SUBJECT_PROPERTY | §4a |
| Appraisal act | `fibo-fnd-arr-asmt:Appraisal`, FND `evaluates` (SPARQL-enforced: the evidence must evaluate the same property the subject claims) ✓ | PROPERTY_VALUATION | — |
| Appraised value | `fibo-fnd-arr-asmt:AppraisedValue` via `hasEstimatedValue` ✓ | property valuation amount | — |
| Appraiser | `fibo-fnd-arr-asmt:Appraiser` + `mort:appraiserLicenseId` ✓ | appraiser license identifier | — |

*(Production extension: UAD 3.6 appraisal-dataset internals are a named product-phase item,
not demo scope — SPEC §2.)*

### 6. Title-clear credential — `/credentials/title` ✓

| Concept | Pod representation | MISMO v3.4 target ◇ | URLA ref |
|---|---|---|---|
| Title status | `mort:titleStatus` → SKOS Clear / Clouded ✓ *(no clear-title concept exists in released FIBO modules — vocab.md §5)* | TITLE / title commitment concept (ALTA detail is product-phase) | Lender L2 (title information) |
| Search window | `mort:searchedThrough` (date) ✓ | title search date | — |
| Expected lien position | `fibo-loan-ln-ln:PrimaryLienPosition` ✓ | lien priority type | — |

### 7. Loan application — `/mortgage/application` ✓

| Concept | Pod representation | MISMO v3.4 target ◇ | URLA ref |
|---|---|---|---|
| Application | `fibo-loan-ln-app:LoanApplication`, `hasApplicationDate`, `isSubmittedBy` ✓ | DEAL / LOANS / LOAN (application state) | Form 1003 |
| Requested amount | `fibo-loan-ln-app:hasRequestedAmount` ✓ | loan amount | §4a |
| Loan purpose | FIBO named individuals `MortgageLoanPurpose-RealPropertyPurchase` / `-LoanRefinancing` / `-HomeImprovement` / … ✓ | loan purpose enumeration | §4a |
| Occupancy | `PropertyUsage-primaryResidence` / `-secondHome` / `-investment` ✓ | property usage enumeration | §4a |
| Amortization | `AmortizationType-fixedRate` / `-adjustableRate` (+5 more) ✓ | amortization type enumeration | Lender L3 |
| Cash-out status | `CashOutStatus-CashOut` / `-LimitedCashOut` / `-NoCashOut` ✓ | refinance cash-out determination | Lender L3 |
| Term | `mort:loanTermMonths` ✓ | loan maturity period | Lender L3 |

*(This row group is the headline: FIBO's URLA-aligned named individuals map 1:1 onto the URLA
§4a and Loan Estimate fee enumerations — "the EDMA-owned ontology already speaks URLA."
vocab.md §2.)*

### 8. Underwriting decision — `/mortgage/decision` ✓

| Concept | Pod representation | MISMO v3.4 target ◇ | URLA ref |
|---|---|---|---|
| Decision | `fibo-loan-ln-app:UnderwritingDecision`, `isGeneratedBy` (AUS), `hasApprovedAmount` ✓ | AUS findings/response *(GSE AUS response datasets are GSE-specified over MISMO — exact target needs the workgroup check)* | — |
| Status | `mort:decisionStatus` → SKOS Approved / ApprovedWithConditions / Denied / Suspended ✓ *(FIBO has the class but no status individuals — vocab.md §4)* | underwriting decision enumeration | — |
| Conditions | `mort:underwritingCondition` ✓ | condition detail | — |

### 9. Closing record — `/mortgage/closing` ✓

| Concept | Pod representation | MISMO v3.4 target ◇ | URLA ref |
|---|---|---|---|
| Executed loan | `fibo-loan-reln-mtg:Mortgage`, `fibo-loan-ln-ln:hasPrincipalAmount`, `hasTotalClosingCosts` ✓ | UCD (Uniform Closing Dataset — the MISMO-based Closing Disclosure dataset; version alignment with v3.4 to be confirmed in the workgroup check) | Closing Disclosure |
| Rate | `schema:interestRate` ✓ | note rate | CD |
| Servicer | `fibo-loan-ln-ln:Servicer` via `isServicedBy` ✓ | servicer party role | RESPA transfer notice |
| Dates / recording | `mort:closingDate`, `mort:recordingReference`, `mort:eNoteReference` ✓ | closing date / recording / eNote registry reference (registry referenced generically — org-map) | — |

### Consent + ZK layers — deliberately **no MISMO counterpart** (the CoP's gap contributions)

| Concept | Pod representation | MISMO v3.4 target |
|---|---|---|
| Consent receipt (per grant/revoke) | `dpv:ConsentReceipt`, `hasConsentStatus` (Given/Withdrawn), `hasDataSubject`, `hasDataController`, `odrl:target` ✓ | **none exists** — consumer-visible consent receipts are absent from the mortgage standard |
| ZK operand anchor | `mort:ZkOperandAnchor` (`mort:field`, `mort:operandEnc`), issuer-signed ✓ | **none exists** — holder-bound, minimally-disclosed verification is absent |
| Credential envelope | VC 2.0 (`cred:*`) + Bitstring Status List ✓ | closest MISMO artifact is the SMART Doc "Verifiable Profile" — document/data integrity, **not** W3C VCs (prior-art §1.1) |

These three rows are the standards *contribution* story: the binding shows not only where the
two models meet but exactly which consumer-control concepts the industry standard is missing —
a concrete agenda for CoP engagement with MISMO's open workgroups.

## Appendix — ZK-provable fields (digit budgets, decision 0005)

The only ZK-provable fields; each is a plain `xsd:integer` in the stated unit, bounds pinned
identically in the SHACL shapes and the circuit budgets (test-enforced, no drift —
`packages/data-model/src/zk-budgets.ts`):

| Field | Unit | Bounds | Circuit |
|---|---|---|---|
| `mort:monthlyGrossIncomeUsd` | USD/month | 0–9999 | `filter_int_d4` |
| `mort:totalMonthlyDebtUsd` | USD/month | 0–9999 | `filter_int_d4` |
| `mort:creditScoreValue` | score points | 300–850 | `filter_int_d3` |

## Governance and maintenance

- **FIBO version discipline:** `LoanApplications` and `MortgageOrigination` are Provisional
  maturity — terms can move between quarterly releases; the repo pins the FIBO snapshot and a
  CI lint dereference-checks every IRI (7-day cache), re-run on FIBO quarterly releases
  (vocab.md §1).
- **`mort:` residue vocabulary:** published at a real URL under CoP control (decision 0010);
  a term enters only after checking FIBO/schema.org/DPV, and each term's definition names the
  FIBO/MISMO concept it approximates. Long-term home could be an EDMA-hosted namespace in the
  productisation phase (vocab.md §4).
- **MISMO verification path:** join the eMortgage/RON workgroups (open to non-members),
  verify the ◇ column against the licensed v3.4 Reference Model, then publish v1.0 of this
  table as the CoP deliverable (org-map role 9; SPEC §11).

---

*Sources: `docs/research/vocab.md` (all FIBO/schema.org/DPV/VC/GLEIF dereference checks +
namespace registry + source links, incl. the public Fannie Mae and Freddie Mac URLA/ULAD
pages); `docs/research/org-map.md` role 9; `docs/research/prior-art.md` §1;
`packages/data-model` (shapes + vocab bindings — normative for the pod side); decisions 0005,
0010, 0012. Draft v0.1, 2026-07-18.*
