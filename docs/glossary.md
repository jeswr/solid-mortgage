# Glossary and copy rules — Solid Mortgage Showcase

This is the controlled vocabulary for all demo copy: app UI, tour chapters, guided steps, the overlay, and narration.
The audience is EDMA members: lenders, GSEs, credit bureaus, data and verification providers, title and appraisal firms, and regulators' staff.
**Use the preferred term. Never use the terms in the "Use instead of" column.** If a term you need is missing, add it here with a source before you use it.
Source keys (`[R…]` repo, `[E…]` external) resolve in the source list at the end. External sources were checked on 2026-10-14.

## 1. Style rules for demo copy

1. **Plain English, one idea per sentence, about 20 words or fewer.** Lead with what happens and who does it. Drop asides, em-dash chains, and "the point is…" framing.
2. **Active voice, with a named actor.** Write "The lender orders the appraisal", not "The appraisal is ordered". Write "Alex gives the lender access", not "access is granted".
3. **Name people and organisations consistently.** Write "Alex" in the story and "the borrower" in rules and explanations. Name each organisation by its role ("the lender", "the employment verification provider", "the servicer"). Do not use "persona", "visitor" or "pod owner" in story copy. Do not use "seat" for a role.
4. **Use the "modelled on X" framing exactly once per surface,** in the form "*[Role], modelled on [Organisation]*", for example "Lender, modelled on Bank of America". After that, use the role. Never write "BofA-modelled", "Truist-modelled servicer" or "the Bank of America lender" in running text. Keep the concept-demo and non-affiliation notices as they are.
5. **Use the regulator's or GSE's own term,** with its acronym on first use: "Loan Estimate", "Closing Disclosure", "verbal verification of employment (VOE)", "automated underwriting system (AUS)", "clear to close". Cite the rule by section, for example "12 CFR 1026.19(e)", not "TRID's window".
6. **Be legally precise.**
   - A prequalification is not an offer, an approval or a commitment.
   - A Loan Estimate is a disclosure of estimated terms. It is not an approval or an offer.
   - An AUS returns a recommendation. The lender's underwriter makes the decision.
   - The borrower does not hold the eNote's Authoritative Copy.
   - "Revoke a credential" (status list) and "revoke access" (permission) are different acts. Never use one to mean the other.
7. **Mark figures as illustrative, and do not reuse industry statistics as loan figures.** Write numbers as "$7,000 a month" and "credit score of 620 or higher". Use "≥" only in technical panels. Every rate or amount is "illustrative". Never present an industry average (such as the ~$11,600 cost to originate) as a loan figure (such as closing costs). Any written rate quote shown before a Loan Estimate carries the Reg Z statement "Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before choosing a loan." [E3]
8. **No invented metaphors or slogans.** Replace them with the process stage they stand for:
   - "Fill the vault" → **"Verify income, assets and credit"**
   - "Shop without undressing" → **"Prequalify without disclosing income or credit score"**
   - "One-click application" → **"Apply with data from the pod"**
   - "Nothing goes stale" → **"Re-verify employment before closing"**
   - "Close and stay in control" → **"Close the loan and transfer servicing"**

   Also avoid: "walk away clean", "no PII left behind", "trust inversion", "real industry plumbing", "green tick goes grey", "the whole pitch", "payoff", "days back".
9. **No internal engineering jargon in visitor-facing copy.** These words are banned: "rail", "seat", "surface", "fail-closed", "evidence gate", "operand anchor", "Tier A/B", "nine-gate", "dual-signed", "honesty panel", "freshness", "receipted", "decision 000N", "scene-5".
   - Technical detail goes in a clearly labelled "How it works" or "Limitations" panel. There, use the standard term from §2.5–2.6.
   - Never cite internal decision numbers on screen.
10. **Do not overclaim.** Write "controls access to", not "owns". Write "consumer-permissioned data", not "borrower-owned data". Do not claim encryption or "user-held keys" unless the build implements them. Write "simulated" for anything not real.
11. **Explain each Solid concept in one line on first use, in financial-services terms:**
    - **Pod**: "a personal data store the borrower controls; organisations read from it only with permission".
    - **WebID**: "a web address that identifies a person or organisation, like a login identity anyone can check".
    - **Web Access Control**: "the pod's permission list: who may read or write each item".
    - **Verifiable credential**: "a digitally signed verification report that any party can check without calling the issuer".
    - **Zero-knowledge proof**: "a cryptographic proof that a figure meets a threshold without revealing the figure".
    - **Consent receipt**: "the borrower's copy of a record that they gave or withdrew access".
12. **Keep button labels to a verb and an object,** for example "Issue credential", "Run AUS", "Grant access", "Revoke access", "Mark clear to close". Do not add parentheses ("Re-issue (freshness)") or claims ("one click").

## 2. Glossary

### 2.1 Mortgage process and regulation

