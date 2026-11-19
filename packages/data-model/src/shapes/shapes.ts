// Generated from shapes/*.ttl by scripts/generate-shapes.mjs - DO NOT EDIT.
// Regenerate from packages/data-model: node scripts/generate-shapes.mjs

/**
 * Turtle source of every SHACL shapes document, keyed by its file stem in
 * shapes/ ("common" holds the shared support shapes the resource shapes
 * reference via sh:node).
 */
export const SHAPES_TURTLE = {
  "access-request": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# An access request an organisation posts to the borrower's inbox/: an ODRL Request naming
# the resources, the actions, the purpose, the end and any onward recipients (further
# permissions whose assignee differs from the policy's).
mshape:AccessRequestShape
  a sh:NodeShape ;
  sh:targetClass odrl:Request ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue odrl:Request ;
  ] ;
  sh:property [
    # The grant code shown in the Lens (G1 to G8).
    sh:path schema:identifier ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path dcterms:description ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path odrl:assigner ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path odrl:assignee ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path odrl:permission ;
    sh:minCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PermissionShape ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] .
`,
  "agent-profile": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# A WebID profile document (profile/card) of Alex or of an organisation.
mshape:AgentProfileShape
  a sh:NodeShape ;
  sh:targetClass foaf:PersonalProfileDocument ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue foaf:PersonalProfileDocument ;
  ] ;
  sh:property [
    sh:path foaf:primaryTopic ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:AgentShape ;
  ] .
`,
  "appraisal-credential": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix cred: <https://www.w3.org/2018/credentials#> .
@prefix sec: <https://w3id.org/security#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix schema: <https://schema.org/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fnd-arr-asmt: <https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/> .
@prefix fibo-fnd-rel-rel: <https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/> .

# Resource 5 (vocab.md section 5): appraisal-value VC issued by the appraisal
# management company (Cotality-modelled property app). The appraised value is
# DISCLOSED, never ZK-proved (decision 0005). The claim (property + value)
# hangs off credentialSubject; the FIBO appraisal report node is linked as
# cred:evidence.
mshape:AppraisalCredentialShape
  a sh:NodeShape ;
  sh:targetClass mort:AppraisalCredential ;
  sh:closed true ;
  sh:ignoredProperties ( sec:proof ) ;
  sh:sparql [
    # Cross-node equality (inexpressible in core SHACL): the evidence report
    # must evaluate the SAME property the credentialSubject claims, otherwise a
    # valid-looking appraised value could be backed by an unrelated report.
    sh:message "the appraisal evidence must evaluate the credentialSubject's mort:subjectProperty" ;
    sh:select """
      SELECT $this ?value WHERE {
        $this <https://www.w3.org/2018/credentials#evidence> ?report .
        ?report <https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/evaluates> ?value .
        $this <https://www.w3.org/2018/credentials#credentialSubject> ?subject .
        ?subject <https://solid-mortgage-vocab.vercel.app/mort#subjectProperty> ?property .
        FILTER (?value != ?property)
      }
    """ ;
  ] ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue cred:VerifiableCredential ;
  ] ;
  sh:property [
    sh:path cred:issuer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path cred:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:lessThan cred:validUntil ;
  ] ;
  sh:property [
    sh:path cred:validUntil ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path cred:credentialStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:AppraisalSubjectShape ;
  ] ;
  sh:property [
    sh:path cred:evidence ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:AppraisalEvidenceShape ;
  ] ;
  sh:property [
    sh:path cred:credentialSchema ;
    sh:nodeKind sh:IRI ;
  ] .

mshape:AppraisalSubjectShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:AppraisedPropertyShape ;
  ] .

# The FIBO appraisal report: who appraised, what it evaluates, when issued.
mshape:AppraisalEvidenceShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue fibo-fnd-arr-asmt:Appraisal ;
  ] ;
  sh:property [
    sh:path fibo-fnd-rel-rel:evaluates ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path fibo-fnd-rel-rel:isGeneratedBy ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:AppraiserShape ;
  ] ;
  sh:property [
    # OMG Commons ExplicitDate term IRIs do not dereference, so the report
    # issue date is a dcterms literal rather than a cmns-dt structured date.
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] .

mshape:AppraiserShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue fibo-fnd-arr-asmt:Appraiser ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:appraiserLicenseId ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 4 ;
  ] .
`,
  "asset-credential": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix cred: <https://www.w3.org/2018/credentials#> .
@prefix sec: <https://w3id.org/security#> .
@prefix schema: <https://schema.org/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# Resource 3 (vocab.md section 5): asset / bank-balance VC issued by the
# depository institution (Finicity-modelled, scene 1). Balances are DISCLOSED
# display amounts: decision 0005 keeps no asset-balance ZK statement, so there
# is no scaled-unit balance field. validFrom/validUntil delimit the statement
# window.
mshape:AssetCredentialShape
  a sh:NodeShape ;
  sh:targetClass mort:AssetCredential ;
  sh:closed true ;
  sh:ignoredProperties ( sec:proof ) ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue cred:VerifiableCredential ;
  ] ;
  sh:property [
    sh:path cred:issuer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path cred:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:lessThan cred:validUntil ;
  ] ;
  sh:property [
    sh:path cred:validUntil ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path cred:credentialStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:AssetSubjectShape ;
  ] ;
  sh:property [
    sh:path cred:credentialSchema ;
    sh:nodeKind sh:IRI ;
  ] .

mshape:AssetSubjectShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path schema:owns ;
    sh:minCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:DepositAccountShape ;
  ] .

mshape:DepositAccountShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    # schema:DepositAccount (BankAccount & InvestmentOrDeposit), the schema.org
    # type whose instances take schema:amount.
    sh:path rdf:type ;
    sh:hasValue schema:DepositAccount ;
  ] ;
  sh:property [
    sh:path schema:provider ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:OrganizationShape ;
  ] ;
  sh:property [
    sh:path schema:amount ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    # Masked display identifier - the full account number never enters the pod.
    sh:path mort:accountLast4 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:pattern "^[0-9]{4}$" ;
    sh:message "accountLast4 must be exactly four digits" ;
  ] .
`,
  "borrower-profile": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/> .

