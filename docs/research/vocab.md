# RDF Vocabulary Plan — Mortgage Data in Pods

Research date: 2026-07-15. All dereferenceability claims below were verified by fetching the IRI with `Accept: text/turtle` (or the format noted) on this date.

## Recommendation (one paragraph)

FIBO-primary. EDMC/OMG's FIBO covers loans, mortgages, loan applications, underwriting, LTV/DTI, appraisal, borrower/lender roles, and even URLA-aligned controlled vocabularies (loan purpose, property usage, amortization type) at real, dereferenceable `spec.edmcouncil.org` IRIs — and FIBO is owned by EDM Council, the very community this showcase is for. Fill person/address/employment with schema.org, credential envelopes with the W3C VC 2.0 vocab, consent/purpose with DPV, access policies with ODRL, org identity with GLEIF LEI. MISMO has no RDF form (XML Schema only) — treat MISMO/ULAD as a *documentation-level field mapping*, not a namespace. The small residue (title status, decision statuses, integer minor-unit ZK fields) goes in one project vocabulary published as a hash namespace at a real URL we control. All data flows through `@solid/object` + `@rdfjs/wrapper` typed accessors, validated by SHACL, serialised Turtle + JSON-LD only.

## 1. Namespace registry (all verified)

| Prefix | Namespace IRI | Deref (2026-07-15) | Maturity / notes |
|---|---|---|---|
| `fibo-loan-ln-ln` | `https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/` | 200 `text/turtle` | FIBO **Release** |
| `fibo-loan-ln-app` | `https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/` | 200 `text/turtle` | FIBO **Provisional** |
| `fibo-loan-reln-mtg` | `https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/Mortgages/` | 200 `text/turtle` | FIBO **Release** |
| `fibo-loan-reln-org` | `https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/MortgageOrigination/` | 200 `text/turtle` | FIBO **Provisional** |
| `fibo-fbc-dae-dbt` | `https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/` | 200 `text/turtle` | FIBO **Release** |
| `fibo-fbc-dae-crt` | `https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/CreditRatings/` | referenced by LoanApplications | credit rating/report classes |
| `fibo-fnd-arr-asmt` | `https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/` | 200 `text/turtle` | FIBO **Release**; Appraisal terms |
| `fibo-fnd-arr-rt` | `https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Ratings/` | 200 `text/turtle` | FIBO **Release**; rating scores/scales |
| `fibo-fnd-plc-rp` | `https://spec.edmcouncil.org/fibo/ontology/FND/Places/RealProperty/` | 200 `text/turtle` | FIBO **Release** |
| `cred` | `https://www.w3.org/2018/credentials#` | 200 `text/turtle` | VC Data Model 2.0 vocab |
| — (context) | `https://www.w3.org/ns/credentials/v2` | 200 `application/ld+json` | VC 2.0 JSON-LD context |
| `schema` | `https://schema.org/` | term pages 200 (HTML; RDF via `/version/latest/`) | Person/address/employment/property |
| `dpv` | `https://w3id.org/dpv#` | 200 `text/turtle` (via `https://w3id.org/dpv`) | DPV 2.x; consent + purpose |
| `odrl` | `http://www.w3.org/ns/odrl/2/` | 200 `text/turtle` | access/usage policies |
| `gleif-L1` | `https://www.gleif.org/ontology/L1/` | **ontology IRI 200 `text/turtle`; term IRIs 404** | see GLEIF note §3.5 |
| `mort` (project) | to be published, §4 | — | title status, decision statuses, ZK integer fields |

FIBO term-level IRIs dereference individually — verified 200 `text/turtle` for `.../Loans/LoanToValueRatio`, `.../LoanApplications/LoanApplication`, `.../Assessments/Appraisal`, `.../Debt/Borrower`. The IRI-deref lint can HEAD-check FIBO at term granularity; for GLEIF it must fall back to namespace granularity.