| Preferred term | Definition | Use instead of | Source |
|---|---|---|---|
| **prequalification** (verb: *prequalify*) | An estimate of how much a borrower may be able to borrow, based on information that the lender has not underwritten. It is not a commitment to lend. | "qualified", "you qualify", "pre-qual", "competing offers", "Shop without undressing", "compare without disclosure" | [E1]; [E4] comment 2(f)-3; [R1] §1 row 1 |
| **meets the lender's prequalification criteria** | The correct outcome wording for a successful prequalification check. | "Qualified", "Qualified — values undisclosed", "Both lenders qualified Alex" | [E1]; [E4] |
| **does not meet the prequalification criteria** | The correct negative outcome wording. Under Reg B, a creditor that evaluates the information and declines may have taken an application, which triggers an adverse action notice. | "Not qualified" | [E4] comment 2(f)-3; §1002.9 |
| **preapproval** | The lender has verified credit, income, assets and employment, and issues a letter for an amount, subject to conditions. The demo does not show this stage. | using "prequalification" and "preapproval" interchangeably | [E1]; [R1] §1 row 2 |
| **illustrative rate quote** | A sample rate that the lender shows after prequalification. In the demo it is not an offer of credit and not a Loan Estimate. | "offer", "competing offers", "Quote unlocked" | [E3] §1026.19(e)(2)(ii) |
| **application** | For TRID loans, an application is the borrower's name, income, SSN, property address, estimated property value and loan amount sought. Receiving these six items triggers the Loan Estimate. | "one-click application", "start an application with the primary lender" (where it means "submit") | [E2] §1026.2(a)(3) |
| **Uniform Residential Loan Application (URLA)** | The standard GSE application form (Fannie Mae Form 1003 / Freddie Mac Form 65). Its data is submitted as the ULAD dataset on MISMO v3.4. | "the lender's standard application form", "URLA subset" (say which sections) | [E11]; [R1] §1 row 3 |
| **prefill** | The application fields are filled from data the borrower authorised the lender to read. | "re-plumbed", "the experience the biggest digital lenders already sell" | [R-org] row 1 |
| **Loan Estimate (LE)** | A disclosure of estimated loan terms and costs. It must be delivered or placed in the mail within three business days after the lender receives the application. It is not an approval or an offer. | "the Loan Estimate lands", "estimate derived from that decision", showing "Decision: Approved with conditions" inside the Loan Estimate | [E3] §1026.19(e)(1)(iii) |
| **intent to proceed** | The borrower tells the lender, after receiving the Loan Estimate, that they want to go ahead. Until then the lender may charge only a credit report fee. | — (use this term if the demo shows the step) | [E3] §1026.19(e)(2)(i) |
| **processing** | Assembling the loan file: ordering the credit report, verifications, appraisal and title, and collecting missing documents. | "chasing", "nothing to chase" | [R1] §1 row 5 |
| **loan file** | The complete set of application data, disclosures, verifications and third-party reports for one loan. | "evidence", "the file's evidence", "mortgage file", "mortgage folder" | [R1] §3; [E12] |
| **underwriting** | The lender's assessment of credit risk and loan eligibility, leading to a credit decision. | "decides from your data", "risk-scores" | [R1] §1 rows 12–13 |
| **conditional approval** (status: *approved with conditions*) | The underwriter approves the loan, subject to listed conditions being satisfied. | "Decision stands", "Approve" (when the meaning is the lender's decision) | [E19]; [R-ttl] decision status |
| **conditions** (prior-to-closing conditions) | Items the underwriter requires before the loan can close, for example an updated VOE or a title cure. | "evidence gate", "Decision blocked" | [E19]; [R1] §1 row 13 |
| **clear to close (CTC)** | All conditions are satisfied and the loan can be scheduled for closing. | "Approved, clear to close" (approval and CTC are separate steps), "clears the file" | [E19]; [R1] §1 row 13 |
| **pre-closing re-verification** | Re-confirming employment, credit and other items shortly before closing. | "freshness check", "freshness re-check", "pre-close freshness check", "Nothing goes stale" | [R1] §1 row 14; [E9] |
| **allowable age of credit documents** | Credit documents must be no more than four months old on the note date. | "stale", "goes stale", "freshness" | [E9] B1-1-03 |
| **Closing Disclosure (CD)** | A disclosure of the final loan terms and costs. The borrower must receive it at least three business days before consummation. | "lands three days early" | [E3] §1026.19(f)(1)(ii) |
| **consummation** | The time the borrower becomes contractually obligated on the loan. Use this term for TRID timing. | "close" (in timing statements) | [E2] §1026.2(a)(13) |
| **closing** | The event where loan documents are signed, funds are disbursed and the security instrument is recorded. | "Sign once", "close digitally" | [R1] §1 row 16 |
| **eClosing** | A closing where some or all documents are signed electronically. It can include remote online notarization (RON). | "eClose ceremony", "signing ceremony", "real industry plumbing" | [R1] §1 row 16; [E17] |
| **eNote** | An electronic promissory note. It is a transferable record under ESIGN §201 / UETA §16 and is registered on the MERS eRegistry. | "closing record" (when the meaning is the note) | [E17]; [R1] §1 row 16 |
| **Authoritative Copy** (of an eNote) | The single controlled copy of the eNote, held in the Controller's eVault. The borrower does not hold it. | "you hold the authoritative copy of your loan" → say "you hold a copy of your closing documents" | [E17] |
| **servicing transfer** | The move of loan servicing from the transferor servicer to the transferee servicer. | "the loan transfers to a servicer", "Servicing transfers — on Alex's terms" | [E6] §1024.33 |
| **notice of servicing transfer** | Notices to the borrower: from the transferor at least 15 days before the effective date of transfer, and from the transferee no more than 15 days after it. | "goodbye/hello letter" (use only as a secondary gloss) | [E6] §1024.33(b) |
| **closing costs** | Charges the borrower pays at closing, itemised on the Loan Estimate and Closing Disclosure. | reusing "$11,600" (that figure is the lender's cost to originate) | [E3]; [R-anchors] |
| **cost to originate** | The lender's average cost to produce one loan. | "closing costs" | Freddie Mac 2024 Cost to Originate Study, cited in [R1] §4 |
| **adverse action** | A refusal to grant credit in substantially the amount or on substantially the terms requested. It requires a notice to the applicant. | "Not qualified", "refused" (in borrower-facing outcomes) | [E4] §1002.2(c), §1002.9 |
| **TRID** (TILA-RESPA Integrated Disclosure rule) | The Reg Z rule that sets the content and timing of the Loan Estimate and Closing Disclosure. | "TRID window", "regulatory window" (say "three business days after application") | [E3] |

### 2.2 Parties and roles

| Preferred term | Definition | Use instead of | Source |
|---|---|---|---|
| **borrower** | The person who applies for and is obligated on the mortgage. In story copy, use "Alex". | "pod owner", "persona", "visitor", "you are Alex" (once in the intro is fine) | [R1] §2 |
| **applicant** / **consumer** | The regulatory terms: "applicant" in Reg B; "consumer" in Reg Z and §1033. Use them only when quoting a rule. | — | [E4] §1002.2(e); [E2]; [E8] |
| **lender** | The creditor that originates the loan. In the demo there is a primary lender and a second lender. | "origination portal", "primary lender's seat", "thin pre-qual surface", "proof-only lender", "shopping surface" | [E2] §1026.2(a)(17); [R-org] |
| **loan officer** | The lender's employee who takes the application and manages the loan through to closing. The licensing term is "mortgage loan originator (MLO)". | "originator" (for the person), "the originator's side" | Reg Z §1026.36(a) [E3-part]; [R1] §2 |
| **processor** / **underwriter** | Lender staff who assemble the loan file (processor) and make the credit decision (underwriter). | "the officer clears the file" (an underwriter clears conditions; the loan officer is notified) | [R1] §2 |
| **verification provider** | A company that supplies VOE/VOI or VOA reports. The GSEs call them "verification report vendors" (Fannie Mae DU) or "AIM service providers" (Freddie Mac). | "verifier", "Three verifiers", "issuer flows", "employment verifier" | [E9] DU validation vendors; [E10] AIM |
| **consumer reporting agency (CRA)** / **credit bureau** | A company that compiles consumer reports, such as Equifax, Experian or TransUnion. | "bureau issuer" | [E5] §1681a(f) |
| **data aggregator** | Under §1033, a company retained by an authorised third party to access the consumer's account data. In the demo, this is the asset verification provider modelled on Finicity. | "account-data aggregator", "open-banking issuer" | [E8] §1033.131 |
| **data provider** | Under §1033, the bank or card issuer that holds the consumer's account data. | "the source", "the bank" (fine in story copy) | [E8] §1033.111(c) |
| **authorized third party** | Under §1033, a third party that has followed the authorization procedures to access the consumer's data on the consumer's request. | "a party Alex chooses" (fine in story copy) | [E8] §1033.131, §1033.401 |
| **appraiser** / **appraisal management company (AMC)** | The appraiser values the property. The AMC orders the appraisal on the lender's behalf to keep the appraiser independent. | "property appraisal provider" | [R1] §2 |
| **title company** / **title insurer** | Searches public records, issues the title commitment, and insures the lender's and owner's title. | "title insurance provider" (acceptable), "title clearance" | [E18]; [R1] §2 |
| **settlement agent** | Conducts the closing, disburses funds and records documents. | "digital closing platform" (that is the eClosing technology provider) | [R1] §2 |
| **servicer** (transferor / transferee) | The company that collects payments and administers the loan after closing. | "old lender" (when the meaning is the transferor servicer), "new company" | [E6] |
| **GSE** (Fannie Mae, Freddie Mac) | The government-sponsored enterprises that buy conforming loans and run the DU and LPA systems. | "the GSE model", "the GSE role" | [R1] §2 |
| **regulator** / **examiner** | Agency staff who supervise compliance. The demo's "Examiner View" is unbranded. | "regulator lens" (internal only) | [R-org] row 11 |

### 2.3 Verification and underwriting

| Preferred term | Definition | Use instead of | Source |
|---|---|---|---|
| **verification of employment (VOE)** | Confirmation, from the employer or a payroll data provider, that the borrower is employed. | "employment check", "attested employment" | [R1] §1 row 7 |
| **verbal verification of employment (verbal VOE)** | A VOE obtained no more than 10 business days before the note date (120 calendar days if self-employed). | "freshness rule", "VOE freshness" | [E9] B3-3.1-04 |
| **verification of income (VOI)** / **VOIE** | Confirmation of income amounts. VOIE is combined income and employment. | "employment+income" (write "employment and income") | [R1] §1 row 7 |
| **verification of assets (VOA)** | A report of account balances and history, obtained with the borrower's permission. | "balances attested", "assets verified" (fine in story copy) | [R1] §1 row 8 |
| **credit report** (tri-merge / Residential Mortgage Credit Report) | A merged report from the three national bureaus, with scores. | "credit-score credential" (when the meaning is the report) | [R1] §1 row 6; [E5] |
| **credit score** / **representative credit score** | The score used to qualify, generally the middle of three. "Representative credit score" is Fannie Mae's term. | "score" (alone, in formal copy), "Credit score (soft, VC-attested)" | [R1] §1 row 6; Fannie Mae Selling Guide B3-5.1-02 |
| **credit inquiry** (hard / soft) | A request for a consumer's credit report. A soft inquiry does not affect the score. | "credit pull" (acceptable in story copy), "soft" (alone, unexplained) | [E1] (soft check at prequalification) |
| **permissible purpose** | The FCRA ground on which a consumer report may be obtained, for example a credit transaction the consumer initiated. | — | [E5] §1681b |
| **automated underwriting system (AUS)** | The GSE risk-assessment system: Desktop Underwriter (DU, Fannie Mae) or Loan Product Advisor (LPA, Freddie Mac). | "Automated Underwriting Service", "underwriting service", "underwriting console", "AUS seat" | [E9]; [E10]; [R-fibo] (`AutomatedUnderwritingSystem`) |
| **AUS recommendation** — LPA: *Accept* / *Caution*; DU: *Approve/Eligible*, *Approve/Ineligible*, *Refer with Caution*, *Out of Scope* | The AUS risk result. The demo models LPA, so use "Accept" and "Caution". | "Approve", "Refer" (DU terms mixed with LPA terms), "Fail-closed: refer" | [E10]; [E9] B3-2-01 |
| **unable to validate** (AUS message) | Shown when a verification report cannot be relied on. The lender must obtain a new verification. This is a message, not a risk class. | "Refer — the evidence cannot be relied on", "evidence gate" | [E9] DU validation service (validation messages); [E10] AIM |
| **AUS findings** — DU: *Underwriting Findings report*; LPA: *Feedback Certificate* | The report listing the recommendation, eligibility and documentation conditions. | "full findings report", "decision document" | [E9] B3-2-11; [E10] |
| **Asset and Income Modeler (AIM)** | Freddie Mac's LPA capability that assesses income, assets and employment from digital data. | "Fannie AIM" (AIM is Freddie Mac's) | [E10] |
| **DU validation service** / **Day 1 Certainty** | Fannie Mae's programme that validates income, assets and employment from digital reports. Day 1 Certainty is the broader certainty programme; it can cut up to 12 days. | "GSE data-validation programmes" (name them), "Days back" | [E9]; [R1] §1 row 12 |
| **representation and warranty relief** | The GSE does not enforce certain lender reps and warrants on data that its validation service has validated. | "certainty" (alone) | [E9] A2-3.2-02, SEL-2025-09 |
| **debt-to-income ratio (DTI)** | Monthly debt payments divided by gross monthly income. | "DTI bound" | [R-vocab] §2 (FIBO `TotalDebtExpenseRatio`) |
| **loan-to-value ratio (LTV)** | The loan amount divided by the property's appraised value or purchase price, whichever is lower. | "requested loan ≤ appraised value" (as the only rule) | [R-vocab] §2 (FIBO `LoanToValueRatio`) |
| **reserves** | Liquid assets left after closing, counted in months of housing payment. | "liquid reserves" (acceptable) | Fannie Mae Selling Guide B3-4.1-01 |
| **appraisal** / **appraised value** | A licensed appraiser's opinion of the property's market value. The applicant gets a copy promptly, or three business days before consummation, whichever is earlier. | "appraisal-value credential" (in story copy) | [E4] §1002.14; [R1] §1 row 10 |
| **title commitment** | The title insurer's promise to issue a title policy, listing the requirements and exceptions. | "title-clear credential", "title clearance", "Search the title and issue the clearance credential" | [E18] |
| **clear title** / **title defect** (cloud on title) | Title with no unresolved liens or defects, or a recorded problem that must be cured before closing. | "clouded" (as a bare status), "clear/clouded outcome" | [E18]; [R-ttl] title status |

### 2.4 Data, consent and access

| Preferred term | Definition | Use instead of | Source |
|---|---|---|---|
| **consumer-permissioned data** | Data that a third party obtains because the consumer authorised it. This is the term Freddie Mac uses for AIM. | "Borrowers own their data", "borrower-owned data", "trust inversion" | [R-org] row 2; [E10] |
| **authorization** (by the consumer) | The consumer's permission for a third party to access their data for a stated purpose. Under §1033 it is given through an *authorization disclosure*. | "consent per source" (acceptable in the assistant UI), "scoped pod access" | [E8] §1033.401, §1033.411 |
| **grant access** / **access permission** | The borrower allows a named organisation to read named items in the pod. | "grant" (bare noun), "access grant", "scoped write grant", "access rules" (in borrower-facing copy) | [E14] WAC |
| **revoke access** | The borrower withdraws a permission. Under §1033, revoking must be as easy as authorising, and collection stops. | "Take the lender's access away", "withdrawn organisation" | [E8] §1033.421(h) |
| **re-authorization** | A new authorization the consumer gives so that access can continue. Under §1033 this is required at least yearly. | "the grant they already gave" (when the meaning is continuing authority) | [E8] §1033.421(b) |
| **purpose** (purpose limitation) | The stated reason data may be used, for example "mortgage underwriting". | "for the lender" | [E15]; [R-vocab] §3.4 (`dpv:Purpose`) |
| **consent record** | The organisation's structured record that consent was given, changed or withdrawn. ISO/IEC TS 27560:2023 defines the structure, and DPV implements it. | "receipt" (for the stored record) | [E15] |
| **consent receipt** | The copy of a consent record given to the individual. Use "consent receipt" for what Alex reads. Use "consent records" for the stored list. Do not use Kantara's spec name: ISO 27560 builds on and replaces it. | "consent-receipt ledger", "receipt ledger", "receipted", "Every change is receipted" | [E15] |
| **access history** / **audit trail** | A chronological record of who was given or denied access, and when. Note that the demo's consent records cover grants and revocations, not every read. | "ledger", "the whole pitch in one view" | [R-spec] §3 (decision 0006) |
| **access log** | A record of each read and write request. The demo's "Pod activity" panel is an access log. | "Pod activity" (acceptable as a panel title) | [R-spec] §3 |
| **nonpublic personal information (NPI)** | GLBA's term for personally identifiable financial information that a financial institution holds. | "PII" (when the context is a lender's GLBA obligations) | [E7] §1016.3(p) |
| **personally identifiable information (PII)** | Information that identifies an individual. Use it in general privacy statements. | "no PII left behind" | NIST SP 800-122 [E21] |
| **data minimization** | Sharing only the data needed for the stated purpose. | "shop without undressing", "walk away clean", "no PII left behind" | [E15]; [R1] §4 last row |
| **system of record** / **authoritative source** | The designated source of truth for a data element. | "from the source" (acceptable), "attested once" | EDM Council DCAM [E16] |
| **data lineage** / **provenance** | Where data came from and how it changed. VC issuer, issuance date and signature give provenance. | "attested", "signed claim" (in data-management copy) | EDM Council DCAM [E16]; W3C PROV-O |
| **service identity** | The WebID that an organisation's system uses to access the pod. | "service identity" (keep the term; explain it once as "the organisation's system login") | [R-spec] §3; [E14] |