# Resource 1 (vocab.md section 5): the /mortgage/profile borrower resource the
# wallet app writes. It governs that document only - NOT the WebID profile
# document, which carries arbitrary further triples.
mshape:BorrowerProfileShape
  a sh:NodeShape ;
  sh:targetClass fibo-fbc-dae-dbt:Borrower ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:Person ;
  ] ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue fibo-fbc-dae-dbt:Borrower ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:birthDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path schema:email ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:pattern "^[^@\\\\s]+@[^@\\\\s]+\\\\.[^@\\\\s]+$" ;
  ] ;
  sh:property [
    sh:path schema:telephone ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
  ] ;
  sh:property [
    sh:path schema:address ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PostalAddressShape ;
  ] ;
  sh:property [
    sh:path mort:maritalStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( mort:MaritalStatus-Married mort:MaritalStatus-Separated mort:MaritalStatus-Unmarried ) ;
    sh:message "maritalStatus must be a concept from mort:MaritalStatusScheme (URLA section 1a)" ;
  ] .
`,
  "closing-disclosure": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/> .
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/> .

# mortgage/juniper/closing-disclosure: the Closing Disclosure summary (12 CFR 1026.19(f)).
# mort:receivedDate is set when the consumer acknowledges receipt; consummation
# (mort:closingDate) must be at least three business days after it.
mshape:ClosingDisclosureShape
  a sh:NodeShape ;
  sh:targetClass mort:ClosingDisclosure ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:ClosingDisclosure ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path fibo-fbc-dae-dbt:hasBorrower ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:receivedDate ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:closingDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:disbursementDate ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path fibo-loan-ln-ln:hasPrincipalAmount ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path schema:interestRate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:decimal ;
    sh:minInclusive 0.0 ;
    sh:maxInclusive 25.0 ;
    sh:message "interestRate is the note rate in percent (e.g. 6.5)" ;
  ] ;
  sh:property [
    sh:path mort:loanTermMonths ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 12 ;
    sh:maxInclusive 480 ;
  ] ;
  sh:property [
    sh:path mort:annualPercentageRate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:decimal ;
    sh:minInclusive 0.0 ;
    sh:maxInclusive 40.0 ;
  ] ;
  sh:property [
    sh:path mort:monthlyPrincipalAndInterest ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:estimatedTotalMonthlyPayment ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path fibo-loan-ln-ln:hasTotalClosingCosts ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:cashToClose ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] .
`,
  "closing-record": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/> .
@prefix fibo-loan-reln-mtg: <https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/Mortgages/> .
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/> .

# Resource 9 (vocab.md section 5): the executed-mortgage closing record the
# eClose app writes (scene 5). mort:closingDate carries the consummation date
# as a literal (FIBO's hasInitialFundingDate requires an OMG Commons
# ExplicitDate node whose term IRIs do not dereference); schema:interestRate is
# the display note rate (percent).
mshape:ClosingRecordShape
  a sh:NodeShape ;
  sh:targetClass fibo-loan-reln-mtg:Mortgage ;
  sh:closed true ;
  sh:property [
    # schema:MortgageLoan is welcome as a secondary display type.
    sh:path rdf:type ;
    sh:hasValue fibo-loan-reln-mtg:Mortgage ;
  ] ;
  sh:property [
    sh:path fibo-fbc-dae-dbt:hasBorrower ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] ;
  sh:property [
    sh:path fibo-loan-ln-ln:hasPrincipalAmount ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path fibo-loan-ln-ln:hasTotalClosingCosts ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path schema:interestRate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:decimal ;
    sh:minInclusive 0.0 ;
    sh:maxInclusive 25.0 ;
    sh:message "interestRate is the note rate in percent (e.g. 6.125)" ;
  ] ;
  sh:property [
    sh:path mort:loanTermMonths ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 12 ;
    sh:maxInclusive 480 ;
  ] ;
  sh:property [
    sh:path mort:closingDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:recordingReference ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    # Borrower-facing reference only; authoritative eNote custody stays in the eVault.
    sh:path mort:eNoteReference ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    # The servicer of record (Truist-modelled after the scene 5 transfer).
    sh:path fibo-loan-ln-ln:isServicedBy ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:OrganizationShape ;
  ] .
`,
  common: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fnd-arr-asmt: <https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/> .
@prefix fibo-fnd-plc-rp: <https://spec.edmcouncil.org/fibo/ontology/FND/Places/RealProperty/> .

# Shared support shapes referenced (sh:node) by the nine resource shapes.
# None declares a target: they validate only where a resource shape points at them.
# OMG Commons (cmns-*) and GLEIF term IRIs do not dereference, so dates use
# dcterms/xsd literals and money uses schema:MonetaryAmount (vocab.md section 3,
# decision 0005); FIBO object properties keep FIBO semantics where their term
# IRIs resolve.

mshape:PostalAddressShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:PostalAddress ;
  ] ;
  sh:property [
    sh:path schema:streetAddress ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:addressLocality ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:addressRegion ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:pattern "^[A-Z]{2}$" ;
    sh:message "addressRegion must be a two-letter US state code" ;
  ] ;
  sh:property [
    sh:path schema:postalCode ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:pattern "^[0-9]{5}(-[0-9]{4})?$" ;
    sh:message "postalCode must be a US ZIP or ZIP+4" ;
  ] .

mshape:OrganizationShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    # Extra types (e.g. fibo-loan-ln-ln:Servicer on the servicer node) are
    # permitted: only the presence of schema:Organization is required.
    sh:path rdf:type ;
    sh:hasValue schema:Organization ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .

mshape:MonetaryAmountShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:MonetaryAmount ;
  ] ;
  sh:property [
    sh:path schema:value ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:decimal ;
    sh:minInclusive 0.0 ;
  ] ;
  sh:property [
    sh:path schema:currency ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( "USD" ) ;
  ] .

# The appraised value is DISCLOSED, never ZK-proved (decision 0005): it is a
# display MonetaryAmount double-typed with the FIBO assessment concept.
mshape:AppraisedValueShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue fibo-fnd-arr-asmt:AppraisedValue ;
  ] ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:MonetaryAmount ;
  ] ;
  sh:property [
    sh:path schema:value ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:decimal ;
    sh:minInclusive 0.0 ;
  ] ;
  sh:property [
    sh:path schema:currency ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( "USD" ) ;
  ] .

# The subject property (URLA section 4a). hasEstimatedValue is optional here;
# the appraisal credential requires it via mshape:AppraisedPropertyShape.
mshape:PropertyShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    # Secondary display types (e.g. schema:SingleFamilyResidence) are permitted.
    sh:path rdf:type ;
    sh:hasValue fibo-fnd-plc-rp:RealEstate ;
  ] ;
  sh:property [
    sh:path schema:address ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PostalAddressShape ;
  ] ;
  sh:property [
    sh:path fibo-fnd-arr-asmt:hasEstimatedValue ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:AppraisedValueShape ;
  ] .

# Refinement used by the appraisal credential: same property, value required.
mshape:AppraisedPropertyShape
  a sh:NodeShape ;
  sh:node mshape:PropertyShape ;
  sh:property [
    sh:path fibo-fnd-arr-asmt:hasEstimatedValue ;
    sh:minCount 1 ;
    sh:message "an appraised property must carry its appraised value" ;
  ] .
`,
  "consent-receipt": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix dpv: <https://w3id.org/dpv#> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# Decision 0006: this is an APP-LEVEL receipt. WAC enforces the access change;
