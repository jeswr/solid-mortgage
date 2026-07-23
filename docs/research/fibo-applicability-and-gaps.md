# FIBO applicability and gap analysis — three Solid finance showcases

> **Author role:** FIBO ontologist (EDM Council best practice).
> **Scope:** Demo 1 mortgage (`solid-mortgage`), Demo 2 small-dollar lending
> (`solid-lending`), Demo 3 business KYB / beneficial ownership (`solid-kyb`).
> **Method:** every FIBO / OMG Commons term cited below was **dereferenced live**
> (`Accept: text/turtle`, final status `200`) on **2026-07-23** against the
> production tree at `https://spec.edmcouncil.org/fibo/ontology/…` and the OMG
> Commons library at `https://www.omg.org/spec/Commons/…`. Nothing here is from
> memory; where a term could not be confirmed it is flagged as *unverified*.
> **Companion PR:** the KYB data model has been refactored to apply these
> findings as the concrete exemplar — `jeswr/solid-kyb#9` (`feat/fibo-direct`).

---

## 0. How to read this document

Every modelled element is classified into exactly one of three buckets:

| Bucket | Meaning | Correct? |
|---|---|---|
| **DIRECT** | The actual `rdf:type` / predicate in instance data and SHACL `sh:targetClass`/`sh:path` **is** a live FIBO or OMG Commons IRI. | ✅ the goal |
| **OTHER-STANDARD** | The element is reused from another authoritative, dereferenceable standard because it is *out of FIBO's domain* — schema.org (person/address/display), W3C VC 2.0 (credential envelope), DPV (consent/purpose), ODRL (usage policy), GLEIF (LEI data), ISO code lists, Dublin Core. **Not** a FIBO gap. | ✅ correct reuse |
| **EXTEND** | A project-minted term. Split into **E1 = genuine FIBO-domain gap** (a financial-business concept FIBO could/should carry → upstream-contributable) and **E2 = non-FIBO plumbing** (VC subtype, ZK operand, status-code SKOS, DPV purpose — concepts no financial-instrument ontology would ever carry). | E1 = real gap; E2 = expected residue |

The single most important honest finding, stated up front: **across all three
use cases the domain-substantive modelling maps to FIBO/Commons almost
entirely DIRECT; the project-minted residue is dominated by E2 plumbing (VC
envelopes, ZK operands, consent purposes, decision-status code lists), not by
genuine FIBO gaps.** The genuine E1 gaps are few and specific, and each is
listed with an upstream contribution recommendation in §5.

### Pattern-violation legend (the anti-patterns this analysis hunts)

- **V-ROLE** — a *relative thing* (Borrower, Lender, BeneficialOwner, Officer)
  modelled as a subclass of the independent thing, or with the role and the
  role-bearer conflated on one node, instead of a `cmns-pty:PartyInRole` /
  FIBO role class linked to the person/org by `cmns-rlcmp:isPlayedBy`.
- **V-ID** — an identifier (LEI, licence number) modelled as a bare string
  datatype property instead of an **identifier individual** referenced by
  `cmns-id:isIdentifiedBy` with its value on `cmns-txt:hasTextValue`.
- **V-MINT** — a project term minted for a concept FIBO/Commons already defines.
- **V-IRI** — a minted or cited IRI that does **not** dereference (the cardinal
  sin: it defeats the whole "real, dereferenceable namespaces only" rule).

---

## 1. FIBO modules dereferenced for this analysis (evidence base)

All `200 text/turtle` on 2026-07-23 (production tree; the versioned
`…/master/latest/…` form resolves identically):