Caveat: `LoanApplications` and `MortgageOrigination` are **Provisional** maturity (self-declared via `fibo-fnd-utl-av:hasMaturityLevel` in the fetched Turtle) — terms may move between quarterly releases. Pin the FIBO version in docs (IRIs also resolve versioned, e.g. `?version=master/2025Q1`) and re-run the deref lint on FIBO quarterly releases. Note `LOAN/LoanTypes/MortgageLoans/` (an older module name that appears in search results) now 404s on master/latest — evidence that Provisional module renames really happen.

## 2. FIBO coverage (verified terms, by concern)

| Concern | Verified FIBO terms (local names in the fetched Turtle) |
|---|---|
| Loan core | `fibo-loan-ln-ln:Loan`, `SecuredLoan`, `CollateralizedLoan`, `hasPrincipalAmount`, `hasLoanBalance`, `hasTotalClosingCosts`, `LoanPaymentSchedule`, `PaymentHistory`, `Servicer`, `isServicedBy` |
| LTV / lien | `fibo-loan-ln-ln:LoanToValueRatio`, `CombinedLoanToValueRatio`, `LenderLienPosition`, `PrimaryLienPosition`, `SubordinateLienPosition` |
| Mortgage types | `fibo-loan-reln-mtg:Mortgage`, `ClosedEndMortgageLoan`, `OpenEndMortgageLoan`, `ReverseMortgageLoan`, `LoanSecuredByRealEstate`, `hasInitialFundingDate`, `isARMConvertible` |
| Application | `fibo-loan-ln-app:LoanApplication`, `LoanApplicationStatus`, `LoanApplicationPhase`, `hasApplicationDate`, `hasRequestedAmount`, `hasIntendedLoanPurpose`, `PreApprovalRequest`, `PreApprovalContract` |
| Underwriting | `fibo-loan-ln-app:UnderwritingDecision`, `CreditRiskAssessment`, `BorrowerAssessment`, `hasApprovedAmount`, `UnderwritingAutomation`, `fibo-loan-reln-org:AutomatedUnderwritingSystem` |
| Income / DTI | `fibo-loan-ln-app:BorrowerMonthlyIncome`, `AllBorrowersMonthlyIncome`, `hasGrossIncome`, `IncomeVerificationReport`, `TotalDebtExpenseRatio`, `hasOriginalLoanDebtToIncomeRatio` |
| Credit | `fibo-loan-ln-app:IndividualPersonCreditRating` (subclass of `fibo-fbc-dae-crt:CreditRating`; assessments take `fibo-fbc-dae-crt:CreditReport` as input), `fibo-loan-ln-app:PublicRecord`, `PublicRecordCategory-LienRecord`; scores via `fibo-fnd-arr-rt:RatingScore`, `hasRatingScore`, `hasRating`, `RatingScale`, `hasBestMeasure`/`hasWorstMeasure`, `RatingAgency` |
| Roles | `fibo-fbc-dae-dbt:Borrower`, `Lender`, `Creditor`, `Debtor`; `fibo-loan-ln-ln:Comaker`; `fibo-loan-reln-org:hasOriginatorPerson`, `NMLSR-ID` |
| Property / appraisal | `fibo-fnd-plc-rp:RealEstate`, `RealProperty`, `RealPropertyAppraisal`, `RealPropertyIdentifier`, `PropertyInspectionReport`; `fibo-fnd-arr-asmt:Appraisal`, `AppraisedValue`, `Appraiser`, `hasAppraiser`, `hasDateOfAssessment`, `hasEstimatedValue`, `appliesMethodology`; `fibo-loan-reln-org:isLienOn` |
| Interest / terms | `fibo-fbc-dae-dbt:FixedInterestRate`, `FloatingInterestRate`, `Principal`, `InterestPaymentTerms`, `PrincipalRepaymentTerms`, `Collateral`, `CollateralValueAsOfDate`, `SecurityAgreement` |
| URLA-aligned controlled vocabularies (named individuals) | `fibo-loan-reln-org:MortgageLoanPurpose-RealPropertyPurchase` / `-LoanRefinancing` / `-HomeImprovement` / `-DwellingConstruction` / `-MortgageModification` / `-BusinessOrCommercial`; `PropertyUsage-primaryResidence` / `-secondHome` / `-investment`; `AmortizationType-fixedRate` / `-adjustableRate` (+5 more); `CashOutStatus-CashOut` / `-LimitedCashOut` / `-NoCashOut`; `ChargeCategory-appraisalFee` / `-originationFee` / `-discountPoints` / `-lenderCredits` / `-principal` |