# neither WAC nor the Solid protocol is represented as an audit provider.
mshape:ConsentReceiptShape
  a sh:NodeShape ;
  sh:targetClass dpv:ConsentReceipt ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue dpv:ConsentReceipt ;
  ] ;
  sh:property [
    sh:path dpv:hasDataSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dpv:hasDataController ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    # One receipt may cover several pod resources (a grant spans containers).
    sh:path odrl:target ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    # The ODRL policy (policies/<grant>) this record is the audit entry for.
    sh:path dpv:hasPolicy ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dpv:hasPurpose ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dpv:hasConsentStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( dpv:ConsentGiven dpv:ConsentWithdrawn dpv:ConsentExpired ) ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] .
`,
  "contact-details": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# profile/contact: how to reach the borrower. Read by the lender (G4) and the servicer (G8).
mshape:ContactDetailsShape
  a sh:NodeShape ;
  sh:targetClass schema:ContactPoint ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:ContactPoint ;
  ] ;
  sh:property [
    sh:path schema:email ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:telephone ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:address ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PostalAddressShape ;
  ] .
`,
  "credential-pointer": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# A pointer an organisation keeps in place of a copy: where the credential lives in the pod,
# its digest, its issuer and its as-of time. The reader records its own source check.
mshape:CredentialPointerShape
  a sh:NodeShape ;
  sh:targetClass mort:CredentialPointer ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:CredentialPointer ;
  ] ;
  sh:property [
    sh:path schema:url ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:type ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path schema:sha256 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:pattern "^[0-9a-f]{64}$" ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:asOf ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path mort:signatureVerified ;
    sh:maxCount 1 ;
    sh:datatype xsd:boolean ;
  ] ;
  sh:property [
    sh:path mort:statusChecked ;
    sh:maxCount 1 ;
    sh:datatype xsd:boolean ;
  ] ;
  sh:property [
    sh:path mort:checkedAt ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .
`,
  "credit-report": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/> .

# The lender's own record of the merged report it ordered (loan file, never the borrower's pod).
# dcterms:creator is the consumer reporting agency; mort:authorisedBy is the borrower's consent
# record for the hard inquiry.
mshape:CreditReportShape
  a sh:NodeShape ;
  sh:targetClass mort:CreditReport ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:CreditReport ;
  ] ;
  sh:property [
    sh:path schema:identifier ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path fibo-fbc-dae-dbt:hasBorrower ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:permissiblePurpose ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:authorisedBy ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path mort:scoreDisclosure ;
    sh:minCount 1 ;
    sh:maxCount 3 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:ScoreDisclosureShape ;
  ] ;
  sh:property [
    sh:path mort:totalMonthlyDebtUsd ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 0 ;
    sh:maxInclusive 9999 ;
  ] .
`,
  "credit-score-credential": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix cred: <https://www.w3.org/2018/credentials#> .
@prefix sec: <https://w3id.org/security#> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# Resource 4 (vocab.md section 5): credit-score VC issued by the credit bureau
# (Equifax-modelled, scene 1). The score and the monthly-debt total are the ZK
# operands of scene 2, so the subject carries ONLY the scaled-unit fields plus
# the scoring model - no FIBO RatingScore node, which would be a disclosed copy
# of the hidden value (decision 0005: no disclosed derivative of a hidden
# operand).
mshape:CreditScoreCredentialShape
  a sh:NodeShape ;
  sh:targetClass mort:CreditScoreCredential ;
  sh:closed true ;
  sh:ignoredProperties ( sec:proof ) ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue cred:VerifiableCredential ;
  ] ;
  sh:property [
    sh:path cred:issuer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path cred:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:lessThan cred:validUntil ;
  ] ;
  sh:property [
    sh:path cred:validUntil ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path cred:credentialStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:CreditScoreSubjectShape ;
  ] ;
  sh:property [
    sh:path cred:credentialSchema ;
    sh:nodeKind sh:IRI ;
  ] .

mshape:CreditScoreSubjectShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    # ZK field, decision 0005: 3-digit budget (FICO-family 300..850),
    # filter_int_d3.
    sh:path mort:creditScoreValue ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 300 ;
    sh:maxInclusive 850 ;
    sh:message "creditScoreValue must fit decision 0005's 3-digit budget (300..850)" ;
  ] ;
  sh:property [
    # The bureau attests total monthly obligations from tradelines: the hidden
    # operand of the recast DTI statement (decision 0005), whole USD/month,
    # 4-digit budget, filter_int_d4.
    sh:path mort:totalMonthlyDebtUsd ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 0 ;
    sh:maxInclusive 9999 ;
    sh:message "totalMonthlyDebtUsd must fit decision 0005's 4-digit budget (0..9999 whole USD/month)" ;
  ] ;
  sh:property [
    sh:path mort:scoreModel ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( mort:ScoreModel-FICO8 ) ;
    sh:message "scoreModel must be a concept from mort:ScoreModelScheme" ;
  ] .
`,
  document: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# A delivered document that is not an attestation and has no summary of its own: a signed
# copy, a policy. The description is the embedded summary.
mshape:DocumentShape
  a sh:NodeShape ;
  sh:targetClass schema:DigitalDocument ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:DigitalDocument ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:description ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path schema:identifier ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:about ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path schema:sha256 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:pattern "^[0-9a-f]{64}$" ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] .
`,
  "employment-income-credential": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix cred: <https://www.w3.org/2018/credentials#> .
@prefix sec: <https://w3id.org/security#> .
@prefix schema: <https://schema.org/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-loan-ln-app: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/> .