### 2.5 Credentials and cryptography

| Preferred term | Definition | Use instead of | Source |
|---|---|---|---|
| **verifiable credential (VC)** | A tamper-evident credential whose authorship can be verified cryptographically. In the demo it is a signed verification report. | "card", "signed claim", "attestation" (as nouns for the credential) | [E13] |
| **issuer** | The party that asserts the claims in a credential and signs it, for example the employment verification provider. Use it only in credential sentences. | "verifier" (for TWN, Finicity or Equifax) | [E13] |
| **holder** | The party that holds credentials and presents them. Here this is Alex, through the Data Vault app. | "pod owner" | [E13] |
| **verifier** (credential sense) | The party that receives and checks a credential or presentation, for example the lender or the AUS. Never use it for verification providers. | "verifier" (for issuers), "the lender's rail" | [E13] |
| **present** / **verifiable presentation** | To send credentials or proofs to a verifier, in a signed package bound to a challenge. | "POSTs each proof", "VP-POST" (visitor copy) | [E13] |
| **verify** (a credential) | Check the signature, issuer, validity period and status. | "re-verified on view" (acceptable), "fail-closed verification" | [E13] (verification) |
| **validity period** (`validFrom` / `validUntil`) | The dates between which the issuer says the credential is valid. | "validity window", "freshness window" | [E13] |
| **expired** | The credential's validity period has ended. | "lapsed", "gone stale", "tripped" | [E13] |
| **re-issue** | The issuer issues a new credential with current data and a new validity period. | "re-attest", "Re-issue (freshness)", "validity restored", "renews" | [R-spec] §2 (decision 0007) |
| **credential status** / **revoked** (credential) | The issuer has marked a credential invalid on its Bitstring Status List. This is not the same as revoking access. | "status-list rail", "status index revoked" | [E13-sl] |
| **digital signature** | A cryptographic signature that proves who issued a credential and that it is unchanged. | "signed once, stays under Alex's control" | [E13] |
| **zero-knowledge proof (ZKP)** | A proof that a statement is true, for example "income is at least $7,000 a month", without revealing the underlying value. | "proof only", "undressing" | [E20]; [R-zk] |
| **threshold proof** (range proof) | A ZKP that a hidden number is above or below a stated threshold. | "prove the thresholds" (acceptable), "integer FILTER" (visitor copy) | [E20]; [R-zk] Q1 |
| **selective disclosure** | The holder shares some claims from a credential and withholds others. The demo uses ZKP threshold proofs, not selective disclosure. | — (do not claim it) | [E13]; [R-zk] Q1 |
| **issuer-signed commitment** | A credential in which the issuer signs a cryptographic commitment to the hidden value, so that the proof is tied to real issuer data. | "operand anchor", "operand-anchor credential", "signed anchors", "ZK operand anchor" | [R-zk] Q1; [R-ttl] (`ZK operand anchor`) |
| **challenge** (nonce) | A single-use value from the verifier that prevents a proof from being replayed. | "single-use challenge" (acceptable) | [E13] |
| **limitations** (not independently audited) | A plain statement of what the cryptography does not guarantee. | "Honesty panel", "Zero-knowledge honesty panel", "honestly" | [R-zk] Verdict |