| Prefix | Module namespace | Used by |
|---|---|---|
| `fibo-loan-ln-ln` | `LOAN/LoansGeneral/Loans/` | mortgage, lending |
| `fibo-loan-ln-app` | `LOAN/LoansGeneral/LoanApplications/` | mortgage |
| `fibo-loan-reln-mtg` | `LOAN/RealEstateLoans/Mortgages/` | mortgage |
| `fibo-loan-reln-org` | `LOAN/RealEstateLoans/MortgageOrigination/` | mortgage |
| `fibo-loan-spc-cns` | `LOAN/LoansSpecific/ConsumerLoans/` | lending |
| `fibo-fbc-dae-dbt` | `FBC/DebtAndEquities/Debt/` | mortgage, lending |
| `fibo-fnd-arr-asmt` | `FND/Arrangements/Assessments/` | mortgage |
| `fibo-fnd-arr-rt` | `FND/Arrangements/Ratings/` | mortgage, lending |
| `fibo-fnd-plc-rp` | `FND/Places/RealProperty/` | mortgage |
| `fibo-be-le-lei` | `BE/LegalEntities/LEIEntities/` | KYB |
| `fibo-be-le-lp` | `BE/LegalEntities/LegalPersons/` | KYB |
| `fibo-be-le-fbo` | `BE/LegalEntities/FormalBusinessOrganizations/` | KYB |
| `fibo-be-oac-opty` | `BE/OwnershipAndControl/OwnershipParties/` | KYB |
| `fibo-be-oac-exec` | `BE/OwnershipAndControl/Executives/` | KYB |
| `cmns-id` | `Commons/Identifiers/` | KYB |
| `cmns-txt` | `Commons/TextDatatype/` | KYB |
| `cmns-dsg` | `Commons/Designators/` | KYB |
| `cmns-org` | `Commons/Organizations/` | KYB |

> **V-IRI caveat, verified 2026-07-23:** the *bare domain roots* do **not**
> dereference — `https://spec.edmcouncil.org/fibo/ontology/BE/` returns **HTTP
> 404**. Only the **leaf ontology modules** (the rows above) resolve. This is
> not cosmetic: `solid-kyb`'s `lint:iris` was failing on exactly this, because
> `docs/use-case.md` abbreviated the domain as `.../ontology/BE/...` and the
> linter extracted the 404-ing `/BE/` root. Fixed in `solid-kyb#9`. Cite leaf
> modules, never domain roots.

---

## 2. Use case 1 — Mortgage (`solid-mortgage`, `mort:`)

The mortgage model is the **strongest FIBO fit of the three**: FIBO LOAN was
built for exactly this journey (it even ships URLA-aligned controlled
vocabularies as named individuals). The current model already `sh:targetClass`es
FIBO classes directly (`fibo-loan-ln-app:LoanApplication`,
`fibo-loan-ln-app:UnderwritingDecision`, `fibo-fnd-plc-rp:RealEstate`).

### 2.1 Mapping (representative elements; full field list in `docs/research/vocab.md` §5)