# Resource 2 (vocab.md section 5): employment + income VC issued by the
# employer / payroll provider (The Work Number-modelled, scene 1). Freshness
# window is REQUIRED: scene 4's staleness beat relies on validUntil
# (decision 0012 - seeded backdated validFrom -30d / validUntil +14d).
mshape:EmploymentIncomeCredentialShape
  a sh:NodeShape ;
  sh:targetClass mort:EmploymentIncomeCredential ;
  sh:closed true ;
  sh:ignoredProperties ( sec:proof ) ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue cred:VerifiableCredential ;
  ] ;
  sh:property [
    sh:path cred:issuer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path cred:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:lessThan cred:validUntil ;
  ] ;
  sh:property [
    sh:path cred:validUntil ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    # Bitstring Status List entry per issuer app (decision 0012). The entry
    # node is not shape-pinned until vc-kit issuance fixes its exact form.
    sh:path cred:credentialStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:EmploymentIncomeSubjectShape ;
    sh:message "credentialSubject must be the borrower WebID (holder binding, decision 0012)" ;
  ] ;
  sh:property [
    # Underlying fibo-loan-ln-app:IncomeVerificationReport, usually an external
    # pod resource reference - so no sh:node constraint on this document.
    sh:path cred:evidence ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSchema ;
    sh:nodeKind sh:IRI ;
  ] .

# The subject carries employment facts plus the ZK income field. It must NOT
# carry schema:baseSalary or any other disclosed copy of income: a disclosed
# derivative of a hidden operand defeats the ZK hiding (decision 0005 rule -
# the closed shape enforces this).
mshape:EmploymentIncomeSubjectShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path schema:worksFor ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:OrganizationShape ;
  ] ;
  sh:property [
    sh:path schema:jobTitle ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:startDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    # ZK field, decision 0005: whole USD/month, 4-digit budget, filter_int_d4.
    sh:path mort:monthlyGrossIncomeUsd ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 0 ;
    sh:maxInclusive 9999 ;
    sh:message "monthlyGrossIncomeUsd must fit decision 0005's 4-digit budget (0..9999 whole USD/month)" ;
  ] .
`,
  "escrow-statement": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/> .

# mortgage/servicing/escrow-statement: the initial escrow account statement (12 CFR 1024.17(g)).
mshape:EscrowAccountStatementShape
  a sh:NodeShape ;
  sh:targetClass mort:EscrowAccountStatement ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:EscrowAccountStatement ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path fibo-fbc-dae-dbt:hasBorrower ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:monthlyEscrowPayment ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:lineItem ;
    sh:minCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:LineItemShape ;
  ] .
`,
  "evidence-of-insurance-credential": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix cred: <https://www.w3.org/2018/credentials#> .
@prefix sec: <https://w3id.org/security#> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# Evidence of homeowner's insurance naming the lender as mortgagee. cred:validUntil is the
# end of the policy period.
mshape:EvidenceOfInsuranceCredentialShape
  a sh:NodeShape ;
  sh:targetClass mort:EvidenceOfInsuranceCredential ;
  sh:closed true ;
  sh:ignoredProperties ( sec:proof ) ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue cred:VerifiableCredential ;
  ] ;
  sh:property [
    sh:path cred:issuer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path cred:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:lessThan cred:validUntil ;
  ] ;
  sh:property [
    sh:path cred:validUntil ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path cred:credentialStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:EvidenceOfInsuranceSubjectShape ;
  ] ;
  sh:property [
    sh:path cred:evidence ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSchema ;
    sh:nodeKind sh:IRI ;
  ] .

mshape:EvidenceOfInsuranceSubjectShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path schema:identifier ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] ;
  sh:property [
    sh:path mort:dwellingCoverage ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:annualPremium ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:deductible ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path schema:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
    sh:lessThan schema:validThrough ;
  ] ;
  sh:property [
    sh:path schema:validThrough ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:mortgageeClause ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .
`,
  "identity-credential": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix cred: <https://www.w3.org/2018/credentials#> .
@prefix sec: <https://w3id.org/security#> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# Identity credential (seeded, signed at first run). The subject is the borrower's WebID.
mshape:IdentityCredentialShape
  a sh:NodeShape ;
  sh:targetClass mort:IdentityCredential ;
  sh:closed true ;
  sh:ignoredProperties ( sec:proof ) ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue cred:VerifiableCredential ;
  ] ;
  sh:property [
    sh:path cred:issuer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path cred:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:lessThan cred:validUntil ;
  ] ;
  sh:property [
    sh:path cred:validUntil ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path cred:credentialStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:IdentitySubjectShape ;
  ] ;
  sh:property [
    sh:path cred:evidence ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSchema ;
    sh:nodeKind sh:IRI ;
  ] .

mshape:IdentitySubjectShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:birthDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path schema:address ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PostalAddressShape ;
  ] ;
  sh:property [
    sh:path mort:taxIdLast4 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:pattern "^[0-9]{4}$" ;
    sh:minLength 1 ;
    sh:message "taxIdLast4 is exactly four digits; the full identifier never enters the pod" ;
  ] .
`,
  "inbox-message": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix as: <https://www.w3.org/ns/activitystreams#> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# A message one organisation appends to another organisation's inbox/ (organisation to
# organisation, never through the borrower's pod). as:object names the resources it is about.
mshape:InboxMessageShape
  a sh:NodeShape ;
  sh:targetClass as:Announce ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue as:Announce ;
  ] ;
  sh:property [
    sh:path dcterms:type ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( mort:MessageKind-CreditReportOrder mort:MessageKind-CreditReportDelivery mort:MessageKind-CasefileSubmission mort:MessageKind-FindingsDelivery mort:MessageKind-ServiceOrder mort:MessageKind-AppraisalDelivery mort:MessageKind-CommitmentDelivery mort:MessageKind-RefreshRequest mort:MessageKind-RefreshDelivery mort:MessageKind-ClosingInstructions mort:MessageKind-ClosingConfirmation mort:MessageKind-RecordingSubmission mort:MessageKind-RecordingConfirmation mort:MessageKind-LoanDelivery mort:MessageKind-PurchaseConfirmation mort:MessageKind-ServicingBoarding ) ;
    sh:message "dcterms:type must be a concept from mort:MessageKindScheme" ;
  ] ;
  sh:property [
    sh:path as:actor ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path as:object ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path as:summary ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path as:published ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path as:inReplyTo ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] .