### 2.6 Solid and technical

| Preferred term | Definition | Use instead of | Source |
|---|---|---|---|
| **pod** (Solid pod) | A personal online data store that the borrower controls. Organisations read from it or write to it only with permission. The spec calls it a "storage". | "vault" (as a place: "into the vault"), "Data Vault pod", "fill the vault" | [E14] Solid Protocol |
| **Data Vault** | The product name of the borrower's wallet app (modelled on Verizon). Use it only as an app name. | "vault" (as a metaphor for security) | [R-spec] §4 (decision 0003) |
| **WebID** | A web address (URI) that identifies a person or organisation and links to their public profile. | "identity document" | [E14] WebID |
| **Web Access Control (WAC)** / **access control list (ACL)** | The Solid permission system: an ACL lists which agents may read, write, append or control each resource. | "access rules" (acceptable in the activity panel only) | [E14] WAC |
| **sign in** / **Solid-OIDC** | Authentication of a person or organisation to a pod, using OpenID Connect. | "rail", "server rail", "DPoP-bound Solid-OIDC holder binding" (visitor copy) | [E14] Solid-OIDC |
| **Legal Entity Identifier (LEI)** / **vLEI** | The ISO 17442 identifier for a legal entity. The vLEI is GLEIF's verifiable credential form of it. | "identity rail" | [R-vocab] §3.5; [E22] |
| **FIBO** | The Financial Industry Business Ontology from EDM Council and OMG. It is the vocabulary for the pod's data. | — | [R-vocab] §1 |
| **MISMO v3.4** / **ULAD** | The mortgage industry data standard and the URLA dataset built on it. The demo maps fields to it in documentation. | "bindings deliverable" (visitor copy) | [R-vocab] §3.1; [E12] |
| **simulated** / **illustrative** | "Simulated" marks behaviour that is not real. "Illustrative" marks figures that are not real. | "honestly stays off", "never fakes a success" | [R-spec] §6 |