| Element | Bucket | FIBO/Commons IRI (or other standard) + module | Notes |
|---|---|---|---|
| Loan / secured / collateralized loan | DIRECT | `fibo-loan-ln-ln:Loan`, `SecuredLoan`, `CollateralizedLoan` | `LoansGeneral/Loans` |
| Principal, closing costs, balance | DIRECT | `fibo-loan-ln-ln:hasPrincipalAmount`, `hasTotalClosingCosts`, `hasLoanBalance` | |
| LTV / CLTV / lien position | DIRECT | `fibo-loan-ln-ln:LoanToValueRatio`, `CombinedLoanToValueRatio`, `PrimaryLienPosition`, `SubordinateLienPosition` | |
| Mortgage instrument + funding | DIRECT | `fibo-loan-reln-mtg:Mortgage`, `ClosedEndMortgageLoan`, `hasInitialFundingDate` | |
| Loan application + status/date/amount | DIRECT | `fibo-loan-ln-app:LoanApplication`, `LoanApplicationStatus`, `hasRequestedAmount` | `sh:targetClass` already FIBO |
| Underwriting decision + inputs | DIRECT | `fibo-loan-ln-app:UnderwritingDecision`, `CreditRiskAssessment`, `BorrowerAssessment`, `hasApprovedAmount` | |
| DTI / income | DIRECT | `fibo-loan-ln-app:BorrowerMonthlyIncome`, `hasGrossIncome`, `TotalDebtExpenseRatio` | |
| Credit rating + score scale | DIRECT | `fibo-loan-ln-app:IndividualPersonCreditRating`; `fibo-fnd-arr-rt:RatingScore`, `RatingScale`, `RatingAgency` | |
| Property + appraisal | DIRECT | `fibo-fnd-plc-rp:RealEstate`, `RealProperty`; `fibo-fnd-arr-asmt:Appraisal`, `AppraisedValue`, `Appraiser` | |
| Interest rate terms | DIRECT | `fibo-fbc-dae-dbt:FixedInterestRate`, `FloatingInterestRate`, `InterestPaymentTerms` | |
| **Roles: borrower / lender** | DIRECT | `fibo-fbc-dae-dbt:Borrower`, `Lender`, `Creditor`, `Debtor`; `fibo-loan-ln-ln:Comaker` | FIBO's `Borrower` **is** a party-in-role (⊑ `Debtor`) — the correct pattern (see V-ROLE note 2.3) |
| URLA loan purpose / occupancy / amortization / cash-out | DIRECT | `fibo-loan-reln-org:MortgageLoanPurpose-*`, `PropertyUsage-*`, `AmortizationType-*`, `CashOutStatus-*` (named individuals) | attached via `dcterms:type` — see 2.3 |
| AUS recommendation code | DIRECT | `fibo-loan-ln-app:UnderwritingDecision-Approve/-Refer/-Eligible/…` | |
| Person / name / address / employment | OTHER-STANDARD | schema.org (`schema:Person`, `PostalAddress`, `worksFor`, `baseSalary`) | FIBO is deliberately silent on PII display fields |
| Monetary amounts (display) | OTHER-STANDARD | `schema:MonetaryAmount` (`schema:value`, `schema:currency`) | decision 0005; avoids `cmns-qtu` term-IRI deref fragility |
| Credential envelope | OTHER-STANDARD | W3C VC 2.0 (`cred:VerifiableCredential`, `credentialSubject`, `evidence`) | |
| Consent / purpose | OTHER-STANDARD | DPV (`dpv:Consent`, `dpv:hasPurpose`) | |
| Org identity | OTHER-STANDARD | GLEIF `gleif-L1:LegalEntity` + LEI | |
| MISMO / ULAD field IDs | OTHER-STANDARD | documentation-level mapping only (MISMO ships **no** RDF) | `docs/mismo-mapping.md` |
| Title-clear status | **EXTEND (E1)** | `mort:TitleClearCredential`, `mort:titleStatus` (SKOS clear/clouded) | FIBO models liens/`PublicRecordCategory-LienRecord` but has **no clear-title assertion** |
| Underwriting **decision statuses** | **EXTEND (E1)** | `mort:DecisionStatus-Approved/-ApprovedWithConditions/-Denied/-Suspended` | FIBO has the `UnderwritingDecision` class + AUS-recommendation individuals but **no lender-facing decision-status code set** |
| Down-payment source | **EXTEND (E1)** | `mort:` SKOS | URLA §4d; no FIBO concept found |
| Credential subtypes | EXTEND (E2) | `mort:EmploymentIncomeCredential`, `AssetCredential`, `CreditScoreCredential`, `AppraisalCredential` | VC-envelope subtypes — not FIBO's domain |
| ZK integer companions | EXTEND (E2) | `mort:monthlyGrossIncomeCents`, `creditScoreValue`, `appraisedValueCents` | ZK circuit plumbing (minor-unit integers) |
| `mort:loanTermMonths`, declarations booleans, marital status | EXTEND (E1/E2) | `mort:` | small residue; marital status absent from both FIBO and core schema.org |
| Underwriting purpose (consent) | EXTEND (E2) | `mort:MortgageUnderwritingPurpose` `a dpv:Purpose` | DPV core has no underwriting purpose |

### 2.2 Coverage summary (mortgage)

Counting ~46 distinct modelled elements at the granularity above:

- **DIRECT (FIBO/Commons):** ~28 → **≈ 61 %**
- **OTHER-STANDARD:** ~9 → **≈ 20 %**
- **EXTEND:** ~9 → **≈ 19 %** — of which only **~4 are genuine E1 FIBO-domain
  gaps** (title status, decision statuses, down-payment source, marital status
  ≈ **9 %**); the rest are E2 VC/ZK/DPV plumbing.

### 2.3 Pattern notes / limitations (mortgage)

- **V-ROLE — clean.** `fibo-fbc-dae-dbt:Borrower` is a genuine FIBO party role
  (⊑ `Debtor`), used as a type within the application context and linked to the
  borrower WebID (`schema:Person`). This is the correct pattern; the only
  refinement worth noting is that where the borrower node carries both the role
  type and `schema:Person`, an explicit `cmns-rlcmp:isPlayedBy` edge would make
  the role/person split unambiguous. Low priority — not a violation.