These individuals map 1:1 onto URLA §4a (loan purpose), §4a (occupancy), and Loan Estimate fee categories — strong showcase story: "the EDMA-owned ontology already speaks URLA".

## 3. Other vocabularies

### 3.1 MISMO — XML only, no RDF (confirmed)

The MISMO Reference Model (current v3.x line, e.g. v3.4/v3.6) is an XML Schema representation; MISMO publishes no RDF/OWL artefact and no stable per-field URIs. The redesigned URLA (Fannie Mae Form 1003) is mapped to MISMO v3.4 via the ULAD (Uniform Loan Application Dataset) mapping document. **Plan:** FIBO-primary in data; ship `docs/mismo-mapping.md` mapping each pod/credential field → MISMO v3.4 data point name + ULAD/URLA field ID (documentation only, no IRIs minted). This is the artefact EDMA member orgs need for the "real product" phase, since their LOS/AUS integrations speak MISMO.

### 3.2 W3C VC Data Model 2.0

Vocab `https://www.w3.org/2018/credentials#` dereferences to Turtle and defines (verified in the fetched file): `VerifiableCredential`, `VerifiablePresentation`, `credentialSubject`, `issuer`, `validFrom`, `validUntil`, `credentialSchema`, `credentialStatus`, `evidence` / `CredentialEvidence`, `termsOfUse`, `holder`, `relatedResource`, `confidenceMethod`, `renderMethod`, `EnvelopedVerifiableCredential`. Credentials are JSON-LD with context `https://www.w3.org/ns/credentials/v2` (dereferences, `application/ld+json`) — so every VC is *already* RDF and loads into the same `@rdfjs/wrapper` accessors as pod data. Use `cred:evidence` to link a credential to the underlying report resource (e.g. an `IncomeVerificationReport` in the pod); use `credentialSchema` to point at our published SHACL/JSON-schema artefacts.

### 3.3 schema.org

Term IRIs dereference (HTML; full RDF releases available). Verified: `schema:MortgageLoan`, `schema:LoanOrCredit`, `schema:MonetaryAmount`, `schema:Occupation`, `schema:employee`, `schema:baseSalary`, `schema:PostalAddress`, `schema:BankAccount`, `schema:SingleFamilyResidence`. Note schema.org's finance terms (`MortgageLoan`, `LoanOrCredit`) originate from the FIBO collaboration — use them as *secondary* types alongside FIBO for search-engine-friendly JSON-LD, but FIBO is the normative model. Use schema.org normatively only where FIBO is silent: person names/contact details, postal addresses, employment relationship (`worksFor`, `jobTitle`, `baseSalary`), dwelling types.

### 3.4 DPV and ODRL

- DPV 2.x at `https://w3id.org/dpv` (200, Turtle, 689 KB). Verified terms: `dpv:Consent`, `dpv:ConsentGiven` / `ConsentWithdrawn` / `ConsentRevoked` / `ConsentExpired` (+ full consent-status taxonomy), `dpv:ConsentRecord`, `dpv:ConsentNotice`, `dpv:Purpose`, `dpv:hasPurpose`, `dpv:hasLegalBasis`, `dpv:hasDataSubject`, `dpv:hasProcessing`, `dpv:hasRecipient`, `dpv:IdentityVerification`, `dpv:FraudPreventionAndDetection`, `dpv:AgeVerification`. **Gap:** no credit-checking/underwriting purpose concept in core DPV 2 → mint `mort:MortgageUnderwritingPurpose` as a `skos:Concept` typed `dpv:Purpose` in the project vocab. Use DPV for the consent-receipt resource each stakeholder app writes when the borrower grants access.
- ODRL 2.2 at `http://www.w3.org/ns/odrl/2/` (200, Turtle): `odrl:Policy` / `Permission` / `Prohibition` / `Duty` for human-readable usage policies attached via `cred:termsOfUse`. Enforcement stays WAC/ACP (via `@solid/object` wrappers per house rule); ODRL expresses the *usage* terms WAC cannot.