## 3. Scene names mapped to process stages

| # | Current scene name | Preferred scene name | Standard stage(s) | Rule to cite |
|---|---|---|---|---|
| 1 | Fill the vault | **Verify income, assets and credit** | VOE/VOI, VOA, credit report | GSE-accepted verification providers (DU validation service; LPA AIM) |
| 2 | Shop without undressing | **Prequalify without disclosing income or credit score** | Prequalification (not preapproval) | CFPB prequalification vs preapproval; Reg B comment 2(f)-3 |
| 3 | One-click application | **Apply with data from the pod** | Application (URLA), Loan Estimate, AUS run, appraisal, title commitment | 12 CFR 1026.19(e)(1)(iii) |
| 4 | Nothing goes stale | **Re-verify employment before closing** | Pre-closing re-verification (verbal VOE), conditions, clear to close | Fannie Mae B3-3.1-04; B1-1-03 |
| 5 | Close and stay in control | **Close the loan and transfer servicing** | Closing Disclosure, consummation, eClosing, servicing transfer, revoke access | 12 CFR 1026.19(f)(1)(ii); 12 CFR 1024.33(b) |

Slugs (`fill-the-vault`, `shop-without-undressing`, …) are used in URLs and in `test/chapters.test.ts` and `e2e/`. Rename them only together with those tests.

## 4. Scan of current demo copy

The scan covered user-facing strings in `apps/*/app/**/*.tsx`, `apps/*/components/*.tsx`, `apps/tour/app/content/*.ts`, `scripts/demo/steps.ts`, `scripts/demo/overlay/overlay.js` and `scripts/demo/activity.ts`, as of 2026-10-14. Paths are relative to the repo root. "→" gives the replacement from this glossary.

### 4.1 Factual or legal errors (fix first)

| Issue | Location(s) | Replacement |
|---|---|---|
| Says the borrower holds the eNote's Authoritative Copy | `scripts/demo/steps.ts:186` | "…writes the closing documents into your pod, so you keep your own copy." The Authoritative Copy sits in the Controller's eVault. |
| AIM credited to Fannie Mae | `apps/verifications/app/page.tsx:25`; `apps/verifications/components/flow-page.tsx:84` | "Freddie Mac AIM and Fannie Mae DU validation service" |
| Closing costs shown as $11,600, which is the cost-to-originate statistic | `apps/closing/app/closing-experience.tsx:167–170` | Use a separate illustrative closing-cost figure, and keep it consistent with the Loan Estimate's "Estimated closing costs" |
| Loan Estimate shown as "derived from that decision" with "Decision: Approved with conditions" inside the Loan Estimate card | `apps/lender-boa/components/application-form.tsx:203–207, 242–246` | Show the Loan Estimate as a disclosure only. Show the AUS recommendation and conditional approval in the pipeline or AUS view. |
| AUS outcomes mix DU and LPA terms ("Approve", "Refer", "Caution") | `apps/gse/components/aus-console.tsx:52–56`; `apps/gse/app/page.tsx:47–50` ("Fail-closed / refer"); `apps/gse/app/page.tsx:16`, `apps/gse/app/underwriting/page.tsx:30–31, 61–64` ("refers the file") | LPA terms "Accept" / "Caution". Show verification failures as an "Unable to validate — obtain a new verification" message. |
| Underwriting approval conflated with clear to close | `apps/lender-boa/components/live-pipeline.tsx:9` ("Approved, clear to close") | "Clear to close" (a separate status after "Approved with conditions") |
| Prequalification outcome worded as an approval or an offer | `apps/tour/app/content/chapters.ts:89` ("Two competing offers"); `scripts/demo/steps.ts:85–86` ("Two quotes…", "Both lenders qualified Alex"); `apps/wallet/components/shopping-assistant.tsx:232, 254, 269` ("Qualified", "You qualify"); `apps/wallet/components/prequal-client.tsx:27` ("Qualified — values undisclosed") | "meets [lender]'s prequalification criteria"; "two illustrative rate quotes" |
| Negative prequalification outcome with Reg B exposure | `apps/wallet/components/prequal-client.tsx:58` ("Not qualified") | "Does not meet the prequalification criteria", with a note that a real lender would assess whether an adverse action notice is required |
| Rate quotes before the Loan Estimate lack the Reg Z §1026.19(e)(2)(ii) statement | `apps/lender-boa/app/prequal/page.tsx:48–50`; `apps/lender-53/app/page.tsx:17, 49–56`; assistant quote list `apps/wallet/components/shopping-assistant.tsx:252–262` | Add "Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before choosing a loan." |
| Overclaims ownership, encryption and an unrelated fine | `apps/tour/app/page.tsx:23` ("Borrowers own their data"); `apps/wallet/app/page.tsx:20–23` ("trust inversion… a carrier once fined over location-data sharing now custodies a vault it cannot read — user-held keys") | "Borrowers control who can access their data." Remove the fine reference. Remove "cannot read / user-held keys" unless the build actually encrypts data (SPEC §3 describes WAC only). |
| Servicing transfer revokes "the prior servicer", but the demo revokes the originating lender | `apps/tour/app/content/examiner.ts:76` vs `scripts/demo/steps.ts:205–210`, `apps/tour/app/content/chapters.ts:174` | "revokes the originating lender (the transferor servicer)". Use one framing everywhere. |
| "loan decision record (Loan Estimate and underwriting result)" combines two separate artefacts | `scripts/demo/activity.ts:177`; `scripts/demo/steps.ts:116, 180` | Split the labels: "Loan Estimate" and "AUS findings" / "underwriting decision" |
| "Credit score (soft, VC-attested)" | `apps/lender-boa/components/application-form.tsx:162` | "Credit score (from credit-score credential)" |

### 4.2 Invented scene names and slogans