`,
  "loan-application": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-loan-ln-app: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/> .
@prefix fibo-loan-reln-org: <https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/MortgageOrigination/> .
@prefix fibo-fnd-arr-rep: <https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Reporting/> .

# Resource 7 (vocab.md section 5): the URLA-subset loan application written by
# the lender app from pod data (scene 3). The URLA controlled vocabularies are
# FIBO named individuals (loan purpose, occupancy, amortization type, cash-out
# status) attached via dcterms:type: FIBO's own hasIntendedLoanPurpose is a
# DatatypeProperty (xsd:string) and the OMG Commons classifier property IRIs do
# not dereference, so dcterms:type is the controlled-vocabulary link. One
# qualified constraint per facet pins its cardinality.
#
# URLA section 5 declarations booleans and 4b down-payment source join when the
# sm-ea6 vocab round enumerates them.
mshape:LoanApplicationShape
  a sh:NodeShape ;
  sh:targetClass fibo-loan-ln-app:LoanApplication ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue fibo-loan-ln-app:LoanApplication ;
  ] ;
  sh:property [
    # URLA application date. FIBO's hasApplicationDate requires an OMG Commons
    # ExplicitDate node whose term IRIs do not dereference - dcterms instead.
    sh:path dcterms:created ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    # The borrower WebID (FIBO: applications are submitted by requesters).
    sh:path fibo-fnd-arr-rep:isSubmittedBy ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path fibo-loan-ln-app:hasRequestedAmount ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:loanTermMonths ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 12 ;
    sh:maxInclusive 480 ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] ;
  sh:property [
    # Value space: the URLA-aligned FIBO named individuals, all facets.
    sh:path dcterms:type ;
    sh:minCount 3 ;
    sh:maxCount 4 ;
    sh:nodeKind sh:IRI ;
    sh:in (
      fibo-loan-reln-org:MortgageLoanPurpose-BusinessOrCommercial
      fibo-loan-reln-org:MortgageLoanPurpose-DwellingConstruction
      fibo-loan-reln-org:MortgageLoanPurpose-HomeImprovement
      fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing
      fibo-loan-reln-org:MortgageLoanPurpose-MortgageModification
      fibo-loan-reln-org:MortgageLoanPurpose-RealPropertyPurchase
      fibo-loan-reln-org:PropertyUsage-investment
      fibo-loan-reln-org:PropertyUsage-primaryResidence
      fibo-loan-reln-org:PropertyUsage-secondHome
      fibo-loan-reln-org:AmortizationType-adjustableRate
      fibo-loan-reln-org:AmortizationType-fixedRate
      fibo-loan-reln-org:AmortizationType-graduatedPayment
      fibo-loan-reln-org:AmortizationType-graduatedPaymentAdjustable
      fibo-loan-reln-org:AmortizationType-growingEquity
      fibo-loan-reln-org:AmortizationType-rateImprovement
      fibo-loan-reln-org:AmortizationType-step
      fibo-loan-reln-org:CashOutStatus-CashOut
      fibo-loan-reln-org:CashOutStatus-LimitedCashOut
      fibo-loan-reln-org:CashOutStatus-NoCashOut
    ) ;
    sh:message "dcterms:type values must be URLA-aligned FIBO named individuals" ;
  ] ;
  sh:property [
    # Facet: loan purpose (URLA section 4a), exactly one.
    sh:path dcterms:type ;
    sh:qualifiedValueShape [
      sh:in (
        fibo-loan-reln-org:MortgageLoanPurpose-BusinessOrCommercial
        fibo-loan-reln-org:MortgageLoanPurpose-DwellingConstruction
        fibo-loan-reln-org:MortgageLoanPurpose-HomeImprovement
        fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing
        fibo-loan-reln-org:MortgageLoanPurpose-MortgageModification
        fibo-loan-reln-org:MortgageLoanPurpose-RealPropertyPurchase
      )
    ] ;
    sh:qualifiedMinCount 1 ;
    sh:qualifiedMaxCount 1 ;
    sh:message "exactly one FIBO MortgageLoanPurpose individual is required" ;
  ] ;
  sh:property [
    # Facet: occupancy (URLA section 4a), exactly one.
    sh:path dcterms:type ;
    sh:qualifiedValueShape [
      sh:in (
        fibo-loan-reln-org:PropertyUsage-investment
        fibo-loan-reln-org:PropertyUsage-primaryResidence
        fibo-loan-reln-org:PropertyUsage-secondHome
      )
    ] ;
    sh:qualifiedMinCount 1 ;
    sh:qualifiedMaxCount 1 ;
    sh:message "exactly one FIBO PropertyUsage individual is required" ;
  ] ;
  sh:property [
    # Facet: amortization type, exactly one.
    sh:path dcterms:type ;
    sh:qualifiedValueShape [
      sh:in (
        fibo-loan-reln-org:AmortizationType-adjustableRate
        fibo-loan-reln-org:AmortizationType-fixedRate
        fibo-loan-reln-org:AmortizationType-graduatedPayment
        fibo-loan-reln-org:AmortizationType-graduatedPaymentAdjustable
        fibo-loan-reln-org:AmortizationType-growingEquity
        fibo-loan-reln-org:AmortizationType-rateImprovement
        fibo-loan-reln-org:AmortizationType-step
      )
    ] ;
    sh:qualifiedMinCount 1 ;
    sh:qualifiedMaxCount 1 ;
    sh:message "exactly one FIBO AmortizationType individual is required" ;
  ] ;
  # Facet: cash-out status is CONDITIONAL - exactly one on refinance
  # applications, none otherwise (URLA section 4a).
  sh:or (
    [
      sh:property [
        sh:path dcterms:type ;
        sh:hasValue fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing ;
      ] ;
      sh:property [
        sh:path dcterms:type ;
        sh:qualifiedValueShape [
          sh:in (
            fibo-loan-reln-org:CashOutStatus-CashOut
            fibo-loan-reln-org:CashOutStatus-LimitedCashOut
            fibo-loan-reln-org:CashOutStatus-NoCashOut
          )
        ] ;
        sh:qualifiedMinCount 1 ;
        sh:qualifiedMaxCount 1 ;
      ] ;
    ]
    [
      sh:not [
        sh:property [
          sh:path dcterms:type ;
          sh:hasValue fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing ;
        ] ;
      ] ;
      sh:property [
        sh:path dcterms:type ;
        sh:qualifiedValueShape [
          sh:in (
            fibo-loan-reln-org:CashOutStatus-CashOut
            fibo-loan-reln-org:CashOutStatus-LimitedCashOut
            fibo-loan-reln-org:CashOutStatus-NoCashOut
          )
        ] ;
        sh:qualifiedMaxCount 0 ;
      ] ;
    ]
  ) .
`,
  "loan-estimate": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/> .
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/> .

