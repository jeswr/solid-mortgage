// Generated from shapes/*.ttl by scripts/generate-shapes.mjs - DO NOT EDIT.
// Regenerate from packages/data-model: node scripts/generate-shapes.mjs

/**
 * Turtle source of every SHACL shapes document, keyed by its file stem in
 * shapes/ ("common" holds the shared support shapes the resource shapes
 * reference via sh:node).
 */
export const SHAPES_TURTLE = {
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
    sh:path odrl:target ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dpv:hasConsentStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( dpv:ConsentGiven dpv:ConsentWithdrawn ) ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path dcterms:issued ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
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

/** File stem of the 12 bundled shapes documents. */
export const SHAPES_DOCUMENT_KEYS = Object.keys(SHAPES_TURTLE) as readonly ShapesDocumentKey[];