| Term | Location(s) | Replacement |
|---|---|---|
| "Fill the vault" | `apps/tour/app/content/chapters.ts:70`; `apps/verifications/app/page.tsx:18`; `apps/verifications/components/flow-page.tsx:80`; `apps/wallet/app/credentials/page.tsx:16`; `scripts/demo/steps.ts:39, 48, 56, 66` | "Verify income, assets and credit" |
| "Shop without undressing" | `apps/tour/app/content/chapters.ts:81, 99`; `apps/lender-boa/app/prequal/page.tsx:19`; `apps/wallet/app/assistant/page.tsx:16`; `apps/wallet/app/prequal/page.tsx:20`; `apps/wallet/components/vault-home.tsx:109`; `scripts/demo/steps.ts:73, 84, 93` | "Prequalify without disclosing income or credit score" |
| "compare without disclosure" (inconsistent scene 2 name) | `apps/lender-53/app/page.tsx:14` | same as above |
| "One-click application" / "one click" | `apps/tour/app/content/chapters.ts:129, 134, 144`; `apps/lender-boa/app/page.tsx:13, 21`; `apps/lender-boa/app/application/page.tsx:20`; `apps/lender-boa/app/assistant/page.tsx:16`; `apps/lender-boa/app/freshness/page.tsx:28`; `apps/lender-boa/components/freshness-panel.tsx:162`; `apps/gse/app/page.tsx:16`; `apps/verifications/app/page.tsx:27, 75`; `apps/verifications/components/flow-page.tsx:132, 142`; `scripts/demo/steps.ts:100, 110, 120, 129, 165` | "Apply with data from the pod"; for re-issue, drop the click count |
| "Nothing goes stale" / "goes stale" | `apps/tour/app/content/chapters.ts:154`; `apps/gse/app/page.tsx:14`; `apps/lender-boa/app/page.tsx:19`; `apps/lender-boa/app/freshness/page.tsx:20`; `apps/verifications/app/page.tsx:27, 70`; `apps/verifications/components/flow-page.tsx:142`; `scripts/demo/steps.ts:155, 164, 174`; `apps/tour/app/content/app-guide.ts:63` | "Re-verify employment before closing"; "expired" |
| "Close and stay in control" / "Sign once. See every consent change." | `apps/tour/app/content/chapters.ts:184`; `apps/closing/app/closing-experience.tsx:92, 98`; `apps/wallet/app/ledger/page.tsx:17`; `scripts/demo/steps.ts:184–223` | "Close the loan and transfer servicing" |
| "Walk away clean", "no PII left behind" | `apps/tour/app/content/chapters.ts:95`; `apps/lender-boa/app/page.tsx:9` | "Neither lender keeps income or credit data" |
| "real industry plumbing", "simulated honestly" | `apps/tour/app/content/chapters.ts:169`; `apps/tour/app/content/services.ts:235` | "eClosing, modelled on Wolters Kluwer (eOriginal)" |
| "The whole pitch in one view", "The scene-5 payoff" | `apps/tour/app/content/chapters.ts:179`; `apps/wallet/components/vault-home.tsx:120` | Delete the sentence. Say what the screen shows: "Alex's access history: every grant and revocation." |
| "the lender's green tick goes grey" | `apps/verifications/app/page.tsx:74` | "the lender's check shows the credential has expired" |
| "Days back" (stat label) | `apps/gse/app/page.tsx:39` | "Days saved (Day 1 Certainty)" |

### 4.3 Freshness and re-verification wording

| Term | Location(s) | Replacement |
|---|---|---|
| "freshness check", "freshness re-check", "Pre-close freshness re-check", "Freshness" (nav) | `apps/lender-boa/app/freshness/page.tsx:7, 23`; `apps/lender-boa/components/freshness-panel.tsx:99, 107`; `apps/lender-boa/app/layout.tsx:24`; `apps/lender-boa/app/page.tsx:21, 42`; `apps/tour/app/content/chapters.ts:134, 140–141, 157`; `apps/tour/app/content/app-guide.ts:103–105`; `apps/tour/app/content/examiner.ts:55`; `apps/verifications/app/page.tsx:73, 77`; `scripts/demo/steps.ts:156, 159` | "Pre-closing re-verification" / "Re-verify employment"; nav label "Re-verification" |
| "Re-issue (freshness)", "Re-issued — validity restored" | `apps/verifications/components/issue-panel.tsx:95, 102`; `scripts/demo/steps.ts:168` | "Re-issue credential"; "New credential issued" |
| "re-attest" | `apps/tour/app/content/chapters.ts:144`; `apps/tour/app/content/examiner.ts:55` | "re-issue" |
| "lapsed", "trips", "validity window" | `apps/tour/app/content/chapters.ts:134, 139–140`; `apps/gse/app/page.tsx:16`; `apps/lender-boa/components/freshness-panel.tsx:25`; `apps/verifications/components/flow-page.tsx:142`; `apps/gse/components/aus-console.tsx:54` | "expired"; "validity period" |
| "Decision stands" / "Decision blocked" | `apps/lender-boa/components/freshness-panel.tsx:23–27` | "Verification current" / "Condition open: employment re-verification required" |
| "evidence gate", "evidence" | `apps/gse/app/page.tsx:16`; `apps/gse/app/underwriting/page.tsx:61`; `apps/gse/components/aus-console.tsx:54, 56`; `apps/lender-boa/app/pipeline/page.tsx:13, 31`; `apps/lender-boa/app/page.tsx:27` | "verification check" / "loan file" / "documentation" |

### 4.4 Party and role naming

| Term | Location(s) | Replacement |
|---|---|---|
| "verifier(s)" for verification providers | `apps/tour/app/content/chapters.ts:50`; `apps/tour/app/content/app-guide.ts:56`; `apps/lender-boa/app/freshness/page.tsx:53`; `scripts/demo/steps.ts:166` | "verification provider(s)" |
| "account-data aggregator", "open-banking issuer" | `scripts/demo/steps.ts:58, 68`; `apps/tour/app/content/chapters.ts:60` | "asset verification provider (data aggregator)" |
| "seat" | `apps/gse/app/page.tsx:30`; `apps/lender-boa/app/page.tsx:41`; `apps/tour/app/apps/page.tsx:19`; `apps/tour/app/page.tsx:31, 95`; `apps/tour/app/components/ecosystem-map.tsx:93, 127, 132`; `apps/tour/app/content/services.ts:149, 204, 214, 239, 275` | "role" |
| "origination portal", "thin pre-qual surface", "shopping surface", "proof-only lender" | `apps/tour/app/content/chapters.ts:84, 89`; `apps/tour/app/content/app-guide.ts:80, 117`; `apps/tour/app/content/services.ts:160`; `apps/lender-53/app/page.tsx:20` | "lender" / "second lender"; "online application" |
| "Automated Underwriting Service", "underwriting service", "underwriting console" | `apps/tour/app/content/services.ts:51`; `apps/tour/app/content/app-guide.ts:122`; `apps/tour/app/content/chapters.ts:149`; `apps/gse/app/underwriting/page.tsx:7, 23`; `scripts/demo/steps.ts:130–135, 225` | "automated underwriting system (AUS)", modelled on Freddie Mac Loan Product Advisor |
| "the GSE model", "AUS seat" | `apps/gse/app/page.tsx:30`; `apps/gse/app/underwriting/page.tsx:26` | "the AUS role, modelled on Freddie Mac LPA" |
| "X-modelled" in running text (for example "Finicity-modelled", "Truist-modelled servicer", "Freddie-LPA-modelled") | `apps/tour/app/content/chapters.ts:60, 174`; `apps/tour/app/content/services.ts:235` | "[role], modelled on [org]", once per surface |
| "digital closing platform" as the closing party | `scripts/demo/steps.ts:186`; `apps/tour/app/content/app-guide.ts:147` | "eClosing platform (modelled on Wolters Kluwer eOriginal)", plus "settlement agent" where that party is meant |
| "Your loan is being serviced by a new company" | `scripts/demo/steps.ts:196` | "Servicing of your loan is transferring to a new servicer." |