### 3.5 GLEIF LEI / vLEI

GLEIF publishes real RDF ontologies: `gleif-L1` (`https://www.gleif.org/ontology/L1/`, 200 Turtle, defines `LegalEntity`, `LegalEntityIdentifier`, `LegalEntityIdentifierRegistryEntry`), plus `gleif-base` (names/addresses/entity statuses) and L2 (who-owns-whom). **Term-level IRIs do not dereference** (`.../L1/LegalEntity` → 404); only the ontology IRI resolves — configure the deref lint accordingly. Identify each stakeholder organisation (lender, bureau, title company, AMC) by its LEI. vLEI credentials themselves are KERI/ACDC-format, not W3C JSON-LD VCs — out of scope for the RDF model; the showcase represents org identity as `gleif-L1:LegalEntity` + LEI string, with the GLEIF search permalink (`https://search.gleif.org/#/record/<LEI>`) as a human-readable link. Real LEIs for demo-brand orgs don't exist → demo orgs are blank nodes or WebIDs on domains we control, with LEI attached only when a real LEI exists.

## 4. Project vocab pattern (`mort:`)

Convention (no IRIs minted until published):

| Aspect | Decision |
|---|---|
| Namespace | Hash namespace at a real URL we control: `https://jeswr.github.io/solid-mortgage/vocab#` (GitHub Pages; survives Vercel project renames) — final host confirmed in SPEC.md. Vercel-domain alternative acceptable if the showcase gets a stable custom domain. |
| Artefacts | One source of truth `vocab/mort.ttl` in-repo → published as Turtle + JSON-LD + HTML (pyLODE) at the namespace URL. Hash namespace ⇒ single fetch, no conneg infrastructure needed. |
| Governance | Every term carries `rdfs:isDefinedBy` + `skos:definition`; `owl:versionInfo` per release; CI job asserts every `mort:` term used in code/shapes exists in the published file; the repo's 7-day-cache IRI-deref lint covers `mort:` like any other namespace. |
| Scope discipline | A term enters `mort:` only after checking FIBO/schema.org/DPV — the vocab is a *residue*, not a parallel model. Each `mort:` term's comment names the FIBO/MISMO concept it approximates. |
| Later | Optional `w3id.org` permanent redirect — requires an upstream PR to `perma-id/w3id.org` → **approval gate applies; do not open unprompted**. Long-term home could be an EDMA-hosted namespace in the productisation phase. |

Known residue (candidate terms, to be minted at publication): title status (`TitleClearCredential`, `titleStatus` + SKOS concepts clear/clouded), underwriting decision statuses (approved / approved-with-conditions / denied / suspended — FIBO has the `UnderwritingDecision` class but no status individuals in the fetched module), credential subtypes (`EmploymentIncomeCredential`, `AssetCredential`, `CreditScoreCredential`, `AppraisalCredential`, `TitleClearCredential`), ZK integer fields (§6), `MortgageUnderwritingPurpose` (dpv:Purpose), URLA fields FIBO lacks (e.g. declarations section booleans), marital status (neither schema.org nor core DPV has a data property).

## 5. Concrete data model

All resources: Turtle in the pod (JSON-LD for credentials), read/written via `@solid/object` + `@rdfjs/wrapper` typed accessors, one SHACL shape each in `packages/data-model/shapes/`. Borrower is identified by WebID; `credentialSubject.id` = WebID. Money via `schema:MonetaryAmount` (`schema:value`, `schema:currency`) for display + `mort:*Cents` integer companion where ZK-provable (§6).