- **Controlled-vocabulary attachment via `dcterms:type`, not FIBO's own
  property.** FIBO's `fibo-loan-ln-app:hasIntendedLoanPurpose` is a *datatype*
  property (`xsd:string`), and the OMG Commons classifier object-properties
  (`cmns-cls:isClassifiedBy`) that would carry the named individuals are not
  reliably term-dereferenceable, so the model links the URLA individuals with
  `dcterms:type`. This is a **defensible workaround**, not a violation — the
  *values* are real FIBO individuals (DIRECT). Flag for FIBO: an
  object-property path to the URLA individuals would let this be fully native.
- **Money via `schema:MonetaryAmount`, not `cmns-qtu`.** Deliberate
  (decision 0005) to avoid Commons quantity term-IRI deref fragility.
  OTHER-STANDARD, correct.

---

## 3. Use case 2 — Small-dollar lending (`solid-lending`, `lend:`)

FIBO covers the **loan instrument** directly; the demo's novelty (consumer
cash-flow underwriting, FDX-shaped bank data, Reg Z disclosure) is mostly
outside FIBO's current reach and correctly lives in project/other-standard
space. **But the model ships the single worst pattern violation in the suite.**

### 3.1 The headline violation — `V-IRI`: `urn:example:lend#`

The lending vocabulary is minted at **`urn:example:lend#`** (RFC 6963 example
URN space) — a **deliberately non-dereferenceable placeholder**. This violates
the cardinal rule (principle 3: *no minted IRIs that don't dereference; only a
real controlled namespace*). Its own header comment acknowledges it as a
build-time defect. **Every `lend:` type and predicate in committed instance
data and SHACL is therefore un-dereferenceable.** This is strictly worse than
a wrong FIBO fragment, because *nothing* resolves.

**Fix (mirrors mortgage decision 0010 / KYB §3.5):** stand up a tiny
`solid-lending-vocab` Vercel project, publish `lend.ttl` at a real hash
namespace `https://solid-lending-vocab.vercel.app/lend#`, and migrate the
namespace in one commit (publish first, then migrate). Until then no `lend:`
IRI should ship to a live surface. This is the top remediation for Demo 2.

### 3.2 Mapping

| Element | Bucket | IRI + module / rationale |
|---|---|---|
| Offered consumer loan | DIRECT | `fibo-loan-spc-cns:UnsecuredConsumerLoan` (`LoansSpecific/ConsumerLoans`) + `fibo-loan-ln-ln:ClosedEndCredit` (`LoansGeneral/Loans`) |
| Principal amount | DIRECT | `fibo-loan-ln-ln:hasPrincipalAmount` |
| Roles: borrower / lender | DIRECT | `fibo-fbc-dae-dbt:Borrower`, `Lender` (`FBC/DebtAndEquities/Debt`) |
| Bureau score scale | DIRECT (available) | `fibo-fnd-arr-rt:RatingScore`, `RatingScale`, `RatingAgency` — **currently modelled as `lend:` residue; should be DIRECT** (see 3.4) |
| APR | OTHER-STANDARD | `schema:annualPercentageRate` |
| Money (display) | OTHER-STANDARD | `schema:MonetaryAmount` |
| Disbursement | OTHER-STANDARD | `schema:MoneyTransfer` |
| Payment schedule | OTHER-STANDARD | `schema:loanRepaymentForm` / `RepaymentSpecification` |
| Identity / KYC-CIP | OTHER-STANDARD | schema.org + W3C VC + DPV (`dpv:IdentityVerification`) |
| Bank cash-flow attributes | OTHER-STANDARD (mapping) | **FDX** field mapping, documentation-level — FDX ships no RDF (`docs/fibo-fdx-binding.md`) |
| Credential subtypes (Identity, EmploymentIncome, BankCashFlow, CashFlowScore, CreditScore, LoanOffer, DisbursementReceipt, RepaymentHistory) | EXTEND (E2) | VC-envelope subtypes |
| Cash-flow underwriting fields: `hasDepositStream`, `DepositStream`, `hasAverageDailyBalance`, `observationMonths`, `nsf90Count`, `cashFlowScoreValue` | **EXTEND (E1)** | FIBO has **no cash-flow-based-underwriting model**; nearest anchor is `ConsumerLoan` + FND Ratings |
| Reg Z disclosure: `hasFinanceCharge`, `hasTotalOfPayments` | **EXTEND (E1, verify)** | Reg Z §1026.18(d)/(h). Not found in fetched LOAN modules; likely a genuine FIBO gap — **verify against `FBC` before contributing** |
| Score models, payment rail | EXTEND (E2) | `lend:ScoreModel-*`, `PaymentRail-*` (SKOS) |
| Bureau file facts (`tradelineCount`, `creditHistoryMonths`) | EXTEND (E1) | thin-file attributes; no FIBO concept found |
| ZK fields (`netMonthlyIncomeUsd`, `cashFlowScoreValue`, `nsf90Count`) + operand anchor | EXTEND (E2) | ZK plumbing |