### 4.5 Consent, access and receipts

| Term | Location(s) | Replacement |
|---|---|---|
| "consent-receipt ledger", "receipt ledger", "ledger" | `apps/wallet/app/ledger/page.tsx:5, 20, 23`; `apps/wallet/components/ledger-view.tsx:53`; `apps/wallet/components/vault-home.tsx:119`; `apps/closing/app/closing-experience.tsx:102, 281, 294`; `apps/tour/app/content/chapters.ts:114, 158, 181`; `apps/tour/app/content/examiner.ts:35`; `apps/tour/app/content/services.ts:149`; `scripts/demo/steps.ts:216, 218, 235`; `scripts/demo/activity.ts:173` | "Consent receipts" (page title); "access history" (narrative); "consent records" (stored data) |
| "receipted" | `apps/tour/app/page.tsx:23`; `apps/wallet/app/page.tsx:23`; `apps/wallet/app/grants/page.tsx:19`; `apps/wallet/components/vault-home.tsx:120`; `apps/tour/app/content/app-guide.ts:51`; `apps/tour/app/content/chapters.ts:164, 179`; `apps/tour/app/content/examiner.ts:35, 76`; `apps/tour/app/examiner/page.tsx:33`; `scripts/demo/steps.ts:206, 215` | "recorded with a consent receipt" |
| "grant" (bare noun), "scoped pod access", "the grant Alex already gave", "existing consent" | `apps/tour/app/content/chapters.ts:109, 114–116, 134, 145`; `apps/lender-boa/app/page.tsx:15, 21`; `apps/gse/app/page.tsx:10`; `apps/verifications/app/page.tsx:28, 75`; `apps/lender-boa/app/freshness/page.tsx:28` | "access permission"; "the access Alex already gave"; "grant access" (verb) |
| "access rules" in borrower-facing copy | `scripts/demo/steps.ts:196, 206, 225`; `apps/tour/app/content/app-guide.ts:46` | "permission list" (borrower copy). "access control list (ACL)" stays in the activity panel. |
| "Take the lender's access away", "withdrawn organisation" | `scripts/demo/steps.ts:205`; `apps/wallet/app/grants/page.tsx:41` | "Revoke the lender's access"; "an organisation whose access was revoked" |
| "mortgage folder" | `scripts/demo/steps.ts:225, 229` | "your mortgage data (the loan file in your pod)" |

### 4.6 Cryptography and engineering jargon in visitor copy

| Term | Location(s) | Replacement |
|---|---|---|
| "operand anchor", "signed anchors", "two anchors" | `apps/wallet/app/prequal/page.tsx:28, 64`; `apps/wallet/components/shopping-assistant.tsx:50, 71, 161, 183, 190, 397`; `apps/lender-boa/app/prequal/page.tsx:68, 103`; `apps/lender-53/app/page.tsx:84`; `apps/verifications/app/page.tsx:58`; `apps/verifications/components/flow-page.tsx:125`; `scripts/demo/steps.ts:80`; `scripts/demo/activity.ts:172` | "issuer-signed commitment" (technical panels); "your income and credit-score credentials" (assistant and steps) |
| "rail", "server rail", "issuer rail", "status-list rail", "identity rail" | `apps/closing/app/closing-experience.tsx:312, 320`; `apps/gse/components/aus-console.tsx:122`; `apps/lender-boa/components/application-form.tsx:110`; `apps/lender-boa/components/freshness-panel.tsx:112`; `apps/property/app/appraisal/page.tsx:74`; `apps/property/app/title/page.tsx:73`; `apps/property/components/issue-flow.tsx:117, 125`; `apps/verifications/components/issue-panel.tsx:130–131`; `apps/tour/app/content/chapters.ts:157`; `apps/tour/app/content/services.ts:255`; `apps/wallet/app/prequal/page.tsx:66, 73` | "service" / "sign-in" / "status list"; or say what is off: "Sign-in is simulated here, so this step shows a preview." |
| "fail-closed", "nine-gate", "Tier A", "dual-signed" | `apps/gse/app/page.tsx:49`; `apps/gse/app/underwriting/page.tsx:79`; `apps/lender-53/app/page.tsx:83`; `apps/lender-boa/app/freshness/page.tsx:47`; `apps/lender-boa/app/prequal/page.tsx:72, 101`; `apps/tour/app/content/chapters.ts:74`; `apps/wallet/app/credentials/page.tsx:23`; `apps/wallet/app/page.tsx:40` | "Any failed check rejects the proof"; "nine checks"; drop "Tier A"; "signed twice: once for standard verification, once for zero-knowledge proofs" |
| "Honesty panel", "honestly" | `apps/lender-53/app/page.tsx:63`; `apps/lender-boa/app/prequal/page.tsx:81`; `apps/wallet/app/prequal/page.tsx:30, 40`; `apps/tour/app/content/chapters.ts:94, 103`; `apps/tour/app/components/demo-identity-card.tsx:80`; `apps/property/components/issue-flow.tsx:117`; `apps/gse/components/aus-console.tsx:122`; `apps/lender-boa/components/application-form.tsx:110`; `apps/wallet/app/prequal/page.tsx:74` | "Limitations"; delete "honestly" |
| "eClose ceremony", "signing ceremony", "eSign ceremony" | `apps/closing/app/closing-experience.tsx:101–102, 137, 148, 313, 336`; `apps/closing/app/layout.tsx:22`; `apps/tour/app/content/chapters.ts:169, 171`; `apps/tour/app/content/services.ts:235` | "eClosing"; "eSign the closing documents" |
| "attests" / "attested" / "VC-attested" as general verbs | `apps/tour/app/content/chapters.ts:56, 60`; `apps/tour/app/content/services.ts:204`; `apps/lender-boa/app/pipeline/page.tsx:76`; `apps/verifications/components/flow-page.tsx:90`; `apps/gse/app/underwriting/page.tsx:61` | "verified by [provider]"; "What this credential contains" |
| "URLA subset" | `apps/lender-boa/app/page.tsx:15` | "URLA sections 1–3" (or whichever sections are prefilled) |
| "Data Vault pod", "into the vault", "vault" as a place | `apps/verifications/app/page.tsx:26`; `apps/verifications/components/flow-page.tsx:82, 110`; `apps/verifications/components/issue-panel.tsx:74`; `apps/tour/app/content/chapters.ts:50, 55, 65`; `apps/tour/app/content/services.ts:182`; `scripts/demo/steps.ts:41, 67–68` | "Alex's pod" (the place); "the Data Vault app" (the app) |