| # | Resource (pod path sketch) | Primary vocab (real, verified IRIs) | Project vocab (`mort:`) | SHACL shape |
|---|---|---|---|---|
| 1 | Borrower profile `/profile`, `/mortgage/profile` | WebID profile + `schema:Person`, `schema:name`, `schema:birthDate`, `schema:telephone`, `schema:email`, `schema:address` → `schema:PostalAddress` (`streetAddress`, `addressLocality`, `addressRegion`, `postalCode`); typed `fibo-fbc-dae-dbt:Borrower` within an application context | `mort:maritalStatus` (SKOS), URLA declarations booleans | `BorrowerProfileShape` |
| 2 | Employment + income VC `/mortgage/credentials/income` | `cred:VerifiableCredential`; subject WebID; `schema:worksFor` → `schema:Organization` (+ `gleif-L1:LegalEntity`/LEI), `schema:jobTitle`, `schema:startDate`, `schema:baseSalary` → `schema:MonetaryAmount`; `fibo-loan-ln-app:hasGrossIncome`, `fibo-loan-ln-app:BorrowerMonthlyIncome`; `cred:evidence` → `fibo-loan-ln-app:IncomeVerificationReport` | `mort:EmploymentIncomeCredential`, `mort:monthlyGrossIncomeCents` (ZK) | `EmploymentIncomeCredentialShape` |
| 3 | Asset / bank-balance VC `/mortgage/credentials/assets` | `cred:VerifiableCredential`; `schema:BankAccount` + `schema:provider` (org w/ LEI); balance as `schema:MonetaryAmount`; `cred:validFrom`/`validUntil` as statement window | `mort:AssetCredential`, `mort:availableBalanceCents` (ZK), `mort:accountLast4` | `AssetCredentialShape` |
| 4 | Credit-score VC `/mortgage/credentials/credit` | `fibo-loan-ln-app:IndividualPersonCreditRating`; `fibo-fnd-arr-rt:hasRatingScore` → `RatingScore` on a `RatingScale` with `hasBestMeasure` 850 / `hasWorstMeasure` 300; issuer bureau = `fibo-fnd-arr-rt:RatingAgency` (+LEI); `fibo-loan-ln-app:PublicRecord` for derogatories | `mort:CreditScoreCredential`, `mort:creditScoreValue` (ZK, plain `xsd:integer`), `mort:scoreModel` (SKOS: FICO-8 etc. — no real IRI exists) | `CreditScoreCredentialShape` |
| 5 | Property + appraisal VC `/mortgage/credentials/appraisal` | `fibo-fnd-plc-rp:RealEstate` + `RealPropertyIdentifier` + `schema:PostalAddress` (+ `schema:SingleFamilyResidence` secondary type); `fibo-fnd-plc-rp:RealPropertyAppraisal` / `fibo-fnd-arr-asmt:Appraisal`, `hasAppraiser` → `Appraiser`, `hasDateOfAssessment`, `hasEstimatedValue` → `AppraisedValue`, `appliesMethodology`; `fibo-loan-reln-org:PropertyUsage-*`, `hasNumberOfDwellingUnits` | `mort:AppraisalCredential`, `mort:appraisedValueCents` (ZK), `mort:appraiserLicenseId` | `PropertyShape`, `AppraisalCredentialShape` |
| 6 | Title-clear VC `/mortgage/credentials/title` | property ref as #5; encumbrances via `fibo-loan-ln-app:PublicRecordCategory-LienRecord`; expected position `fibo-loan-ln-ln:PrimaryLienPosition`; issuer org + LEI | **mostly project vocab** — `mort:TitleClearCredential`, `mort:titleStatus` (SKOS clear/clouded), `mort:searchedThrough` (date). No FIBO clear-title concept found in released modules | `TitleClearCredentialShape` |
| 7 | Loan application (URLA subset) `/mortgage/application` | `fibo-loan-ln-app:LoanApplication`, `hasApplicationDate`, `hasRequestedAmount`, `hasIntendedLoanPurpose` → `fibo-loan-reln-org:MortgageLoanPurpose-*` individuals; `PropertyUsage-*`; `AmortizationType-*`; `CashOutStatus-*`; borrower `fibo-fbc-dae-dbt:Borrower`; property as #5; loan type `fibo-loan-reln-mtg:ClosedEndMortgageLoan`; originator `fibo-loan-reln-org:hasOriginatorPerson` + `NMLSR-ID`; status `fibo-loan-ln-app:LoanApplicationStatus` | `mort:loanTermMonths`, declarations booleans, down-payment source (SKOS) | `LoanApplicationShape` |
| 8 | Underwriting decision `/mortgage/decision` (lender-written) | `fibo-loan-ln-app:UnderwritingDecision`, inputs `CreditRiskAssessment` / `BorrowerAssessment`, `hasApprovedAmount`, `TotalDebtExpenseRatio`, `hasOriginalLoanDebtToIncomeRatio`, `fibo-loan-ln-ln:LoanToValueRatio`; `fibo-loan-reln-org:AutomatedUnderwritingSystem` if AUS-assisted | `mort:decisionStatus` (SKOS ×4), `mort:underwritingCondition` | `UnderwritingDecisionShape` |
| 9 | Closing record `/mortgage/closing` | `fibo-loan-reln-mtg:Mortgage` (executed loan), `hasInitialFundingDate`; `fibo-loan-ln-ln:hasPrincipalAmount`, `hasTotalClosingCosts`, `PrimaryLienPosition`; rate `fibo-fbc-dae-dbt:FixedInterestRate`/`FloatingInterestRate`; fee lines via `fibo-loan-reln-org:ChargeCategory-*` individuals; servicer `fibo-loan-ln-ln:isServicedBy` | `mort:closingDate` (if distinct from funding date), `mort:recordingReference` | `ClosingRecordShape` |