# mortgage/juniper/loan-estimate: the Loan Estimate summary the creditor writes to the pod
# (12 CFR 1026.19(e)). dcterms:issued is the delivery date, which must fall within three
# business days of mort:applicationDate (checked against the demo calendar, not in SHACL).
# schema:expires is the date the estimate lapses if the consumer has not said they intend to
# proceed (ten business days after delivery).
mshape:LoanEstimateShape
  a sh:NodeShape ;
  sh:targetClass mort:LoanEstimate ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:LoanEstimate ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path fibo-fbc-dae-dbt:hasBorrower ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path mort:applicationDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
    sh:lessThan schema:expires ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path schema:expires ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:intentToProceedDate ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path fibo-loan-ln-ln:hasPrincipalAmount ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path schema:interestRate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:decimal ;
    sh:minInclusive 0.0 ;
    sh:maxInclusive 25.0 ;
    sh:message "interestRate is the note rate in percent (e.g. 6.5)" ;
  ] ;
  sh:property [
    sh:path mort:loanTermMonths ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 12 ;
    sh:maxInclusive 480 ;
  ] ;
  sh:property [
    sh:path mort:annualPercentageRate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:decimal ;
    sh:minInclusive 0.0 ;
    sh:maxInclusive 40.0 ;
  ] ;
  sh:property [
    sh:path mort:monthlyPrincipalAndInterest ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:estimatedTotalMonthlyPayment ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path fibo-loan-ln-ln:hasTotalClosingCosts ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:cashToClose ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] .
`,
  "odrl-policy": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# policies/<grant>: the ODRL Agreement the wallet writes with each grant. dcterms:source is
# the request it answers.
mshape:OdrlPolicyShape
  a sh:NodeShape ;
  sh:targetClass odrl:Agreement ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue odrl:Agreement ;
  ] ;
  sh:property [
    # The grant code shown in the Lens (G1 to G8).
    sh:path schema:identifier ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path dcterms:description ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path odrl:assigner ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path odrl:assignee ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path odrl:permission ;
    sh:minCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PermissionShape ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path dcterms:source ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] .
`,
  "payment-mandate": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# banking/payment-mandate: the borrower's autopay instruction. Read by the servicer (G8).
mshape:PaymentMandateShape
  a sh:NodeShape ;
  sh:targetClass mort:PaymentMandate ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:PaymentMandate ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path mort:payee ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path mort:accountLast4 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:pattern "^[0-9]{4}$" ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:provider ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:OrganizationShape ;
  ] ;
  sh:property [
    sh:path schema:amount ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:debitDayOfMonth ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 1 ;
    sh:maxInclusive 28 ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .
`,
  "purchase-agreement": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# property/purchase-agreement: the executed contract (seeded). Read by the lender (G4),
# the appraiser (G5) and the title agent (G6).
mshape:PurchaseAgreementShape
  a sh:NodeShape ;
  sh:targetClass mort:PurchaseAgreement ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:PurchaseAgreement ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:buyer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path schema:seller ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:NamedPartyShape ;
  ] ;
  sh:property [
    sh:path mort:purchasePrice ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:earnestMoneyDeposit ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:closingDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] .
`,
  "recorded-instrument": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# A public land record in the county's own store (public read).
mshape:RecordedInstrumentShape
  a sh:NodeShape ;
  sh:targetClass mort:RecordedInstrument ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:RecordedInstrument ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:recordingReference ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:recordedAt ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path mort:grantor ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:grantee ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:parcelNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] .
`,
  "recording-receipt": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# mortgage/closing/recording-receipt: the settlement agent's receipt. mort:recordedInstrument
# links to the county's public records; nothing from the pod is in the register.
mshape:RecordingReceiptShape
  a sh:NodeShape ;
  sh:targetClass mort:RecordingReceipt ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:RecordingReceipt ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path mort:recordedInstrument ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path mort:recordingReference ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] .
`,
  "score-notice": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/> .