### 3.3 Coverage summary (lending)

Counting ~34 distinct modelled elements:

- **DIRECT:** ~6 → **≈ 18 %** (rising to **≈ 24 %** once the bureau-score scale
  is moved from `lend:` to `fibo-fnd-arr-rt:*`, 3.4)
- **OTHER-STANDARD:** ~9 → **≈ 26 %**
- **EXTEND:** ~19 → **≈ 56 %** — but **E2 plumbing dominates**; genuine E1
  FIBO-domain gaps are ~6 (cash-flow underwriting attributes, Reg Z disclosure
  fields, thin-file bureau facts). The low DIRECT % is *inherent to the use
  case*: cash-flow/alt-data underwriting is precisely the space FIBO has not
  yet modelled, and FDX (which has) publishes no RDF.

### 3.4 Corrections recommended (lending — design only this pass)

1. **`V-IRI`:** publish and migrate off `urn:example:lend#` (3.1). **Top
   priority.**
2. **`V-MINT` (partial):** the bureau **score** should reuse
   `fibo-fnd-arr-rt:RatingScore`/`RatingScale`/`RatingAgency` (as the mortgage
   demo does) rather than carry the score only as `lend:creditScoreValue`. Keep
   the ZK integer companion as E2, but type the disclosed score DIRECT.
3. Verify `hasFinanceCharge` / `hasTotalOfPayments` against `FBC` before
   treating them as permanent E1 gaps.

*(Full code refactor of `solid-lending` is out of scope for this pass and is
recorded as remaining work; a follow-up bead will be filed.)*

---

## 4. Use case 3 — Business KYB / beneficial ownership (`solid-kyb`, `kyb:`) — the exemplar

FIBO **Business Entities** is a near-perfect fit, and the LEIEntities module is
modelled directly from GLEIF's own LEI CDF / ISO 17442 / ISO 20275 data (its
`cmns-av:adaptedFrom` annotations cite them), so the FIBO-BE ↔ GLEIF binding is
FIBO's **own stated provenance**, not an analogy. This use case was refactored
to be the concrete exemplar (**`solid-kyb#9`**); the findings below are
*implemented*, not just proposed.

### 4.1 Pattern violations found and corrected (the exemplar's point)

| # | Violation (was) | Corrected to (DIRECT, live-verified) | Evidence |
|---|---|---|---|
| 1 | **V-MINT** `kyb:hasOwnershipRecord` (business → its ownership records) | `fibo-be-oac-opty:hasDirectOwnership` | FIBO's **own** `owl:inverseOf hasOwnedEntity`; domain `BusinessEntity`/`LegalEntity`, range `EntityOwnership` — verbatim the concept minted |
| 2 | **V-MINT** `kyb:hasAuthorizedOfficer` (business → officer) | `fibo-be-oac-exec:hasCorporateOfficer` | FIBO's **own** `owl:inverseOf isOfficerOf`; range `CorporateOfficer` |
| 3 | **V-ID** LEI value as `schema:identifier` string | `cmns-txt:hasTextValue` on the `fibo-be-le-lei:LegalEntityIdentifier` individual (referenced by `cmns-id:isIdentifiedBy`) | `cmns-dsg:hasTag`/`hasTextValue` is Commons' identifier-value predicate; the LEI stays an identifier **individual**, not a bare string |
| 4 | **V-IRI** `docs/use-case.md` cited the 404-ing bare `/BE/` domain root (broke `lint:iris`) | concrete leaf-module IRIs (`…/BE/LegalEntities/LEIEntities/`) | live 404 vs 200, verified 2026-07-23 |

All four are shipped in `solid-kyb#9` with `typecheck` / `test` / `lint:iris` /
`check:insignia` green.

### 4.2 Mapping (post-refactor)

