# SHACL shapes — pod resource contracts

One closed shape per SPEC §5 resource plus the ZK operand anchor (decision
0012). Source of truth is `shapes/*.ttl`; `scripts/generate-shapes.mjs` bundles
them into `src/shapes/shapes.ts` (committed codegen, freshness-tested) so
`validate()` works everywhere, filesystem or browser. `pnpm run check:shapes`
(root gate) revalidates every shape and fixture; the vitest suite additionally
pins WHICH constraint each violating fixture trips and that the digit budgets
in `src/zk-budgets.ts` equal the `sh:minInclusive`/`sh:maxInclusive` bounds in
the shapes — the budget table and the shapes cannot drift.

## Shape → scene → issuer/writer

| Shape (document) | Resource | Scene | Issuer / writer |
|---|---|---|---|
| `BorrowerProfileShape` (`borrower-profile`) | `/mortgage/profile` | 1 | wallet app (borrower) |
| `EmploymentIncomeCredentialShape` (`employment-income-credential`) | `/credentials/income` | 1, 4 (re-issue) | employment verifier (The Work Number-modelled) |
| `AssetCredentialShape` (`asset-credential`) | `/credentials/assets` | 1 | depository aggregator (Finicity-modelled) |
| `CreditScoreCredentialShape` (`credit-score-credential`) | `/credentials/credit` | 1, 2 (ZK operands) | credit bureau (Equifax-modelled) |
| `ZkOperandAnchorShape` (`zk-operand-anchor`) | `/credentials/*-anchor` | 2 | same issuer as the anchored credential (decision 0012) |
| `AppraisalCredentialShape` (`appraisal-credential`) | `/credentials/appraisal` | 3–4 | AMC (Cotality-modelled property app) |
| `TitleClearCredentialShape` (`title-clear-credential`) | `/credentials/title` | 4–5 | title company (First American-modelled property app) |
| `LoanApplicationShape` (`loan-application`) | `/mortgage/application` | 3 | lender app, prefilled from the pod |
| `UnderwritingDecisionShape` (`underwriting-decision`) | `/mortgage/decision` | 3–4 | lender app; AUS code from the gse app (Freddie-LPA-modelled) |
| `ClosingRecordShape` (`closing-record`) | `/mortgage/closing` | 5 | eClose app (eOriginal-modelled); servicer transfer (Truist-modelled) |

`common` holds the shared support shapes (`PostalAddressShape`,
`OrganizationShape`, `MonetaryAmountShape`, `PropertyShape`,
`AppraisedValueShape`, `AppraisedPropertyShape`) referenced via `sh:node`.

## Modeling decisions

- **Closed shapes everywhere.** Every targeted resource shape is `sh:closed
  true` (test-enforced). Credential envelopes ignore only `sec:proof`
  (eddsa-rdfc-2022 Data Integrity proofs land there); subject shapes ignore
  only `rdf:type`.
- **ZK fields carry their digit budgets in-shape** (decision 0005):
  `mort:monthlyGrossIncomeUsd` 0–9999 (d4), `mort:totalMonthlyDebtUsd` 0–9999
  (d4, on the credit credential — the bureau sees tradeline obligations),
  `mort:creditScoreValue` 300–850 (d3). No cents fields, plain `xsd:integer`.
- **No disclosed derivative of a hidden operand.** The income credential has no
  `schema:baseSalary`; the credit credential has no FIBO `RatingScore` node.
  The closed shapes make this foot-gun a validation error (decision 0005).
- **VC 2.0 envelope**: `credentialSubject` must be an IRI (the borrower WebID —
  holder binding, decision 0012), `validFrom`/`validUntil` are `xsd:dateTime`
  with `sh:lessThan` guarding against inverted validity windows,
  `credentialStatus` is required (Bitstring Status List per issuer; the
  anchor's status points at the ZK rail's own Schnorr-bound list, so no entry
  type is pinned yet).
- **Cross-node equality via `sh:sparql`** (shacl-engine's SPARQL validations
  are registered by `validate()` and `check:shapes`): the appraisal evidence
  must `evaluates` the same property node the `credentialSubject` claims as
  `mort:subjectProperty` — inexpressible in core SHACL.
- **Vacuous-pass guard**: SHACL targeting means a document with no node of the
  expected type conforms trivially. `validate(data, { expect: "<kind>" })`
  fails instead, and `focusNode: "<root IRI>"` binds the guard to the intended
  resource so a decoy typed node cannot stand in for an untyped root. ALWAYS
  pass `expect` when validating untrusted pod RDF, plus `focusNode` whenever
  the root IRI is known (`RESOURCE_TARGET_CLASSES` is test-locked to the
  shapes' `sh:targetClass`).
- **Conditional cash-out** (URLA §4a): `sh:or` requires exactly one
  `CashOutStatus-*` individual on refinance applications and none otherwise.
- **URLA controlled vocabularies are FIBO named individuals** (loan purpose,
  occupancy, amortization type, cash-out status) attached via `dcterms:type`
  with one qualified constraint per facet: FIBO's own
  `hasIntendedLoanPurpose` is an `xsd:string` DatatypeProperty and the OMG
  Commons classifier property (`cmns-cls:isClassifiedBy`) has non-dereferencing
  term IRIs, which `lint:iris` rejects.
- **Dates**: OMG Commons `ExplicitDate` term IRIs do not dereference, so FIBO
  object properties that require structured dates are replaced by
  `dcterms:created`/`dcterms:issued` literals and `mort:closingDate`/
  `mort:searchedThrough` (`xsd:date`). The `xsd:date` datatype constraints also
  catch the `@rdfjs/wrapper` `LiteralFrom.date` regression (malformed dateTime
  lexical) — use `LiteralFrom.dateTime` for dateTime fields.
- **Money** is `schema:MonetaryAmount` (`schema:value` `xsd:decimal` +
  `schema:currency "USD"`); the appraised value is double-typed
  `fibo-fnd-arr-asmt:AppraisedValue` and DISCLOSED, never ZK-proved.
- **`mort:subjectProperty`** (URLA §4a) links application/appraisal/title/
  closing resources to the `fibo-fnd-plc-rp:RealEstate` node — verified against
  the released FIBO LOAN/FND modules, which have no such link.
- **Deferred** to the sm-ea6 vocab round: URLA §5 declarations booleans and
  §4b down-payment source (both join `BorrowerProfileShape` /
  `LoanApplicationShape` once minted).

## Shape IRIs

Shapes live in the `https://solid-mortgage-vocab.vercel.app/shapes#` hash
namespace, served by the vocab site alongside `/mort` (decision 0010) so
`cred:credentialSchema` can reference them once the site deploys.