## Sources

**Repo** (paths relative to the repo root)
- [R1] `docs/research/mortgage-process.md`: §1 stages, §2 actors, §3 artefacts, §4 pain points
- [R-org] `docs/research/org-map.md`: role assignments
- [R-vocab] `docs/research/vocab.md`: §1–3 (FIBO, VC, DPV, ODRL, GLEIF)
- [R-fibo] `docs/research/fibo-applicability-and-gaps.md` §2
- [R-zk] `docs/research/zkp-fit.md`: Verdict, Q1
- [R-spec] `SPEC.md` §2–6; decisions 0003, 0006 and 0007 as summarised there
- [R-ttl] `vocab/mort.ttl`: decision-status and title-status schemes, ZK operand anchor
- [R-anchors] `apps/tour/app/content/anchors.ts` (Freddie Mac 2024 Cost to Originate Study)

**External**
- [E1] CFPB, prequalification vs preapproval: https://www.consumerfinance.gov/ask-cfpb/whats-the-difference-between-a-prequalification-letter-and-a-preapproval-letter-en-127/
- [E2] Reg Z §1026.2 (application, consummation, creditor): https://www.consumerfinance.gov/rules-policy/regulations/1026/2/
- [E3] Reg Z §1026.19(e)–(f) (Loan Estimate timing, intent to proceed, pre-LE estimate statement, Closing Disclosure): https://www.consumerfinance.gov/rules-policy/regulations/1026/19/ ; loan originator: §1026.36, https://www.consumerfinance.gov/rules-policy/regulations/1026/36/
- [E4] Reg B §1002.2 (adverse action, applicant, application; comment 2(f)-3 on prequalification): https://www.consumerfinance.gov/rules-policy/regulations/1002/2/ ; §1002.9 notices; §1002.14 appraisals: https://www.consumerfinance.gov/rules-policy/regulations/1002/14/
- [E5] FCRA 15 U.S.C. §1681a (consumer report, consumer reporting agency): https://www.law.cornell.edu/uscode/text/15/1681a ; §1681b (permissible purpose): https://www.law.cornell.edu/uscode/text/15/1681b
- [E6] Reg X §1024.33 (servicing transfer notices): https://www.consumerfinance.gov/rules-policy/regulations/1024/33/
- [E7] Reg P (GLBA) 12 CFR 1016 (nonpublic personal information): https://www.consumerfinance.gov/rules-policy/regulations/1016/
- [E8] CFPB §1033 personal financial data rights: §1033.131 definitions, https://www.consumerfinance.gov/rules-policy/regulations/1033/131/ ; §1033.401/.411 authorization and authorization disclosure; §1033.421 duration, re-authorization, revocation, https://www.consumerfinance.gov/rules-policy/regulations/1033/421/ . §1033 covers deposit and card accounts (fits VOA, not VOE). The rule is under CFPB reconsideration, so use its terms and do not claim compliance.
- [E9] Fannie Mae Selling Guide: B3-3.1-04 verbal VOE, https://selling-guide.fanniemae.com/sel/b3-3.1-04/verbal-verification-employment ; B1-1-03 document age; B3-2-01 DU recommendations, https://selling-guide.fanniemae.com/sel/b3-2-01/general-information-du ; B3-2-11 DU Underwriting Findings report; A2-3.2-02 and SEL-2025-09 rep-and-warranty enforcement relief; DU validation service and Day 1 Certainty, https://singlefamily.fanniemae.com/applications-technology/day-1-certainty
- [E10] Freddie Mac Loan Product Advisor (Accept / Caution; AIM = Asset and Income Modeler): https://sf.freddiemac.com/tools-learning/loan-advisor/our-solutions/loan-product-advisor ; AIM service providers: https://sf.freddiemac.com/tools-learning/technology-tools/our-solutions/aim-service-providers
- [E11] Fannie Mae URLA (Form 1003): https://singlefamily.fanniemae.com/delivering/uniform-mortgage-data-program/uniform-residential-loan-application
- [E12] MISMO v3.4 reference model: https://www.mismo.org/standards-resources/mismo-product/mismo-version-3-4 ; ULAD: https://sf.freddiemac.com/tools-learning/uniform-mortgage-data-program/ulad
- [E13] W3C Verifiable Credentials Data Model 2.0 (terminology: VC, issuer, holder, verifier, presentation, verification, validation, selective disclosure): https://www.w3.org/TR/vc-data-model-2.0/ ; [E13-sl] Bitstring Status List: https://www.w3.org/TR/vc-bitstring-status-list/
- [E14] Solid Protocol: https://solidproject.org/TR/protocol ; Web Access Control: https://solidproject.org/TR/wac ; Solid-OIDC: https://solidproject.org/TR/oidc ; WebID: https://www.w3.org/2005/Incubator/webid/spec/identity/
- [E15] ISO/IEC TS 27560:2023, *Consent record information structure* (consent records and receipts; builds on the Kantara Consent Receipt): https://www.iso.org/standard/80392.html ; DPV implementation guide: https://w3id.org/dpv/guides/consent-27560
- [E16] EDM Council DCAM (authoritative source, data lineage): https://edmcouncil.org/frameworks/dcam/
- [E17] MERS eRegistry FAQ (eNote, Controller, Authoritative Copy): https://www.mersinc.org/products-services/mers-esuite/eregistry/faq
- [E18] ALTA policy forms and commitment: https://www.alta.org/policies-and-standards/policy-forms/
- [E19] Conditional approval → clear to close (secondary; industry usage): https://www.bankrate.com/mortgages/conditional-approval/ , https://www.rocketmortgage.com/learn/conditional-approval
- [E20] ZKProof Community Reference (zero-knowledge proof, range proof): https://docs.zkproof.org/reference
- [E21] NIST SP 800-122 (PII): https://csrc.nist.gov/pubs/sp/800/122/final
- [E22] GLEIF vLEI: https://www.gleif.org/en/vlei/introducing-the-verifiable-lei-vlei