| Element | Bucket | IRI + module |
|---|---|---|
| LEI-registered legal entity | DIRECT | `fibo-be-le-lei:LEIRegisteredEntity` (⊑ `cmns-org:LegalPerson`; `≡ isIdentifiedBy some LegalEntityIdentifier`) |
| Business entity | DIRECT | `fibo-be-le-lp:BusinessEntity` (⊑ `cmns-org:FormalOrganization`) |
| LEI identifier individual | DIRECT | `fibo-be-le-lei:LegalEntityIdentifier` (⊑ `cmns-org:OrganizationIdentifier`), value via `cmns-txt:hasTextValue`, linked by `cmns-id:isIdentifiedBy` |
| Entity legal form (ISO 20275) | DIRECT | `fibo-be-le-lei:hasLegalForm` → `EntityLegalForm` |
| Ownership record | DIRECT | `fibo-be-oac-opty:EntityOwnership` (⊑ `fibo-fnd-oac-own:Ownership`) |
| Owner / owning / owned edges | DIRECT | `fibo-be-oac-opty:hasOwningEntity` (→ `cmns-org:LegalPerson`), `hasOwnedEntity`, `hasDirectOwnership`, `EntityOwner` |
| Ownership percentage (disclosed) | DIRECT | `fibo-be-le-lei:hasOwnershipPercentage` (`xsd:decimal`; restriction on `EntityOwnership`) — GLEIF-RR-adapted |
| Officer / signatory (roles) | DIRECT | `fibo-be-oac-exec:CorporateOfficer` (⊑ `Signatory` ⊑ `AuthorizedIndividual`), `hasCorporateOfficer`, `hasSigningAuthorityFor`, `isOfficerOf` |
| Org / person / address display | OTHER-STANDARD | `schema:Organization`, `schema:Person`, `schema:PostalAddress` |
| Credential envelope | OTHER-STANDARD | W3C VC 2.0 |
| Consent | OTHER-STANDARD | DPV |
| ISO 20275 ELF code list (real) | OTHER-STANDARD | ISO 20275 / GLEIF ELF list (demo uses illustrative SKOS stand-ins) |
| Credential subtypes (OrgIdentity, BeneficialOwnership, OfficerAuthorization) | EXTEND (E2) | VC-envelope subtypes |
| CDD decision status | EXTEND (E1) | `kyb:CddDecisionStatus-Opened/-Declined/-PendingReview` (SKOS) — no FIBO status individuals |
| CDD decision record + `checkedCredential`, `cddCheckDate` | EXTEND (E2) | bank's own compliance record (not a FIBO instrument) |
| ZK: `ownershipPercentageBps`, `beneficialOwnershipArrayCommitment`, anchor, `operandEnc`, `field` | EXTEND (E2) | ZK plumbing |
| `isIllustrativeLei` | EXTEND (E2) | demo-safety marker (non-fabrication) |
| Beneficial-ownership verification purpose | EXTEND (E2) | `kyb:…Purpose a dpv:Purpose` |
| Illustrative ELF individuals (LLC/Corp/LLP) | EXTEND (E2) | stand-in for ISO 20275 (owned by ISO/GLEIF, not FIBO) |

### 4.3 Coverage summary (KYB)

Counting ~35 distinct modelled elements:

- **DIRECT:** ~19 → **≈ 54 %**
- **OTHER-STANDARD:** ~6 groups → **≈ 17 %**
- **EXTEND:** ~10 → **≈ 29 %**, but **genuine E1 FIBO-domain gaps ≈ 1**
  (CDD decision status). **KYB has essentially zero FIBO class/predicate gaps**
  — every substantive legal-entity / ownership / officer concept resolves to a
  live FIBO-BE term. The residue is entirely VC/ZK/consent/regulatory-status
  plumbing plus the ISO 20275 code list (which belongs to ISO/GLEIF).

### 4.4 Remaining recommended refinement (documented, not shipped)

- **V-ROLE (mild):** the officer node is typed `Signatory` + `CorporateOfficer`
  + `schema:Person` on one node, and each `EntityOwner` node likewise carries
  the role type + `schema:Person` + name. FIBO's role classes carry a
  `cmns-rlcmp:isPlayedBy some …` restriction, i.e. they are *roles played by* a
  person. The fully idiomatic form types the node as the **role only** and adds
  `cmns-rlcmp:isPlayedBy` → a `schema:Person` node bearing name/jobTitle. This
  is a *refinement*, not a violation (the correct FIBO role classes are already
  used), and was left out of `#9` to keep the exemplar tightly scoped and the
  ZK operand/seed fixtures stable. Recommended as a follow-up bead.