# mortgage/juniper/score-notice: the scores the lender used, with the notice to the home loan
# applicant (15 U.S.C. 1681g(g)).
mshape:CreditScoreNoticeShape
  a sh:NodeShape ;
  sh:targetClass mort:CreditScoreNotice ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:CreditScoreNotice ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path fibo-fbc-dae-dbt:hasBorrower ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:scoreDisclosure ;
    sh:minCount 1 ;
    sh:maxCount 3 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:ScoreDisclosureShape ;
  ] ;
  sh:property [
    sh:path schema:description ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .
`,
  "service-order": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# An order in an organisation's own records (schema:customer orders from schema:seller).
mshape:ServiceOrderShape
  a sh:NodeShape ;
  sh:targetClass schema:Order ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:Order ;
  ] ;
  sh:property [
    sh:path schema:orderNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path dcterms:type ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( mort:ServiceKind-CreditReport mort:ServiceKind-Appraisal mort:ServiceKind-Title mort:ServiceKind-FloodDetermination mort:ServiceKind-TaxTranscripts ) ;
  ] ;
  sh:property [
    sh:path schema:customer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path schema:seller ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path schema:orderDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path schema:orderStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( schema:OrderProcessing schema:OrderDelivered ) ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:authorisedBy ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path schema:description ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .
`,
  "servicing-notice": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/> .

# A servicing transfer notice (12 CFR 1024.33(b)) or an ownership transfer notice
# (12 CFR 1026.39). dcterms:type says which.
mshape:LoanTransferNoticeShape
  a sh:NodeShape ;
  sh:targetClass mort:LoanTransferNotice ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:LoanTransferNotice ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path dcterms:type ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( mort:NoticeKind-ServicingTransferFromTransferor mort:NoticeKind-ServicingTransferFromTransferee mort:NoticeKind-OwnershipTransfer ) ;
    sh:message "dcterms:type must be a concept from mort:NoticeKindScheme" ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path fibo-fbc-dae-dbt:hasBorrower ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:transferEffectiveDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:transferor ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:OrganizationShape ;
  ] ;
  sh:property [
    sh:path mort:transferee ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:OrganizationShape ;
  ] ;
  sh:property [
    sh:path mort:paymentProtectionEnds ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path schema:telephone ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:description ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .
`,
  "settlement-statement": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/> .
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/> .

# mortgage/closing/settlement-statement: written by the settlement agent at closing.
mshape:SettlementStatementShape
  a sh:NodeShape ;
  sh:targetClass mort:SettlementStatement ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue mort:SettlementStatement ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:identifier ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:loanNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path fibo-fbc-dae-dbt:hasBorrower ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:closingDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:disbursementDate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:purchasePrice ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path fibo-loan-ln-ln:hasPrincipalAmount ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:lineItem ;
    sh:minCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:LineItemShape ;
  ] ;
  sh:property [
    sh:path mort:cashToClose ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] .
`,
  "subject-property": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-fnd-plc-rp: <https://spec.edmcouncil.org/fibo/ontology/FND/Places/RealProperty/> .

# property/subject-property: facts about the home (seeded). Read by the lender (G4), the
# appraiser (G5) and the insurer (G7). The node is also a fibo-fnd-plc-rp:RealEstate.
mshape:SubjectPropertyShape
  a sh:NodeShape ;
  sh:targetClass schema:SingleFamilyResidence ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:SingleFamilyResidence ;
  ] ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue fibo-fnd-plc-rp:RealEstate ;
  ] ;
  sh:property [
    sh:path schema:address ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PostalAddressShape ;
  ] ;
  sh:property [
    sh:path schema:yearBuilt ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 1600 ;
    sh:maxInclusive 2100 ;
  ] ;
  sh:property [
    sh:path schema:floorSize ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:FloorSizeShape ;
  ] ;
  sh:property [
    sh:path schema:numberOfBedrooms ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 0 ;
    sh:maxInclusive 50 ;
  ] ;
  sh:property [
    sh:path schema:numberOfBathroomsTotal ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 0 ;
    sh:maxInclusive 50 ;
  ] ;
  sh:property [
    sh:path mort:constructionType ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:roofType ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:parcelNumber ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:legalDescription ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .
`,
  support: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix sec: <https://w3id.org/security#> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ldp: <http://www.w3.org/ns/ldp#> .
@prefix pim: <http://www.w3.org/ns/pim/space#> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# Support shapes of the static rebuild (decision 0017), referenced via sh:node.
# None declares a target.
# 
# A party known only by name (a seller, a current title holder).
mshape:NamedPartyShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .

# One named amount: a settlement charge or credit, or an escrow item.
# A credit to the borrower is a negative value.
mshape:LineItemShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:MonetaryAmount ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path schema:value ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:decimal ;
  ] ;
  sh:property [
    sh:path schema:currency ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( "USD" ) ;
  ] .

# Living area as a schema:QuantitativeValue in square feet (UN/CEFACT code FTK).
mshape:FloorSizeShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue schema:QuantitativeValue ;
  ] ;
  sh:property [
    sh:path schema:value ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:decimal ;
    sh:minInclusive 1.0 ;
  ] ;
  sh:property [
    sh:path schema:unitCode ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( "FTK" ) ;
  ] .

# One disclosed credit score (15 U.S.C. 1681g(g)(1)(A)): the score, the model, the date it was
# created, the file it came from and up to five key factors (four, plus inquiries when they count).
mshape:ScoreDisclosureShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path mort:creditScoreValue ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 300 ;
    sh:maxInclusive 850 ;
  ] ;
  sh:property [
    sh:path mort:scoreModel ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( mort:ScoreModel-FICO8 mort:ScoreModel-ClassicFICO mort:ScoreModel-VantageScore4 ) ;
  ] ;
  sh:property [
    # The consumer reporting agency file the score was calculated from.
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path dcterms:created ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:keyFactor ;
    sh:maxCount 5 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .

# An ODRL constraint on a permission: its purpose (a DPV purpose), a fixed end (odrl:dateTime)
# or an event that ends it (odrl:event with a concept from mort:GrantEndScheme).
mshape:ConstraintShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path odrl:leftOperand ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( odrl:purpose odrl:dateTime odrl:event ) ;
  ] ;
  sh:property [
    sh:path odrl:operator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( odrl:eq odrl:lt odrl:lteq ) ;
  ] ;
  sh:property [
    sh:path odrl:rightOperand ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
  ] .

# One ODRL permission: who (assignee) may do what (actions mapped to the WAC modes the wallet
# writes: read, append, write) to which pod resources, under which constraints.
mshape:PermissionShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path odrl:target ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path odrl:action ;
    sh:minCount 1 ;
    sh:maxCount 3 ;
    sh:nodeKind sh:IRI ;
    sh:in ( odrl:read odrl:append odrl:write ) ;
  ] ;
  sh:property [
    sh:path odrl:assignee ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path odrl:constraint ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:ConstraintShape ;
  ] .

# The person or organisation a WebID profile document describes. sec:verificationMethod and
# sec:assertionMethod point at the issuer's published Multikey (written by vc-kit).
mshape:AgentShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:minCount 1 ;
    sh:in ( schema:Person schema:Organization foaf:Agent ) ;
  ] ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path ldp:inbox ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path pim:storage ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path sec:verificationMethod ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path sec:assertionMethod ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path mort:titleVesting ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .
`,
  "title-clear-credential": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix cred: <https://www.w3.org/2018/credentials#> .
@prefix sec: <https://w3id.org/security#> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# Resource 6 (vocab.md section 5): title-clear VC issued by the title company
# (First American-modelled property app). No clear-title concept exists in
# released FIBO modules, so the outcome is the mort:titleStatus SKOS scheme.
mshape:TitleClearCredentialShape
  a sh:NodeShape ;
  sh:targetClass mort:TitleClearCredential ;
  sh:closed true ;
  sh:ignoredProperties ( sec:proof ) ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue cred:VerifiableCredential ;
  ] ;
  sh:property [
    sh:path cred:issuer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path cred:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:lessThan cred:validUntil ;
  ] ;
  sh:property [
    sh:path cred:validUntil ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path cred:credentialStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:TitleClearSubjectShape ;
  ] ;
  sh:property [
    # Optional reference to the underlying title search report (external pod
    # resource; found encumbrance records live there).
    sh:path cred:evidence ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSchema ;
    sh:nodeKind sh:IRI ;
  ] .

mshape:TitleClearSubjectShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] ;
  sh:property [
    sh:path mort:titleStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( mort:TitleStatus-Clear mort:TitleStatus-Clouded ) ;
    sh:message "titleStatus must be a concept from mort:TitleStatusScheme" ;
  ] ;
  sh:property [
    sh:path mort:searchedThrough ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
    sh:message "searchedThrough is the effective xsd:date through which public records were searched" ;
  ] .