Shape conventions: `sh:closed true` with `sh:ignoredProperties` for VC-envelope terms; every ZK field constrained `sh:datatype xsd:integer` + explicit `sh:minInclusive`/`sh:maxInclusive` (§6); controlled-value fields constrained `sh:in (<FIBO individuals>)`; validate with pyshacl in CI (best-tool-per-task rule).

## 6. ZK range-proof fields and credential structuring

The workhorse predicates for mortgage underwriting, and where the values live:

| Hidden value | Credential | Threshold proof shape (integer-only, no division) |
|---|---|---|
| `mort:monthlyGrossIncomeCents` | #2 income | `income >= T` |
| `mort:creditScoreValue` | #4 credit | `score >= 620` (etc.) |
| `mort:availableBalanceCents` | #3 assets | `balance >= downPayment + reserves` |
| DTI inputs: income (#2) + `mort:totalMonthlyDebtCents` (in #2 or a liabilities credential) | #2 (+#7 liabilities) | `debt * 10000 <= income * dtiBps` — linear inequality over two committed values; never store a precomputed DTI as the provable fact |
| `mort:appraisedValueCents` | #5 appraisal | LTV: `loanAmountCents * 10000 <= appraisedValueCents * ltvBps` (loan amount is public in the application; appraisal can stay hidden from parties other than the lender) |

Structuring rules so a sparq-engine threshold proof works without revealing the value:

1. **One provable numeric per quad.** The value is the object of a single triple (`<cred-subject-node> mort:monthlyGrossIncomeCents "850000"^^xsd:integer`) so the commitment leaf containing it can be hidden while sibling quads are disclosed. Matches the workspace's modular Merkle-commitment design (commit-shape parameterised; quads as leaves).
2. **Canonical integer lexical form.** `xsd:integer`, no sign/leading zeros; money in minor units (cents). Keeps circuits in integer arithmetic — no decimals/floats (per sparql_noir priorities; noir_IEEE754 exists but is not on the showcase's critical path).
3. **No disclosed derivative of a hidden value.** No income-band string, no rounded copy, no DTI field computed from hidden inputs — a disclosed copy defeats hiding, and per the workspace rule (*don't ZK-prove revealed properties*) anything disclosed is verified externally, never in-circuit.
4. **Units and scale fixed by the shape, not the data.** The SHACL shape (referenced from `cred:credentialSchema`) pins datatype, unit (cents, points) and bounds (`sh:minInclusive 30000`/`sh:maxInclusive 85000` for score×100? — no: score is a plain 300–850 integer). Verifier learns the semantics from the credential *type* + published shape; prevents unit-swap attacks and gives the range circuit its bit-width statically.
5. **Cleartext envelope, external checks.** `issuer`, `validFrom`/`validUntil`, credential type, subject WebID are always disclosed; verifier checks signature, freshness, and issuer trust (LEI-anchored) outside the circuit. The ZK statement is only `committed(value) ⋈ threshold`.
6. **Issuer-per-fact.** Employer/payroll signs income; bureau signs score; bank signs balance; AMC signs appraisal. One credential per issuer keeps trust roots honest and lets proofs combine credentials (DTI = income cred + liabilities data) — the sparq engine's multi-source commitment/signature modularity covers this.
7. **Why sparq and not BBS predicates:** the W3C `bbs-2023` Data Integrity cryptosuite (Candidate Recommendation Draft, 2026-04-07) provides selective disclosure and unlinkable derived proofs only — no range/predicate proofs over hidden values. So: bbs-2023 (or plain `eddsa`) handles disclosure-only flows; threshold checks route through the sparq ZKP-over-VC engine against the same committed dataset.
8. **Holder binding** stays outside the circuit: `credentialSubject.id` = WebID; the presenting session proves WebID control via Solid-OIDC/DPoP.

## 7. Decisions needed (for SPEC.md)

| Decision | Lean |
|---|---|
| Project vocab host | `jeswr.github.io/solid-mortgage/vocab#` now; revisit EDMA-hosted namespace at productisation |
| FIBO version pinning | Pin `master/latest` snapshot per release in docs; deref-lint FIBO quarterly (Provisional modules can rename) |
| schema.org role | Secondary/display typing only; FIBO normative |
| vLEI depth | LEI-as-identifier only for the showcase; full KERI/ACDC vLEI out of scope |
| Demo-org identity | WebIDs on domains we control + blank-node orgs; no fabricated LEIs |

## Sources

- FIBO Loans ontology (Turtle, fetched): https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/
- FIBO LoanApplications ontology (Turtle, fetched): https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/
- FIBO Mortgages ontology (Turtle, fetched): https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/Mortgages/
- FIBO MortgageOrigination ontology (Turtle, fetched): https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/MortgageOrigination/
- FIBO Debt ontology (Turtle, fetched): https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/
- FIBO Assessments ontology (Turtle, fetched): https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/
- FIBO Ratings ontology (Turtle, fetched): https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Ratings/
- FIBO RealProperty ontology (Turtle, fetched): https://spec.edmcouncil.org/fibo/ontology/FND/Places/RealProperty/
- FIBO home / governance (EDM Council): https://spec.edmcouncil.org/fibo/ and https://github.com/edmcouncil/fibo
- MISMO Reference Model (XML Schema based): https://www.mismo.org/standards-resources/residential-specifications/reference-model
- MISMO standards & resources: https://www.mismo.org/standards-resources
- Fannie Mae URLA / ULAD (Form 1003 ↔ MISMO v3.4 mapping): https://singlefamily.fanniemae.com/delivering/uniform-mortgage-data-program/uniform-residential-loan-application
- Freddie Mac URLA/ULAD: https://sf.freddiemac.com/tools-learning/uniform-mortgage-data-program/ulad
- W3C VC Data Model 2.0 vocabulary (Turtle, fetched): https://www.w3.org/2018/credentials#
- W3C VC 2.0 JSON-LD context (fetched): https://www.w3.org/ns/credentials/v2
- W3C VC Data Integrity BBS cryptosuite (CRD 2026-04-07; selective disclosure only): https://www.w3.org/TR/vc-di-bbs/
- schema.org terms (fetched 200): https://schema.org/MortgageLoan, https://schema.org/LoanOrCredit, https://schema.org/MonetaryAmount, https://schema.org/BankAccount, https://schema.org/PostalAddress, https://schema.org/baseSalary, https://schema.org/SingleFamilyResidence
- DPV 2.x (Turtle, fetched): https://w3id.org/dpv
- ODRL 2.2 vocabulary (Turtle, fetched): http://www.w3.org/ns/odrl/2/
- GLEIF L1 ontology (Turtle, fetched; term IRIs 404): https://www.gleif.org/ontology/L1/
- GLEIF LEI model in RDF: https://www.gleif.org/en/lei-data/semantic-representation-of-the-lei/lei-model-in-rdf-resource-description-framework
- GLEIF L1 ontology documentation: https://www.gleif.org/ontology/pylodev2/GLEIF_L1.html