---

## 5. Consolidated gaps and upstream FIBO contribution recommendations

Only **E1 (genuine FIBO-domain)** gaps are listed — E2 plumbing is out of
FIBO's remit by design. For each: nearest FIBO parent, the FIBO pattern to
extend by, the project extension IRI, and a concrete upstream target.

| # | Missing concept | Use case | Nearest FIBO parent (live) | Extension pattern | Project extension IRI | **Upstream FIBO contribution recommendation** |
|---|---|---|---|---|---|---|
| G1 | Underwriting **decision-status** code set (approved / approved-with-conditions / denied / suspended) | mortgage (+ KYB CDD-status analogue) | `fibo-loan-ln-app:UnderwritingDecision` + its existing AUS-recommendation named-individual pattern | Mint a `skos:ConceptScheme` of code individuals; subclass/parallel the AUS-recommendation individuals | `mort:DecisionStatusScheme` / `kyb:CddDecisionStatusScheme` | **`LOAN/LoansGeneral/LoanApplications`** — add a `LoanDecisionStatus` code set beside the existing `UnderwritingDecision-*` individuals (parent: a new `LoanDecisionStatus` classifier). Covers both the mortgage lender decision and, by analogy, a `BE` CDD-outcome status. |
| G2 | **Clean/clear-title** assertion (title status clear vs clouded) | mortgage | `fibo-fnd-plc-rp:RealProperty` + lien modelling (`fibo-loan-ln-app:PublicRecordCategory-LienRecord`, `fibo-loan-ln-ln:LenderLienPosition`) | Mint a `TitleStatus` classifier + `titleStatus` object property ranging over it | `mort:TitleClearCredential`, `mort:titleStatus` | **`FND/Places/RealProperty`** or a new `LOAN` title module — add `TitleStatus` (parent: a `cmns-cls:Classifier`) with `Clear`/`Clouded` individuals and a `hasTitleStatus` property on `RealProperty`. |
| G3 | **Consumer cash-flow underwriting** attribute set (deposit streams, NSF/period counts, cash-flow score) | lending | `fibo-loan-spc-cns:ConsumerLoan`; `fibo-fnd-arr-rt:RatingScore` for the score | Subclass `RatingScore` for the cash-flow score; mint deposit-stream/attribute classes under a Provisional module | `lend:DepositStream`, `lend:cashFlowScoreValue`, `lend:nsf90Count` | **`LOAN/LoansSpecific/ConsumerLoans`** (Provisional) — add a `CashFlowUnderwritingAttribute` family + a `CashFlowScore ⊑ fibo-fnd-arr-rt:RatingScore`. This is the largest genuine domain gap and aligns FIBO with FCRA-regulated cash-flow scoring now in market. |
| G4 | **Reg Z closed-end disclosure** fields (finance charge, total of payments) | lending | `fibo-loan-ln-ln:ClosedEndCredit` (+ `hasTotalClosingCosts` as a sibling pattern) | Mint disclosure object properties ranging over monetary amounts, parallel to `hasTotalClosingCosts` | `lend:hasFinanceCharge`, `lend:hasTotalOfPayments` | **`LOAN/LoansGeneral/Loans`** — add `hasFinanceCharge` / `hasTotalOfPayments` beside `hasTotalClosingCosts` (**verify absence in `FBC` first**). |
| G5 | **Beneficial-owner control threshold** classifier (the 25 % CDD concept) | KYB | `fibo-be-oac-opty:EntityOwnership` + `fibo-be-le-lei:RelationshipStatus` | Mint a `ControlThreshold`/`BeneficialOwner` classifier over `EntityOwnership` | (currently expressed only via the ZK predicate + disclosed %) | **`BE/OwnershipAndControl/OwnershipParties`** — add a `BeneficialOwner` classifier (parent: `cmns-cls:Classifier`) capturing the ≥25 % control notion the FinCEN CDD Rule (31 CFR §1010.230) turns on. |
| G6 | **Down-payment source**, **marital status**, URLA declarations booleans | mortgage | — (URLA form fields; partly PII) | Small SKOS + booleans; keep in project vocab | `mort:` residue | Low value upstream; better as a MISMO/ULAD documentation mapping than a FIBO term. |