`,
  "title-commitment-credential": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix cred: <https://www.w3.org/2018/credentials#> .
@prefix sec: <https://w3id.org/security#> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# Title commitment (replaces the title clear credential): an ALTA-shaped commitment with
# Schedule A, Schedule B Part I requirements and Part II exceptions.
mshape:TitleCommitmentCredentialShape
  a sh:NodeShape ;
  sh:targetClass mort:TitleCommitmentCredential ;
  sh:closed true ;
  sh:ignoredProperties ( sec:proof ) ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue cred:VerifiableCredential ;
  ] ;
  sh:property [
    sh:path cred:issuer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path cred:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:lessThan cred:validUntil ;
  ] ;
  sh:property [
    sh:path cred:validUntil ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path cred:credentialStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:TitleCommitmentSubjectShape ;
  ] ;
  sh:property [
    sh:path cred:evidence ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSchema ;
    sh:nodeKind sh:IRI ;
  ] .

mshape:TitleCommitmentSubjectShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    sh:path schema:identifier ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:subjectProperty ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:PropertyShape ;
  ] ;
  sh:property [
    sh:path mort:searchedThrough ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:date ;
  ] ;
  sh:property [
    sh:path mort:vestedOwner ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:proposedInsured ;
    sh:minCount 1 ;
    sh:maxCount 2 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:ownerPolicyAmount ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:loanPolicyAmount ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    sh:path mort:titleRequirement ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path mort:titleException ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] .
`,
  "underwriting-decision": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .
@prefix fibo-loan-ln-app: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/> .
@prefix fibo-fnd-rel-rel: <https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/> .

# Resource 8 (vocab.md section 5): the underwriting decision the lender writes
# back to the pod (scenes 3-4). The lender-facing outcome is the
# mort:decisionStatus SKOS scheme (approved / approved-with-conditions /
# denied / suspended - URLA-facing statuses FIBO does not provide); the FIBO
# UnderwritingDecision-* named individuals are the AUS recommendation codes
# (Freddie-LPA-modelled gse app, scene 4), attached via dcterms:type.
mshape:UnderwritingDecisionShape
  a sh:NodeShape ;
  sh:targetClass fibo-loan-ln-app:UnderwritingDecision ;
  sh:closed true ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue fibo-loan-ln-app:UnderwritingDecision ;
  ] ;
  sh:property [
    # The loan application this decision evaluates (pod resource IRI).
    sh:path fibo-fnd-rel-rel:evaluates ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path mort:decisionStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in (
      mort:DecisionStatus-Approved
      mort:DecisionStatus-ApprovedWithConditions
      mort:DecisionStatus-Denied
      mort:DecisionStatus-Suspended
    ) ;
    sh:message "decisionStatus must be a concept from mort:DecisionStatusScheme" ;
  ] ;
  sh:property [
    sh:path mort:underwritingCondition ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
  ] ;
  sh:property [
    sh:path fibo-loan-ln-app:hasApprovedAmount ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
    sh:node mshape:MonetaryAmountShape ;
  ] ;
  sh:property [
    # Optional AUS recommendation code (FIBO named individuals).
    sh:path dcterms:type ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in (
      fibo-loan-ln-app:UnderwritingDecision-Approve
      fibo-loan-ln-app:UnderwritingDecision-Deny
      fibo-loan-ln-app:UnderwritingDecision-Eligible
      fibo-loan-ln-app:UnderwritingDecision-Ineligible
      fibo-loan-ln-app:UnderwritingDecision-Refer
      fibo-loan-ln-app:UnderwritingDecision-UnableToDetermine
    ) ;
    sh:message "the AUS recommendation must be a FIBO UnderwritingDecision named individual" ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    # The deciding lender (or AUS) WebID.
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] .
`,
  "zk-operand-anchor": `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix cred: <https://www.w3.org/2018/credentials#> .
@prefix sec: <https://w3id.org/security#> .
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#> .
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#> .

# Decision 0012: the issuer-signed operand-anchor VC that makes Tier A live
# filter proofs forgery-resistant. A bare filter proof is fully forgeable
# (operand_enc is deterministic and salt-free); verifiers MUST check anchor
# signature + issuer trust + status + subject WebID == authenticated presenter
# + anchor.operandEnc == proof public input + challenge freshness. Never ship a
# Tier A surface without the anchor check. cred:credentialStatus points at the
# ZK rail's own Schnorr-bound list (<=1024 entries), not the W3C bitstring
# list, so its entry node is not type-pinned here.
mshape:ZkOperandAnchorShape
  a sh:NodeShape ;
  sh:targetClass mort:ZkOperandAnchor ;
  sh:closed true ;
  sh:ignoredProperties ( sec:proof ) ;
  sh:property [
    sh:path rdf:type ;
    sh:hasValue cred:VerifiableCredential ;
  ] ;
  sh:property [
    sh:path cred:issuer ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path cred:validFrom ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:lessThan cred:validUntil ;
  ] ;
  sh:property [
    # Anchors are revoked via credentialStatus rather than expiring, but an
    # explicit window is permitted.
    sh:path cred:validUntil ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
  ] ;
  sh:property [
    sh:path cred:credentialStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:BlankNodeOrIRI ;
  ] ;
  sh:property [
    sh:path cred:credentialSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:node mshape:ZkOperandAnchorSubjectShape ;
    sh:message "credentialSubject must be the holder WebID the verifier matches against the DPoP-bound session" ;
  ] ;
  sh:property [
    sh:path cred:credentialSchema ;
    sh:nodeKind sh:IRI ;
  ] .

mshape:ZkOperandAnchorSubjectShape
  a sh:NodeShape ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [
    # Only decision 0005's ZK scaled-unit fields are anchorable. This list must
    # stay equal to ZK_FIELD_BUDGETS in src/zk-budgets.ts (test-enforced).
    sh:path mort:field ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( mort:monthlyGrossIncomeUsd mort:totalMonthlyDebtUsd mort:creditScoreValue ) ;
    sh:message "field must be one of decision 0005's ZK scaled-unit field IRIs" ;
  ] ;
  sh:property [
    # Deterministic salt-free sparq term encoding: 0x-prefixed lowercase hex
    # field element, equal to the filter circuit's public operand_enc input.
    sh:path mort:operandEnc ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:pattern "^0x[0-9a-f]{1,64}$" ;
    sh:message "operandEnc must be a 0x-prefixed lowercase hex field element" ;
  ] .
`,
} as const;

/** Document keys of the bundled SHACL shapes. */
export type ShapesDocumentKey = keyof typeof SHAPES_TURTLE;

/** Every bundled shapes document, in one Turtle-parseable list. */
export const ALL_SHAPES_DOCUMENTS: readonly string[] = Object.values(SHAPES_TURTLE);

/** File stem of the 36 bundled shapes documents. */
export const SHAPES_DOCUMENT_KEYS = Object.keys(SHAPES_TURTLE) as readonly ShapesDocumentKey[];