**E2 residue (all three) — do NOT contribute upstream:** VC-envelope subtypes,
ZK operand anchors / scaled-integer companions, `dpv:Purpose` concepts, and
demo-safety markers (`isIllustrativeLei`). These are Solid/VC/ZK-showcase
plumbing that no financial-instrument ontology should carry; they correctly
live in the project vocab (or W3C VC / DPV) and are expected residue.

---

## 6. Cross-cutting findings

1. **FIBO covers the *domain substance* of all three journeys directly.** Where
   DIRECT % looks low (lending), it is because the use case is deliberately
   about *alt-data underwriting* and *FDX bank data* — spaces FIBO has not
   modelled and FDX has not published as RDF — not because FIBO was bypassed
   for concepts it owns.
2. **The worst violations are IRI-hygiene, not mis-modelling.**
   - `urn:example:lend#` (lending) — nothing dereferences. Top fix.
   - the 404-ing bare `/BE/` domain-root citation (KYB docs) — a live symptom
     of memory/imprecise-IRI authoring; fixed in `#9`.
   - Two minted KYB predicates that duplicated FIBO's own inverse properties;
     one LEI-as-string identifier — all three fixed in `#9`.
3. **Roles are mostly modelled correctly.** No use case commits the cardinal
   `:Borrower rdfs:subClassOf foaf:Person` error; FIBO's own party-role classes
   (`Borrower`, `CorporateOfficer`, `Signatory`, `EntityOwner`) are used
   directly. The only refinement is the explicit `cmns-rlcmp:isPlayedBy`
   role/person split (KYB §4.4), which is optional.
4. **Identifiers:** after `#9`, the KYB LEI is a proper identifier individual.
   The mortgage/lending models should audit for any remaining string-typed
   identifiers (NMLSR ID, appraiser licence, account-last-4) and, where the
   value is a real registered identifier, model it via `cmns-id:isIdentifiedBy`
   + `cmns-txt:hasTextValue` (account-last-4 is a masked display value, not a
   registered identifier — string is fine there).

### 6.1 Honest caveats

- Coverage percentages are **element-count estimates at a chosen granularity**,
  not a formal metric; the denominator choice (e.g. whether each VC-envelope
  field counts) moves them several points. They are directional.
- Two **Provisional**-maturity FIBO modules underpin the mortgage model
  (`LoanApplications`, `MortgageOrigination`); Provisional terms can rename
  between quarterly releases (the older `LOAN/LoanTypes/MortgageLoans/` module
  already 404s). Re-run the deref lint on each FIBO quarterly release. All
  **BE** modules used by KYB and the **ConsumerLoans**/**Loans** modules used by
  lending are `Release` maturity (lower churn).
- `hasFinanceCharge` / `hasTotalOfPayments` (G4) were **not** exhaustively
  checked against every `FBC` module — treat as *likely* gaps pending that
  check before any upstream PR.
- GLEIF and OMG Commons **term-level** IRIs have historically 404'd even where
  the ontology IRI resolves; the Commons terms used here (`cmns-id:isIdentifiedBy`,
  `cmns-txt:hasTextValue`, `cmns-org:LegalPerson`) were confirmed present in the
  fetched module Turtle. Configure `lint:iris` to fall back to module
  granularity for `cmns-*`/`gleif-*` as the existing caches already do.

---

## 7. Deliverable status

- **KYB exemplar** — refactored and PR'd (`jeswr/solid-kyb#9`, branch
  `feat/fibo-direct`): three minted/imprecise terms replaced by DIRECT
  FIBO/Commons IRIs, the `lint:iris` V-IRI failure fixed, all gates green.
- **Mortgage** — already strongly FIBO-direct; §2 mapping + §5 G1/G2/G6
  extension design provided. No code change needed this pass beyond the
  optional refinements noted.
- **Lending** — §3 mapping + §5 G3/G4 extension design provided; the
  `urn:example:lend#` → published-namespace migration (§3.1) and the
  score-scale DIRECT- typing (§3.4) are the actionable code changes, recorded
  as **remaining work** (follow-up beads to be filed).

---

*Concept demonstration — not affiliated with or endorsed by EDM Council, OMG,
GLEIF, FinCEN, or any named organisation. All personas and data are fictional.*
