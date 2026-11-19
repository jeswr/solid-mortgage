// Generated from shapes/*.ttl by scripts/generate-shapes.mjs - DO NOT EDIT.
// Regenerate from packages/data-model: node scripts/generate-shapes.mjs

/**
 * Turtle source of every SHACL shapes document, keyed by its file stem in
 * shapes/ ("common" holds the shared support shapes the resource shapes
 * reference via sh:node).
 */
export const SHAPES_TURTLE = {
  "access-request": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix odrl: <http://www.w3.org/ns/odrl/2/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:AccessRequestShape a sh:NodeShape;
    sh:targetClass odrl:Request;
    sh:closed true.
_:n3-0 sh:path rdf:type;
    sh:hasValue odrl:Request.
mshape:AccessRequestShape sh:property _:n3-0.
_:n3-1 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AccessRequestShape sh:property _:n3-1.
_:n3-2 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AccessRequestShape sh:property _:n3-2.
_:n3-3 sh:path dcterms:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AccessRequestShape sh:property _:n3-3.
_:n3-4 sh:path odrl:assigner;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AccessRequestShape sh:property _:n3-4.
_:n3-5 sh:path odrl:assignee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AccessRequestShape sh:property _:n3-5.
_:n3-6 sh:path odrl:permission;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PermissionShape.
mshape:AccessRequestShape sh:property _:n3-6.
_:n3-7 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AccessRequestShape sh:property _:n3-7.
`,
  "agent-profile": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:AgentProfileShape a sh:NodeShape;
    sh:targetClass foaf:PersonalProfileDocument;
    sh:closed true.
_:n3-8 sh:path rdf:type;
    sh:hasValue foaf:PersonalProfileDocument.
mshape:AgentProfileShape sh:property _:n3-8.
_:n3-9 sh:path foaf:primaryTopic;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:AgentShape.
mshape:AgentProfileShape sh:property _:n3-9.
`,
  "appraisal-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix schema: <https://schema.org/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fnd-arr-asmt: <https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/>.
@prefix fibo-fnd-rel-rel: <https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/>.

mshape:AppraisalCredentialShape a sh:NodeShape;
    sh:targetClass mort:AppraisalCredential;
    sh:closed true.
_:n3-10 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:AppraisalCredentialShape sh:ignoredProperties _:n3-10.
_:n3-11 sh:message "the appraisal evidence must evaluate the credentialSubject's mort:subjectProperty";
    sh:select "\\n      SELECT $this ?value WHERE {\\n        $this <https://www.w3.org/2018/credentials#evidence> ?report .\\n        ?report <https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/evaluates> ?value .\\n        $this <https://www.w3.org/2018/credentials#credentialSubject> ?subject .\\n        ?subject <https://solid-mortgage-vocab.vercel.app/mort#subjectProperty> ?property .\\n        FILTER (?value != ?property)\\n      }\\n    ".
mshape:AppraisalCredentialShape sh:sparql _:n3-11.
_:n3-12 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:AppraisalCredentialShape sh:property _:n3-12.
_:n3-13 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AppraisalCredentialShape sh:property _:n3-13.
_:n3-14 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:AppraisalCredentialShape sh:property _:n3-14.
_:n3-15 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AppraisalCredentialShape sh:property _:n3-15.
_:n3-16 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:AppraisalCredentialShape sh:property _:n3-16.
_:n3-17 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:AppraisalSubjectShape.
mshape:AppraisalCredentialShape sh:property _:n3-17.
_:n3-18 sh:path cred:evidence;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraisalEvidenceShape.
mshape:AppraisalCredentialShape sh:property _:n3-18.
_:n3-19 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:AppraisalCredentialShape sh:property _:n3-19.
mshape:AppraisalSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-20 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:AppraisalSubjectShape sh:ignoredProperties _:n3-20.
_:n3-21 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraisedPropertyShape.
mshape:AppraisalSubjectShape sh:property _:n3-21.
mshape:AppraisalEvidenceShape a sh:NodeShape;
    sh:closed true.
_:n3-22 sh:path rdf:type;
    sh:hasValue fibo-fnd-arr-asmt:Appraisal.
mshape:AppraisalEvidenceShape sh:property _:n3-22.
_:n3-23 sh:path fibo-fnd-rel-rel:evaluates;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:AppraisalEvidenceShape sh:property _:n3-23.
_:n3-24 sh:path fibo-fnd-rel-rel:isGeneratedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraiserShape.
mshape:AppraisalEvidenceShape sh:property _:n3-24.
_:n3-25 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:AppraisalEvidenceShape sh:property _:n3-25.
mshape:AppraiserShape a sh:NodeShape;
    sh:closed true.
_:n3-26 sh:path rdf:type;
    sh:hasValue fibo-fnd-arr-asmt:Appraiser.
mshape:AppraiserShape sh:property _:n3-26.
_:n3-27 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AppraiserShape sh:property _:n3-27.
_:n3-28 sh:path mort:appraiserLicenseId;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 4.
mshape:AppraiserShape sh:property _:n3-28.
`,
  "asset-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix schema: <https://schema.org/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:AssetCredentialShape a sh:NodeShape;
    sh:targetClass mort:AssetCredential;
    sh:closed true.
_:n3-29 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:AssetCredentialShape sh:ignoredProperties _:n3-29.
_:n3-30 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:AssetCredentialShape sh:property _:n3-30.
_:n3-31 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AssetCredentialShape sh:property _:n3-31.
_:n3-32 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:AssetCredentialShape sh:property _:n3-32.
_:n3-33 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AssetCredentialShape sh:property _:n3-33.
_:n3-34 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:AssetCredentialShape sh:property _:n3-34.
_:n3-35 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:AssetSubjectShape.
mshape:AssetCredentialShape sh:property _:n3-35.
_:n3-36 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:AssetCredentialShape sh:property _:n3-36.
mshape:AssetSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-37 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:AssetSubjectShape sh:ignoredProperties _:n3-37.
_:n3-38 sh:path schema:owns;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:DepositAccountShape.
mshape:AssetSubjectShape sh:property _:n3-38.
mshape:DepositAccountShape a sh:NodeShape;
    sh:closed true.
_:n3-39 sh:path rdf:type;
    sh:hasValue schema:DepositAccount.
mshape:DepositAccountShape sh:property _:n3-39.
_:n3-40 sh:path schema:provider;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:DepositAccountShape sh:property _:n3-40.
_:n3-41 sh:path schema:amount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:DepositAccountShape sh:property _:n3-41.
_:n3-42 sh:path mort:accountLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:message "accountLast4 must be exactly four digits".
mshape:DepositAccountShape sh:property _:n3-42.
`,
  "borrower-profile": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.

mshape:BorrowerProfileShape a sh:NodeShape;
    sh:targetClass fibo-fbc-dae-dbt:Borrower;
    sh:closed true.
_:n3-43 sh:path rdf:type;
    sh:hasValue schema:Person.
mshape:BorrowerProfileShape sh:property _:n3-43.
_:n3-44 sh:path rdf:type;
    sh:hasValue fibo-fbc-dae-dbt:Borrower.
mshape:BorrowerProfileShape sh:property _:n3-44.
_:n3-45 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:BorrowerProfileShape sh:property _:n3-45.
_:n3-46 sh:path schema:birthDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:BorrowerProfileShape sh:property _:n3-46.
_:n3-47 sh:path schema:email;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[^@\\\\s]+@[^@\\\\s]+\\\\.[^@\\\\s]+$".
mshape:BorrowerProfileShape sh:property _:n3-47.
_:n3-48 sh:path schema:telephone;
    sh:maxCount 1;
    sh:datatype xsd:string.
mshape:BorrowerProfileShape sh:property _:n3-48.
_:n3-49 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:BorrowerProfileShape sh:property _:n3-49.
_:n3-50 sh:path mort:maritalStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-51 rdf:first mort:MaritalStatus-Married;
    rdf:rest _:n3-52.
_:n3-52 rdf:first mort:MaritalStatus-Separated;
    rdf:rest _:n3-53.
_:n3-53 rdf:first mort:MaritalStatus-Unmarried;
    rdf:rest rdf:nil.
_:n3-50 sh:in _:n3-51;
    sh:message "maritalStatus must be a concept from mort:MaritalStatusScheme (URLA section 1a)".
mshape:BorrowerProfileShape sh:property _:n3-50.
`,
  "closing-disclosure": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/>.

mshape:ClosingDisclosureShape a sh:NodeShape;
    sh:targetClass mort:ClosingDisclosure;
    sh:closed true.
_:n3-54 sh:path rdf:type;
    sh:hasValue mort:ClosingDisclosure.
mshape:ClosingDisclosureShape sh:property _:n3-54.
_:n3-55 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingDisclosureShape sh:property _:n3-55.
_:n3-56 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingDisclosureShape sh:property _:n3-56.
_:n3-57 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosingDisclosureShape sh:property _:n3-57.
_:n3-58 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosingDisclosureShape sh:property _:n3-58.
_:n3-59 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-59.
_:n3-60 sh:path mort:receivedDate;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-60.
_:n3-61 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-61.
_:n3-62 sh:path mort:disbursementDate;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-62.
_:n3-63 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-63.
_:n3-64 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 6.5)".
mshape:ClosingDisclosureShape sh:property _:n3-64.
_:n3-65 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:ClosingDisclosureShape sh:property _:n3-65.
_:n3-66 sh:path mort:annualPercentageRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 40.0.
mshape:ClosingDisclosureShape sh:property _:n3-66.
_:n3-67 sh:path mort:monthlyPrincipalAndInterest;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-67.
_:n3-68 sh:path mort:estimatedTotalMonthlyPayment;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-68.
_:n3-69 sh:path fibo-loan-ln-ln:hasTotalClosingCosts;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-69.
_:n3-70 sh:path mort:cashToClose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-70.
_:n3-71 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:ClosingDisclosureShape sh:property _:n3-71.
`,
  "closing-record": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/>.
@prefix fibo-loan-reln-mtg: <https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/Mortgages/>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.

mshape:ClosingRecordShape a sh:NodeShape;
    sh:targetClass fibo-loan-reln-mtg:Mortgage;
    sh:closed true.
_:n3-72 sh:path rdf:type;
    sh:hasValue fibo-loan-reln-mtg:Mortgage.
mshape:ClosingRecordShape sh:property _:n3-72.
_:n3-73 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosingRecordShape sh:property _:n3-73.
_:n3-74 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:ClosingRecordShape sh:property _:n3-74.
_:n3-75 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingRecordShape sh:property _:n3-75.
_:n3-76 sh:path fibo-loan-ln-ln:hasTotalClosingCosts;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingRecordShape sh:property _:n3-76.
_:n3-77 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 6.125)".
mshape:ClosingRecordShape sh:property _:n3-77.
_:n3-78 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:ClosingRecordShape sh:property _:n3-78.
_:n3-79 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingRecordShape sh:property _:n3-79.
_:n3-80 sh:path mort:recordingReference;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingRecordShape sh:property _:n3-80.
_:n3-81 sh:path mort:eNoteReference;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingRecordShape sh:property _:n3-81.
_:n3-82 sh:path fibo-loan-ln-ln:isServicedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:ClosingRecordShape sh:property _:n3-82.
`,
  common: `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fnd-arr-asmt: <https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/>.
@prefix fibo-fnd-plc-rp: <https://spec.edmcouncil.org/fibo/ontology/FND/Places/RealProperty/>.

mshape:PostalAddressShape a sh:NodeShape;
    sh:closed true.
_:n3-83 sh:path rdf:type;
    sh:hasValue schema:PostalAddress.
mshape:PostalAddressShape sh:property _:n3-83.
_:n3-84 sh:path schema:streetAddress;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PostalAddressShape sh:property _:n3-84.
_:n3-85 sh:path schema:addressLocality;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PostalAddressShape sh:property _:n3-85.
_:n3-86 sh:path schema:addressRegion;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[A-Z]{2}$";
    sh:message "addressRegion must be a two-letter US state code".
mshape:PostalAddressShape sh:property _:n3-86.
_:n3-87 sh:path schema:postalCode;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{5}(-[0-9]{4})?$";
    sh:message "postalCode must be a US ZIP or ZIP+4".
mshape:PostalAddressShape sh:property _:n3-87.
mshape:OrganizationShape a sh:NodeShape;
    sh:closed true.
_:n3-88 sh:path rdf:type;
    sh:hasValue schema:Organization.
mshape:OrganizationShape sh:property _:n3-88.
_:n3-89 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OrganizationShape sh:property _:n3-89.
mshape:MonetaryAmountShape a sh:NodeShape;
    sh:closed true.
_:n3-90 sh:path rdf:type;
    sh:hasValue schema:MonetaryAmount.
mshape:MonetaryAmountShape sh:property _:n3-90.
_:n3-91 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:MonetaryAmountShape sh:property _:n3-91.
_:n3-92 sh:path schema:currency;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-93 rdf:first "USD";
    rdf:rest rdf:nil.
_:n3-92 sh:in _:n3-93.
mshape:MonetaryAmountShape sh:property _:n3-92.
mshape:AppraisedValueShape a sh:NodeShape;
    sh:closed true.
_:n3-94 sh:path rdf:type;
    sh:hasValue fibo-fnd-arr-asmt:AppraisedValue.
mshape:AppraisedValueShape sh:property _:n3-94.
_:n3-95 sh:path rdf:type;
    sh:hasValue schema:MonetaryAmount.
mshape:AppraisedValueShape sh:property _:n3-95.
_:n3-96 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:AppraisedValueShape sh:property _:n3-96.
_:n3-97 sh:path schema:currency;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-98 rdf:first "USD";
    rdf:rest rdf:nil.
_:n3-97 sh:in _:n3-98.
mshape:AppraisedValueShape sh:property _:n3-97.
mshape:PropertyShape a sh:NodeShape;
    sh:closed true.
_:n3-99 sh:path rdf:type;
    sh:hasValue fibo-fnd-plc-rp:RealEstate.
mshape:PropertyShape sh:property _:n3-99.
_:n3-100 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:PropertyShape sh:property _:n3-100.
_:n3-101 sh:path fibo-fnd-arr-asmt:hasEstimatedValue;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraisedValueShape.
mshape:PropertyShape sh:property _:n3-101.
mshape:AppraisedPropertyShape a sh:NodeShape;
    sh:node mshape:PropertyShape.
_:n3-102 sh:path fibo-fnd-arr-asmt:hasEstimatedValue;
    sh:minCount 1;
    sh:message "an appraised property must carry its appraised value".
mshape:AppraisedPropertyShape sh:property _:n3-102.
`,
  "consent-receipt": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix dpv: <https://w3id.org/dpv#>.
@prefix odrl: <http://www.w3.org/ns/odrl/2/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:ConsentReceiptShape a sh:NodeShape;
    sh:targetClass dpv:ConsentReceipt;
    sh:closed true.
_:n3-103 sh:path rdf:type;
    sh:hasValue dpv:ConsentReceipt.
mshape:ConsentReceiptShape sh:property _:n3-103.
_:n3-104 sh:path dpv:hasDataSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-104.
_:n3-105 sh:path dpv:hasDataController;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-105.
_:n3-106 sh:path odrl:target;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-106.
_:n3-107 sh:path dpv:hasPolicy;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-107.
_:n3-108 sh:path dpv:hasPurpose;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-108.
_:n3-109 sh:path dpv:hasConsentStatus;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-110 rdf:first dpv:ConsentGiven;
    rdf:rest _:n3-111.
_:n3-111 rdf:first dpv:ConsentWithdrawn;
    rdf:rest _:n3-112.
_:n3-112 rdf:first dpv:ConsentExpired;
    rdf:rest rdf:nil.
_:n3-109 sh:in _:n3-110;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-109.
_:n3-113 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:ConsentReceiptShape sh:property _:n3-113.
`,
  "contact-details": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:ContactDetailsShape a sh:NodeShape;
    sh:targetClass schema:ContactPoint;
    sh:closed true.
_:n3-114 sh:path rdf:type;
    sh:hasValue schema:ContactPoint.
mshape:ContactDetailsShape sh:property _:n3-114.
_:n3-115 sh:path schema:email;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ContactDetailsShape sh:property _:n3-115.
_:n3-116 sh:path schema:telephone;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ContactDetailsShape sh:property _:n3-116.
_:n3-117 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:ContactDetailsShape sh:property _:n3-117.
`,
  "credential-pointer": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:CredentialPointerShape a sh:NodeShape;
    sh:targetClass mort:CredentialPointer;
    sh:closed true.
_:n3-118 sh:path rdf:type;
    sh:hasValue mort:CredentialPointer.
mshape:CredentialPointerShape sh:property _:n3-118.
_:n3-119 sh:path schema:url;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CredentialPointerShape sh:property _:n3-119.
_:n3-120 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CredentialPointerShape sh:property _:n3-120.
_:n3-121 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CredentialPointerShape sh:property _:n3-121.
_:n3-122 sh:path schema:sha256;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9a-f]{64}$";
    sh:minLength 1.
mshape:CredentialPointerShape sh:property _:n3-122.
_:n3-123 sh:path mort:asOf;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CredentialPointerShape sh:property _:n3-123.
_:n3-124 sh:path mort:signatureVerified;
    sh:maxCount 1;
    sh:datatype xsd:boolean.
mshape:CredentialPointerShape sh:property _:n3-124.
_:n3-125 sh:path mort:statusChecked;
    sh:maxCount 1;
    sh:datatype xsd:boolean.
mshape:CredentialPointerShape sh:property _:n3-125.
_:n3-126 sh:path mort:checkedAt;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CredentialPointerShape sh:property _:n3-126.
_:n3-127 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CredentialPointerShape sh:property _:n3-127.
`,
  "credit-report": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.

mshape:CreditReportShape a sh:NodeShape;
    sh:targetClass mort:CreditReport;
    sh:closed true.
_:n3-128 sh:path rdf:type;
    sh:hasValue mort:CreditReport.
mshape:CreditReportShape sh:property _:n3-128.
_:n3-129 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditReportShape sh:property _:n3-129.
_:n3-130 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditReportShape sh:property _:n3-130.
_:n3-131 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditReportShape sh:property _:n3-131.
_:n3-132 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditReportShape sh:property _:n3-132.
_:n3-133 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:CreditReportShape sh:property _:n3-133.
_:n3-134 sh:path mort:permissiblePurpose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditReportShape sh:property _:n3-134.
_:n3-135 sh:path mort:authorisedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditReportShape sh:property _:n3-135.
_:n3-136 sh:path mort:scoreDisclosure;
    sh:minCount 1;
    sh:maxCount 3;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ScoreDisclosureShape.
mshape:CreditReportShape sh:property _:n3-136.
_:n3-137 sh:path mort:totalMonthlyDebtUsd;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 9999.
mshape:CreditReportShape sh:property _:n3-137.
`,
  "credit-score-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:CreditScoreCredentialShape a sh:NodeShape;
    sh:targetClass mort:CreditScoreCredential;
    sh:closed true.
_:n3-138 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:CreditScoreCredentialShape sh:ignoredProperties _:n3-138.
_:n3-139 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:CreditScoreCredentialShape sh:property _:n3-139.
_:n3-140 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditScoreCredentialShape sh:property _:n3-140.
_:n3-141 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:CreditScoreCredentialShape sh:property _:n3-141.
_:n3-142 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CreditScoreCredentialShape sh:property _:n3-142.
_:n3-143 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:CreditScoreCredentialShape sh:property _:n3-143.
_:n3-144 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:CreditScoreSubjectShape.
mshape:CreditScoreCredentialShape sh:property _:n3-144.
_:n3-145 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:CreditScoreCredentialShape sh:property _:n3-145.
mshape:CreditScoreSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-146 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:CreditScoreSubjectShape sh:ignoredProperties _:n3-146.
_:n3-147 sh:path mort:creditScoreValue;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 300;
    sh:maxInclusive 850;
    sh:message "creditScoreValue must fit decision 0005's 3-digit budget (300..850)".
mshape:CreditScoreSubjectShape sh:property _:n3-147.
_:n3-148 sh:path mort:totalMonthlyDebtUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 9999;
    sh:message "totalMonthlyDebtUsd must fit decision 0005's 4-digit budget (0..9999 whole USD/month)".
mshape:CreditScoreSubjectShape sh:property _:n3-148.
_:n3-149 sh:path mort:scoreModel;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-150 rdf:first mort:ScoreModel-FICO8;
    rdf:rest rdf:nil.
_:n3-149 sh:in _:n3-150;
    sh:message "scoreModel must be a concept from mort:ScoreModelScheme".
mshape:CreditScoreSubjectShape sh:property _:n3-149.
`,
  document: `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:DocumentShape a sh:NodeShape;
    sh:targetClass schema:DigitalDocument;
    sh:closed true.
_:n3-151 sh:path rdf:type;
    sh:hasValue schema:DigitalDocument.
mshape:DocumentShape sh:property _:n3-151.
_:n3-152 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-152.
_:n3-153 sh:path schema:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-153.
_:n3-154 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DocumentShape sh:property _:n3-154.
_:n3-155 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:DocumentShape sh:property _:n3-155.
_:n3-156 sh:path schema:identifier;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-156.
_:n3-157 sh:path schema:about;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DocumentShape sh:property _:n3-157.
_:n3-158 sh:path schema:sha256;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9a-f]{64}$";
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-158.
_:n3-159 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-159.
_:n3-160 sh:path mort:subjectProperty;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:DocumentShape sh:property _:n3-160.
`,
  "employment-income-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix schema: <https://schema.org/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-loan-ln-app: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/>.

mshape:EmploymentIncomeCredentialShape a sh:NodeShape;
    sh:targetClass mort:EmploymentIncomeCredential;
    sh:closed true.
_:n3-161 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:EmploymentIncomeCredentialShape sh:ignoredProperties _:n3-161.
_:n3-162 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-162.
_:n3-163 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-163.
_:n3-164 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-164.
_:n3-165 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-165.
_:n3-166 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-166.
_:n3-167 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:EmploymentIncomeSubjectShape;
    sh:message "credentialSubject must be the borrower WebID (holder binding, decision 0012)".
mshape:EmploymentIncomeCredentialShape sh:property _:n3-167.
_:n3-168 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-168.
_:n3-169 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-169.
mshape:EmploymentIncomeSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-170 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:EmploymentIncomeSubjectShape sh:ignoredProperties _:n3-170.
_:n3-171 sh:path schema:worksFor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:EmploymentIncomeSubjectShape sh:property _:n3-171.
_:n3-172 sh:path schema:jobTitle;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EmploymentIncomeSubjectShape sh:property _:n3-172.
_:n3-173 sh:path schema:startDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:EmploymentIncomeSubjectShape sh:property _:n3-173.
_:n3-174 sh:path mort:monthlyGrossIncomeUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 9999;
    sh:message "monthlyGrossIncomeUsd must fit decision 0005's 4-digit budget (0..9999 whole USD/month)".
mshape:EmploymentIncomeSubjectShape sh:property _:n3-174.
`,
  "escrow-statement": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.

mshape:EscrowAccountStatementShape a sh:NodeShape;
    sh:targetClass mort:EscrowAccountStatement;
    sh:closed true.
_:n3-175 sh:path rdf:type;
    sh:hasValue mort:EscrowAccountStatement.
mshape:EscrowAccountStatementShape sh:property _:n3-175.
_:n3-176 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EscrowAccountStatementShape sh:property _:n3-176.
_:n3-177 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EscrowAccountStatementShape sh:property _:n3-177.
_:n3-178 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EscrowAccountStatementShape sh:property _:n3-178.
_:n3-179 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EscrowAccountStatementShape sh:property _:n3-179.
_:n3-180 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:EscrowAccountStatementShape sh:property _:n3-180.
_:n3-181 sh:path mort:monthlyEscrowPayment;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EscrowAccountStatementShape sh:property _:n3-181.
_:n3-182 sh:path mort:lineItem;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:LineItemShape.
mshape:EscrowAccountStatementShape sh:property _:n3-182.
`,
  "evidence-of-insurance-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:EvidenceOfInsuranceCredentialShape a sh:NodeShape;
    sh:targetClass mort:EvidenceOfInsuranceCredential;
    sh:closed true.
_:n3-183 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:EvidenceOfInsuranceCredentialShape sh:ignoredProperties _:n3-183.
_:n3-184 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-184.
_:n3-185 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-185.
_:n3-186 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-186.
_:n3-187 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-187.
_:n3-188 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-188.
_:n3-189 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:EvidenceOfInsuranceSubjectShape.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-189.
_:n3-190 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-190.
_:n3-191 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-191.
mshape:EvidenceOfInsuranceSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-192 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:EvidenceOfInsuranceSubjectShape sh:ignoredProperties _:n3-192.
_:n3-193 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-193.
_:n3-194 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-194.
_:n3-195 sh:path mort:dwellingCoverage;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-195.
_:n3-196 sh:path mort:annualPremium;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-196.
_:n3-197 sh:path mort:deductible;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-197.
_:n3-198 sh:path schema:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:lessThan schema:validThrough.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-198.
_:n3-199 sh:path schema:validThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-199.
_:n3-200 sh:path mort:mortgageeClause;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-200.
_:n3-201 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-201.
`,
  "identity-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:IdentityCredentialShape a sh:NodeShape;
    sh:targetClass mort:IdentityCredential;
    sh:closed true.
_:n3-202 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:IdentityCredentialShape sh:ignoredProperties _:n3-202.
_:n3-203 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:IdentityCredentialShape sh:property _:n3-203.
_:n3-204 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:IdentityCredentialShape sh:property _:n3-204.
_:n3-205 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:IdentityCredentialShape sh:property _:n3-205.
_:n3-206 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:IdentityCredentialShape sh:property _:n3-206.
_:n3-207 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:IdentityCredentialShape sh:property _:n3-207.
_:n3-208 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:IdentitySubjectShape.
mshape:IdentityCredentialShape sh:property _:n3-208.
_:n3-209 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:IdentityCredentialShape sh:property _:n3-209.
_:n3-210 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:IdentityCredentialShape sh:property _:n3-210.
mshape:IdentitySubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-211 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:IdentitySubjectShape sh:ignoredProperties _:n3-211.
_:n3-212 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:IdentitySubjectShape sh:property _:n3-212.
_:n3-213 sh:path schema:birthDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:IdentitySubjectShape sh:property _:n3-213.
_:n3-214 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:IdentitySubjectShape sh:property _:n3-214.
_:n3-215 sh:path mort:taxIdLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:minLength 1;
    sh:message "taxIdLast4 is exactly four digits; the full identifier never enters the pod".
mshape:IdentitySubjectShape sh:property _:n3-215.
`,
  "inbox-message": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix as: <https://www.w3.org/ns/activitystreams#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:InboxMessageShape a sh:NodeShape;
    sh:targetClass as:Announce;
    sh:closed true.
_:n3-216 sh:path rdf:type;
    sh:hasValue as:Announce.
mshape:InboxMessageShape sh:property _:n3-216.
_:n3-217 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-218 rdf:first mort:MessageKind-CreditReportOrder;
    rdf:rest _:n3-219.
_:n3-219 rdf:first mort:MessageKind-CreditReportDelivery;
    rdf:rest _:n3-220.
_:n3-220 rdf:first mort:MessageKind-CasefileSubmission;
    rdf:rest _:n3-221.
_:n3-221 rdf:first mort:MessageKind-FindingsDelivery;
    rdf:rest _:n3-222.
_:n3-222 rdf:first mort:MessageKind-ServiceOrder;
    rdf:rest _:n3-223.
_:n3-223 rdf:first mort:MessageKind-AppraisalDelivery;
    rdf:rest _:n3-224.
_:n3-224 rdf:first mort:MessageKind-CommitmentDelivery;
    rdf:rest _:n3-225.
_:n3-225 rdf:first mort:MessageKind-RefreshRequest;
    rdf:rest _:n3-226.
_:n3-226 rdf:first mort:MessageKind-RefreshDelivery;
    rdf:rest _:n3-227.
_:n3-227 rdf:first mort:MessageKind-ClosingInstructions;
    rdf:rest _:n3-228.
_:n3-228 rdf:first mort:MessageKind-ClosingConfirmation;
    rdf:rest _:n3-229.
_:n3-229 rdf:first mort:MessageKind-RecordingSubmission;
    rdf:rest _:n3-230.
_:n3-230 rdf:first mort:MessageKind-RecordingConfirmation;
    rdf:rest _:n3-231.
_:n3-231 rdf:first mort:MessageKind-LoanDelivery;
    rdf:rest _:n3-232.
_:n3-232 rdf:first mort:MessageKind-PurchaseConfirmation;
    rdf:rest _:n3-233.
_:n3-233 rdf:first mort:MessageKind-ServicingBoarding;
    rdf:rest rdf:nil.
_:n3-217 sh:in _:n3-218;
    sh:message "dcterms:type must be a concept from mort:MessageKindScheme".
mshape:InboxMessageShape sh:property _:n3-217.
_:n3-234 sh:path as:actor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:InboxMessageShape sh:property _:n3-234.
_:n3-235 sh:path as:object;
    sh:nodeKind sh:IRI.
mshape:InboxMessageShape sh:property _:n3-235.
_:n3-236 sh:path as:summary;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:InboxMessageShape sh:property _:n3-236.
_:n3-237 sh:path as:published;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:InboxMessageShape sh:property _:n3-237.
_:n3-238 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:InboxMessageShape sh:property _:n3-238.
_:n3-239 sh:path as:inReplyTo;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:InboxMessageShape sh:property _:n3-239.
`,
  "loan-application": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-loan-ln-app: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/>.
@prefix fibo-loan-reln-org: <https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/MortgageOrigination/>.
@prefix fibo-fnd-arr-rep: <https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Reporting/>.

mshape:LoanApplicationShape a sh:NodeShape;
    sh:targetClass fibo-loan-ln-app:LoanApplication;
    sh:closed true.
_:n3-240 sh:path rdf:type;
    sh:hasValue fibo-loan-ln-app:LoanApplication.
mshape:LoanApplicationShape sh:property _:n3-240.
_:n3-241 sh:path dcterms:created;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanApplicationShape sh:property _:n3-241.
_:n3-242 sh:path fibo-fnd-arr-rep:isSubmittedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanApplicationShape sh:property _:n3-242.
_:n3-243 sh:path fibo-loan-ln-app:hasRequestedAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanApplicationShape sh:property _:n3-243.
_:n3-244 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:LoanApplicationShape sh:property _:n3-244.
_:n3-245 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:LoanApplicationShape sh:property _:n3-245.
_:n3-246 sh:path dcterms:type;
    sh:minCount 3;
    sh:maxCount 4;
    sh:nodeKind sh:IRI.
_:n3-247 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-BusinessOrCommercial;
    rdf:rest _:n3-248.
_:n3-248 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-DwellingConstruction;
    rdf:rest _:n3-249.
_:n3-249 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-HomeImprovement;
    rdf:rest _:n3-250.
_:n3-250 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing;
    rdf:rest _:n3-251.
_:n3-251 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-MortgageModification;
    rdf:rest _:n3-252.
_:n3-252 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-RealPropertyPurchase;
    rdf:rest _:n3-253.
_:n3-253 rdf:first fibo-loan-reln-org:PropertyUsage-investment;
    rdf:rest _:n3-254.
_:n3-254 rdf:first fibo-loan-reln-org:PropertyUsage-primaryResidence;
    rdf:rest _:n3-255.
_:n3-255 rdf:first fibo-loan-reln-org:PropertyUsage-secondHome;
    rdf:rest _:n3-256.
_:n3-256 rdf:first fibo-loan-reln-org:AmortizationType-adjustableRate;
    rdf:rest _:n3-257.
_:n3-257 rdf:first fibo-loan-reln-org:AmortizationType-fixedRate;
    rdf:rest _:n3-258.
_:n3-258 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPayment;
    rdf:rest _:n3-259.
_:n3-259 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPaymentAdjustable;
    rdf:rest _:n3-260.
_:n3-260 rdf:first fibo-loan-reln-org:AmortizationType-growingEquity;
    rdf:rest _:n3-261.
_:n3-261 rdf:first fibo-loan-reln-org:AmortizationType-rateImprovement;
    rdf:rest _:n3-262.
_:n3-262 rdf:first fibo-loan-reln-org:AmortizationType-step;
    rdf:rest _:n3-263.
_:n3-263 rdf:first fibo-loan-reln-org:CashOutStatus-CashOut;
    rdf:rest _:n3-264.
_:n3-264 rdf:first fibo-loan-reln-org:CashOutStatus-LimitedCashOut;
    rdf:rest _:n3-265.
_:n3-265 rdf:first fibo-loan-reln-org:CashOutStatus-NoCashOut;
    rdf:rest rdf:nil.
_:n3-246 sh:in _:n3-247;
    sh:message "dcterms:type values must be URLA-aligned FIBO named individuals".
mshape:LoanApplicationShape sh:property _:n3-246.
_:n3-266 sh:path dcterms:type.
_:n3-268 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-BusinessOrCommercial;
    rdf:rest _:n3-269.
_:n3-269 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-DwellingConstruction;
    rdf:rest _:n3-270.
_:n3-270 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-HomeImprovement;
    rdf:rest _:n3-271.
_:n3-271 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing;
    rdf:rest _:n3-272.
_:n3-272 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-MortgageModification;
    rdf:rest _:n3-273.
_:n3-273 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-RealPropertyPurchase;
    rdf:rest rdf:nil.
_:n3-267 sh:in _:n3-268.
_:n3-266 sh:qualifiedValueShape _:n3-267;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1;
    sh:message "exactly one FIBO MortgageLoanPurpose individual is required".
mshape:LoanApplicationShape sh:property _:n3-266.
_:n3-274 sh:path dcterms:type.
_:n3-276 rdf:first fibo-loan-reln-org:PropertyUsage-investment;
    rdf:rest _:n3-277.
_:n3-277 rdf:first fibo-loan-reln-org:PropertyUsage-primaryResidence;
    rdf:rest _:n3-278.
_:n3-278 rdf:first fibo-loan-reln-org:PropertyUsage-secondHome;
    rdf:rest rdf:nil.
_:n3-275 sh:in _:n3-276.
_:n3-274 sh:qualifiedValueShape _:n3-275;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1;
    sh:message "exactly one FIBO PropertyUsage individual is required".
mshape:LoanApplicationShape sh:property _:n3-274.
_:n3-279 sh:path dcterms:type.
_:n3-281 rdf:first fibo-loan-reln-org:AmortizationType-adjustableRate;
    rdf:rest _:n3-282.
_:n3-282 rdf:first fibo-loan-reln-org:AmortizationType-fixedRate;
    rdf:rest _:n3-283.
_:n3-283 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPayment;
    rdf:rest _:n3-284.
_:n3-284 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPaymentAdjustable;
    rdf:rest _:n3-285.
_:n3-285 rdf:first fibo-loan-reln-org:AmortizationType-growingEquity;
    rdf:rest _:n3-286.
_:n3-286 rdf:first fibo-loan-reln-org:AmortizationType-rateImprovement;
    rdf:rest _:n3-287.
_:n3-287 rdf:first fibo-loan-reln-org:AmortizationType-step;
    rdf:rest rdf:nil.
_:n3-280 sh:in _:n3-281.
_:n3-279 sh:qualifiedValueShape _:n3-280;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1;
    sh:message "exactly one FIBO AmortizationType individual is required".
mshape:LoanApplicationShape sh:property _:n3-279.
_:n3-288 rdf:first _:n3-289.
_:n3-290 sh:path dcterms:type;
    sh:hasValue fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing.
_:n3-289 sh:property _:n3-290.
_:n3-291 sh:path dcterms:type.
_:n3-293 rdf:first fibo-loan-reln-org:CashOutStatus-CashOut;
    rdf:rest _:n3-294.
_:n3-294 rdf:first fibo-loan-reln-org:CashOutStatus-LimitedCashOut;
    rdf:rest _:n3-295.
_:n3-295 rdf:first fibo-loan-reln-org:CashOutStatus-NoCashOut;
    rdf:rest rdf:nil.
_:n3-292 sh:in _:n3-293.
_:n3-291 sh:qualifiedValueShape _:n3-292;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1.
_:n3-289 sh:property _:n3-291.
_:n3-288 rdf:rest _:n3-296.
_:n3-296 rdf:first _:n3-297.
_:n3-299 sh:path dcterms:type;
    sh:hasValue fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing.
_:n3-298 sh:property _:n3-299.
_:n3-297 sh:not _:n3-298.
_:n3-300 sh:path dcterms:type.
_:n3-302 rdf:first fibo-loan-reln-org:CashOutStatus-CashOut;
    rdf:rest _:n3-303.
_:n3-303 rdf:first fibo-loan-reln-org:CashOutStatus-LimitedCashOut;
    rdf:rest _:n3-304.
_:n3-304 rdf:first fibo-loan-reln-org:CashOutStatus-NoCashOut;
    rdf:rest rdf:nil.
_:n3-301 sh:in _:n3-302.
_:n3-300 sh:qualifiedValueShape _:n3-301;
    sh:qualifiedMaxCount 0.
_:n3-297 sh:property _:n3-300.
_:n3-296 rdf:rest rdf:nil.
mshape:LoanApplicationShape sh:or _:n3-288.
`,
  "loan-estimate": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/>.

mshape:LoanEstimateShape a sh:NodeShape;
    sh:targetClass mort:LoanEstimate;
    sh:closed true.
_:n3-305 sh:path rdf:type;
    sh:hasValue mort:LoanEstimate.
mshape:LoanEstimateShape sh:property _:n3-305.
_:n3-306 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanEstimateShape sh:property _:n3-306.
_:n3-307 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanEstimateShape sh:property _:n3-307.
_:n3-308 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanEstimateShape sh:property _:n3-308.
_:n3-309 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanEstimateShape sh:property _:n3-309.
_:n3-310 sh:path mort:applicationDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:lessThan schema:expires.
mshape:LoanEstimateShape sh:property _:n3-310.
_:n3-311 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanEstimateShape sh:property _:n3-311.
_:n3-312 sh:path schema:expires;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanEstimateShape sh:property _:n3-312.
_:n3-313 sh:path mort:intentToProceedDate;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanEstimateShape sh:property _:n3-313.
_:n3-314 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-314.
_:n3-315 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 6.5)".
mshape:LoanEstimateShape sh:property _:n3-315.
_:n3-316 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:LoanEstimateShape sh:property _:n3-316.
_:n3-317 sh:path mort:annualPercentageRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 40.0.
mshape:LoanEstimateShape sh:property _:n3-317.
_:n3-318 sh:path mort:monthlyPrincipalAndInterest;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-318.
_:n3-319 sh:path mort:estimatedTotalMonthlyPayment;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-319.
_:n3-320 sh:path fibo-loan-ln-ln:hasTotalClosingCosts;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-320.
_:n3-321 sh:path mort:cashToClose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-321.
_:n3-322 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:LoanEstimateShape sh:property _:n3-322.
`,
  "odrl-policy": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix odrl: <http://www.w3.org/ns/odrl/2/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:OdrlPolicyShape a sh:NodeShape;
    sh:targetClass odrl:Agreement;
    sh:closed true.
_:n3-323 sh:path rdf:type;
    sh:hasValue odrl:Agreement.
mshape:OdrlPolicyShape sh:property _:n3-323.
_:n3-324 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OdrlPolicyShape sh:property _:n3-324.
_:n3-325 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OdrlPolicyShape sh:property _:n3-325.
_:n3-326 sh:path dcterms:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OdrlPolicyShape sh:property _:n3-326.
_:n3-327 sh:path odrl:assigner;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OdrlPolicyShape sh:property _:n3-327.
_:n3-328 sh:path odrl:assignee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OdrlPolicyShape sh:property _:n3-328.
_:n3-329 sh:path odrl:permission;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PermissionShape.
mshape:OdrlPolicyShape sh:property _:n3-329.
_:n3-330 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:OdrlPolicyShape sh:property _:n3-330.
_:n3-331 sh:path dcterms:source;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OdrlPolicyShape sh:property _:n3-331.
`,
  "payment-mandate": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:PaymentMandateShape a sh:NodeShape;
    sh:targetClass mort:PaymentMandate;
    sh:closed true.
_:n3-332 sh:path rdf:type;
    sh:hasValue mort:PaymentMandate.
mshape:PaymentMandateShape sh:property _:n3-332.
_:n3-333 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PaymentMandateShape sh:property _:n3-333.
_:n3-334 sh:path mort:payee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PaymentMandateShape sh:property _:n3-334.
_:n3-335 sh:path mort:accountLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:minLength 1.
mshape:PaymentMandateShape sh:property _:n3-335.
_:n3-336 sh:path schema:provider;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:PaymentMandateShape sh:property _:n3-336.
_:n3-337 sh:path schema:amount;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PaymentMandateShape sh:property _:n3-337.
_:n3-338 sh:path mort:debitDayOfMonth;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1;
    sh:maxInclusive 28.
mshape:PaymentMandateShape sh:property _:n3-338.
_:n3-339 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:PaymentMandateShape sh:property _:n3-339.
_:n3-340 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PaymentMandateShape sh:property _:n3-340.
`,
  "purchase-agreement": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:PurchaseAgreementShape a sh:NodeShape;
    sh:targetClass mort:PurchaseAgreement;
    sh:closed true.
_:n3-341 sh:path rdf:type;
    sh:hasValue mort:PurchaseAgreement.
mshape:PurchaseAgreementShape sh:property _:n3-341.
_:n3-342 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PurchaseAgreementShape sh:property _:n3-342.
_:n3-343 sh:path schema:buyer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PurchaseAgreementShape sh:property _:n3-343.
_:n3-344 sh:path schema:seller;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:NamedPartyShape.
mshape:PurchaseAgreementShape sh:property _:n3-344.
_:n3-345 sh:path mort:purchasePrice;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PurchaseAgreementShape sh:property _:n3-345.
_:n3-346 sh:path mort:earnestMoneyDeposit;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PurchaseAgreementShape sh:property _:n3-346.
_:n3-347 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:PurchaseAgreementShape sh:property _:n3-347.
_:n3-348 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:PurchaseAgreementShape sh:property _:n3-348.
_:n3-349 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:PurchaseAgreementShape sh:property _:n3-349.
`,
  "recorded-instrument": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:RecordedInstrumentShape a sh:NodeShape;
    sh:targetClass mort:RecordedInstrument;
    sh:closed true.
_:n3-350 sh:path rdf:type;
    sh:hasValue mort:RecordedInstrument.
mshape:RecordedInstrumentShape sh:property _:n3-350.
_:n3-351 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-351.
_:n3-352 sh:path mort:recordingReference;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-352.
_:n3-353 sh:path mort:recordedAt;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:RecordedInstrumentShape sh:property _:n3-353.
_:n3-354 sh:path mort:grantor;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-354.
_:n3-355 sh:path mort:grantee;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-355.
_:n3-356 sh:path mort:parcelNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-356.
_:n3-357 sh:path dcterms:creator;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:RecordedInstrumentShape sh:property _:n3-357.
`,
  "recording-receipt": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:RecordingReceiptShape a sh:NodeShape;
    sh:targetClass mort:RecordingReceipt;
    sh:closed true.
_:n3-358 sh:path rdf:type;
    sh:hasValue mort:RecordingReceipt.
mshape:RecordingReceiptShape sh:property _:n3-358.
_:n3-359 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordingReceiptShape sh:property _:n3-359.
_:n3-360 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:RecordingReceiptShape sh:property _:n3-360.
_:n3-361 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:RecordingReceiptShape sh:property _:n3-361.
_:n3-362 sh:path mort:recordedInstrument;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:RecordingReceiptShape sh:property _:n3-362.
_:n3-363 sh:path mort:recordingReference;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordingReceiptShape sh:property _:n3-363.
_:n3-364 sh:path mort:subjectProperty;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:RecordingReceiptShape sh:property _:n3-364.
`,
  "score-notice": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.

mshape:CreditScoreNoticeShape a sh:NodeShape;
    sh:targetClass mort:CreditScoreNotice;
    sh:closed true.
_:n3-365 sh:path rdf:type;
    sh:hasValue mort:CreditScoreNotice.
mshape:CreditScoreNoticeShape sh:property _:n3-365.
_:n3-366 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditScoreNoticeShape sh:property _:n3-366.
_:n3-367 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditScoreNoticeShape sh:property _:n3-367.
_:n3-368 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditScoreNoticeShape sh:property _:n3-368.
_:n3-369 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditScoreNoticeShape sh:property _:n3-369.
_:n3-370 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:CreditScoreNoticeShape sh:property _:n3-370.
_:n3-371 sh:path mort:scoreDisclosure;
    sh:minCount 1;
    sh:maxCount 3;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ScoreDisclosureShape.
mshape:CreditScoreNoticeShape sh:property _:n3-371.
_:n3-372 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditScoreNoticeShape sh:property _:n3-372.
`,
  "service-order": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:ServiceOrderShape a sh:NodeShape;
    sh:targetClass schema:Order;
    sh:closed true.
_:n3-373 sh:path rdf:type;
    sh:hasValue schema:Order.
mshape:ServiceOrderShape sh:property _:n3-373.
_:n3-374 sh:path schema:orderNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ServiceOrderShape sh:property _:n3-374.
_:n3-375 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-376 rdf:first mort:ServiceKind-CreditReport;
    rdf:rest _:n3-377.
_:n3-377 rdf:first mort:ServiceKind-Appraisal;
    rdf:rest _:n3-378.
_:n3-378 rdf:first mort:ServiceKind-Title;
    rdf:rest _:n3-379.
_:n3-379 rdf:first mort:ServiceKind-FloodDetermination;
    rdf:rest _:n3-380.
_:n3-380 rdf:first mort:ServiceKind-TaxTranscripts;
    rdf:rest rdf:nil.
_:n3-375 sh:in _:n3-376.
mshape:ServiceOrderShape sh:property _:n3-375.
_:n3-381 sh:path schema:customer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ServiceOrderShape sh:property _:n3-381.
_:n3-382 sh:path schema:seller;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ServiceOrderShape sh:property _:n3-382.
_:n3-383 sh:path schema:orderDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ServiceOrderShape sh:property _:n3-383.
_:n3-384 sh:path schema:orderStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-385 rdf:first schema:OrderProcessing;
    rdf:rest _:n3-386.
_:n3-386 rdf:first schema:OrderDelivered;
    rdf:rest rdf:nil.
_:n3-384 sh:in _:n3-385.
mshape:ServiceOrderShape sh:property _:n3-384.
_:n3-387 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ServiceOrderShape sh:property _:n3-387.
_:n3-388 sh:path mort:authorisedBy;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ServiceOrderShape sh:property _:n3-388.
_:n3-389 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ServiceOrderShape sh:property _:n3-389.
`,
  "servicing-notice": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.

mshape:LoanTransferNoticeShape a sh:NodeShape;
    sh:targetClass mort:LoanTransferNotice;
    sh:closed true.
_:n3-390 sh:path rdf:type;
    sh:hasValue mort:LoanTransferNotice.
mshape:LoanTransferNoticeShape sh:property _:n3-390.
_:n3-391 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-391.
_:n3-392 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-393 rdf:first mort:NoticeKind-ServicingTransferFromTransferor;
    rdf:rest _:n3-394.
_:n3-394 rdf:first mort:NoticeKind-ServicingTransferFromTransferee;
    rdf:rest _:n3-395.
_:n3-395 rdf:first mort:NoticeKind-OwnershipTransfer;
    rdf:rest rdf:nil.
_:n3-392 sh:in _:n3-393;
    sh:message "dcterms:type must be a concept from mort:NoticeKindScheme".
mshape:LoanTransferNoticeShape sh:property _:n3-392.
_:n3-396 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-396.
_:n3-397 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanTransferNoticeShape sh:property _:n3-397.
_:n3-398 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanTransferNoticeShape sh:property _:n3-398.
_:n3-399 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanTransferNoticeShape sh:property _:n3-399.
_:n3-400 sh:path mort:transferEffectiveDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanTransferNoticeShape sh:property _:n3-400.
_:n3-401 sh:path mort:transferor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:LoanTransferNoticeShape sh:property _:n3-401.
_:n3-402 sh:path mort:transferee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:LoanTransferNoticeShape sh:property _:n3-402.
_:n3-403 sh:path mort:paymentProtectionEnds;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanTransferNoticeShape sh:property _:n3-403.
_:n3-404 sh:path schema:telephone;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-404.
_:n3-405 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-405.
`,
  "settlement-statement": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/>.

mshape:SettlementStatementShape a sh:NodeShape;
    sh:targetClass mort:SettlementStatement;
    sh:closed true.
_:n3-406 sh:path rdf:type;
    sh:hasValue mort:SettlementStatement.
mshape:SettlementStatementShape sh:property _:n3-406.
_:n3-407 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SettlementStatementShape sh:property _:n3-407.
_:n3-408 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SettlementStatementShape sh:property _:n3-408.
_:n3-409 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SettlementStatementShape sh:property _:n3-409.
_:n3-410 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:SettlementStatementShape sh:property _:n3-410.
_:n3-411 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:SettlementStatementShape sh:property _:n3-411.
_:n3-412 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:SettlementStatementShape sh:property _:n3-412.
_:n3-413 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:SettlementStatementShape sh:property _:n3-413.
_:n3-414 sh:path mort:disbursementDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:SettlementStatementShape sh:property _:n3-414.
_:n3-415 sh:path mort:purchasePrice;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:SettlementStatementShape sh:property _:n3-415.
_:n3-416 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:SettlementStatementShape sh:property _:n3-416.
_:n3-417 sh:path mort:lineItem;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:LineItemShape.
mshape:SettlementStatementShape sh:property _:n3-417.
_:n3-418 sh:path mort:cashToClose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:SettlementStatementShape sh:property _:n3-418.
_:n3-419 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:SettlementStatementShape sh:property _:n3-419.
`,
  "subject-property": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fnd-plc-rp: <https://spec.edmcouncil.org/fibo/ontology/FND/Places/RealProperty/>.

mshape:SubjectPropertyShape a sh:NodeShape;
    sh:targetClass schema:SingleFamilyResidence;
    sh:closed true.
_:n3-420 sh:path rdf:type;
    sh:hasValue schema:SingleFamilyResidence.
mshape:SubjectPropertyShape sh:property _:n3-420.
_:n3-421 sh:path rdf:type;
    sh:hasValue fibo-fnd-plc-rp:RealEstate.
mshape:SubjectPropertyShape sh:property _:n3-421.
_:n3-422 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:SubjectPropertyShape sh:property _:n3-422.
_:n3-423 sh:path schema:yearBuilt;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1600;
    sh:maxInclusive 2100.
mshape:SubjectPropertyShape sh:property _:n3-423.
_:n3-424 sh:path schema:floorSize;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:FloorSizeShape.
mshape:SubjectPropertyShape sh:property _:n3-424.
_:n3-425 sh:path schema:numberOfBedrooms;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 50.
mshape:SubjectPropertyShape sh:property _:n3-425.
_:n3-426 sh:path schema:numberOfBathroomsTotal;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 50.
mshape:SubjectPropertyShape sh:property _:n3-426.
_:n3-427 sh:path mort:constructionType;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-427.
_:n3-428 sh:path mort:roofType;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-428.
_:n3-429 sh:path mort:parcelNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-429.
_:n3-430 sh:path mort:legalDescription;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-430.
`,
  support: `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix sec: <https://w3id.org/security#>.
@prefix odrl: <http://www.w3.org/ns/odrl/2/>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix ldp: <http://www.w3.org/ns/ldp#>.
@prefix pim: <http://www.w3.org/ns/pim/space#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:NamedPartyShape a sh:NodeShape;
    sh:closed true.
_:n3-431 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:NamedPartyShape sh:ignoredProperties _:n3-431.
_:n3-432 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:NamedPartyShape sh:property _:n3-432.
mshape:LineItemShape a sh:NodeShape;
    sh:closed true.
_:n3-433 sh:path rdf:type;
    sh:hasValue schema:MonetaryAmount.
mshape:LineItemShape sh:property _:n3-433.
_:n3-434 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LineItemShape sh:property _:n3-434.
_:n3-435 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal.
mshape:LineItemShape sh:property _:n3-435.
_:n3-436 sh:path schema:currency;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-437 rdf:first "USD";
    rdf:rest rdf:nil.
_:n3-436 sh:in _:n3-437.
mshape:LineItemShape sh:property _:n3-436.
mshape:FloorSizeShape a sh:NodeShape;
    sh:closed true.
_:n3-438 sh:path rdf:type;
    sh:hasValue schema:QuantitativeValue.
mshape:FloorSizeShape sh:property _:n3-438.
_:n3-439 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 1.0.
mshape:FloorSizeShape sh:property _:n3-439.
_:n3-440 sh:path schema:unitCode;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-441 rdf:first "FTK";
    rdf:rest rdf:nil.
_:n3-440 sh:in _:n3-441.
mshape:FloorSizeShape sh:property _:n3-440.
mshape:ScoreDisclosureShape a sh:NodeShape;
    sh:closed true.
_:n3-442 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:ScoreDisclosureShape sh:ignoredProperties _:n3-442.
_:n3-443 sh:path mort:creditScoreValue;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 300;
    sh:maxInclusive 850.
mshape:ScoreDisclosureShape sh:property _:n3-443.
_:n3-444 sh:path mort:scoreModel;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-445 rdf:first mort:ScoreModel-FICO8;
    rdf:rest _:n3-446.
_:n3-446 rdf:first mort:ScoreModel-ClassicFICO;
    rdf:rest _:n3-447.
_:n3-447 rdf:first mort:ScoreModel-VantageScore4;
    rdf:rest rdf:nil.
_:n3-444 sh:in _:n3-445.
mshape:ScoreDisclosureShape sh:property _:n3-444.
_:n3-448 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ScoreDisclosureShape sh:property _:n3-448.
_:n3-449 sh:path dcterms:created;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ScoreDisclosureShape sh:property _:n3-449.
_:n3-450 sh:path mort:keyFactor;
    sh:maxCount 5;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ScoreDisclosureShape sh:property _:n3-450.
mshape:ConstraintShape a sh:NodeShape;
    sh:closed true.
_:n3-451 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:ConstraintShape sh:ignoredProperties _:n3-451.
_:n3-452 sh:path odrl:leftOperand;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-453 rdf:first odrl:purpose;
    rdf:rest _:n3-454.
_:n3-454 rdf:first odrl:dateTime;
    rdf:rest _:n3-455.
_:n3-455 rdf:first odrl:event;
    rdf:rest rdf:nil.
_:n3-452 sh:in _:n3-453.
mshape:ConstraintShape sh:property _:n3-452.
_:n3-456 sh:path odrl:operator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-457 rdf:first odrl:eq;
    rdf:rest _:n3-458.
_:n3-458 rdf:first odrl:lt;
    rdf:rest _:n3-459.
_:n3-459 rdf:first odrl:lteq;
    rdf:rest rdf:nil.
_:n3-456 sh:in _:n3-457.
mshape:ConstraintShape sh:property _:n3-456.
_:n3-460 sh:path odrl:rightOperand;
    sh:minCount 1;
    sh:maxCount 1.
mshape:ConstraintShape sh:property _:n3-460.
mshape:PermissionShape a sh:NodeShape;
    sh:closed true.
_:n3-461 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:PermissionShape sh:ignoredProperties _:n3-461.
_:n3-462 sh:path odrl:target;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:PermissionShape sh:property _:n3-462.
_:n3-463 sh:path odrl:action;
    sh:minCount 1;
    sh:maxCount 3;
    sh:nodeKind sh:IRI.
_:n3-464 rdf:first odrl:read;
    rdf:rest _:n3-465.
_:n3-465 rdf:first odrl:append;
    rdf:rest _:n3-466.
_:n3-466 rdf:first odrl:write;
    rdf:rest rdf:nil.
_:n3-463 sh:in _:n3-464.
mshape:PermissionShape sh:property _:n3-463.
_:n3-467 sh:path odrl:assignee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PermissionShape sh:property _:n3-467.
_:n3-468 sh:path odrl:constraint;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ConstraintShape.
mshape:PermissionShape sh:property _:n3-468.
mshape:AgentShape a sh:NodeShape;
    sh:closed true.
_:n3-469 sh:path rdf:type;
    sh:minCount 1.
_:n3-470 rdf:first schema:Person;
    rdf:rest _:n3-471.
_:n3-471 rdf:first schema:Organization;
    rdf:rest _:n3-472.
_:n3-472 rdf:first foaf:Agent;
    rdf:rest rdf:nil.
_:n3-469 sh:in _:n3-470.
mshape:AgentShape sh:property _:n3-469.
_:n3-473 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AgentShape sh:property _:n3-473.
_:n3-474 sh:path ldp:inbox;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-474.
_:n3-475 sh:path pim:storage;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-475.
_:n3-476 sh:path sec:verificationMethod;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-476.
_:n3-477 sh:path sec:assertionMethod;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-477.
_:n3-478 sh:path mort:titleVesting;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AgentShape sh:property _:n3-478.
`,
  "title-clear-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:TitleClearCredentialShape a sh:NodeShape;
    sh:targetClass mort:TitleClearCredential;
    sh:closed true.
_:n3-479 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:TitleClearCredentialShape sh:ignoredProperties _:n3-479.
_:n3-480 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:TitleClearCredentialShape sh:property _:n3-480.
_:n3-481 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:TitleClearCredentialShape sh:property _:n3-481.
_:n3-482 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:TitleClearCredentialShape sh:property _:n3-482.
_:n3-483 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:TitleClearCredentialShape sh:property _:n3-483.
_:n3-484 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleClearCredentialShape sh:property _:n3-484.
_:n3-485 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:TitleClearSubjectShape.
mshape:TitleClearCredentialShape sh:property _:n3-485.
_:n3-486 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleClearCredentialShape sh:property _:n3-486.
_:n3-487 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:TitleClearCredentialShape sh:property _:n3-487.
mshape:TitleClearSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-488 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:TitleClearSubjectShape sh:ignoredProperties _:n3-488.
_:n3-489 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:TitleClearSubjectShape sh:property _:n3-489.
_:n3-490 sh:path mort:titleStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-491 rdf:first mort:TitleStatus-Clear;
    rdf:rest _:n3-492.
_:n3-492 rdf:first mort:TitleStatus-Clouded;
    rdf:rest rdf:nil.
_:n3-490 sh:in _:n3-491;
    sh:message "titleStatus must be a concept from mort:TitleStatusScheme".
mshape:TitleClearSubjectShape sh:property _:n3-490.
_:n3-493 sh:path mort:searchedThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:message "searchedThrough is the effective xsd:date through which public records were searched".
mshape:TitleClearSubjectShape sh:property _:n3-493.
`,
  "title-commitment-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:TitleCommitmentCredentialShape a sh:NodeShape;
    sh:targetClass mort:TitleCommitmentCredential;
    sh:closed true.
_:n3-494 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:TitleCommitmentCredentialShape sh:ignoredProperties _:n3-494.
_:n3-495 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:TitleCommitmentCredentialShape sh:property _:n3-495.
_:n3-496 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-496.
_:n3-497 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:TitleCommitmentCredentialShape sh:property _:n3-497.
_:n3-498 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:TitleCommitmentCredentialShape sh:property _:n3-498.
_:n3-499 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-499.
_:n3-500 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:TitleCommitmentSubjectShape.
mshape:TitleCommitmentCredentialShape sh:property _:n3-500.
_:n3-501 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-501.
_:n3-502 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-502.
mshape:TitleCommitmentSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-503 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:TitleCommitmentSubjectShape sh:ignoredProperties _:n3-503.
_:n3-504 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-504.
_:n3-505 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:TitleCommitmentSubjectShape sh:property _:n3-505.
_:n3-506 sh:path mort:searchedThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:TitleCommitmentSubjectShape sh:property _:n3-506.
_:n3-507 sh:path mort:vestedOwner;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-507.
_:n3-508 sh:path mort:proposedInsured;
    sh:minCount 1;
    sh:maxCount 2;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-508.
_:n3-509 sh:path mort:ownerPolicyAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:TitleCommitmentSubjectShape sh:property _:n3-509.
_:n3-510 sh:path mort:loanPolicyAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:TitleCommitmentSubjectShape sh:property _:n3-510.
_:n3-511 sh:path mort:titleRequirement;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-511.
_:n3-512 sh:path mort:titleException;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-512.
`,
  "underwriting-decision": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-loan-ln-app: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/>.
@prefix fibo-fnd-rel-rel: <https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/>.

mshape:UnderwritingDecisionShape a sh:NodeShape;
    sh:targetClass fibo-loan-ln-app:UnderwritingDecision;
    sh:closed true.
_:n3-513 sh:path rdf:type;
    sh:hasValue fibo-loan-ln-app:UnderwritingDecision.
mshape:UnderwritingDecisionShape sh:property _:n3-513.
_:n3-514 sh:path fibo-fnd-rel-rel:evaluates;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:UnderwritingDecisionShape sh:property _:n3-514.
_:n3-515 sh:path mort:decisionStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-516 rdf:first mort:DecisionStatus-Approved;
    rdf:rest _:n3-517.
_:n3-517 rdf:first mort:DecisionStatus-ApprovedWithConditions;
    rdf:rest _:n3-518.
_:n3-518 rdf:first mort:DecisionStatus-Denied;
    rdf:rest _:n3-519.
_:n3-519 rdf:first mort:DecisionStatus-Suspended;
    rdf:rest rdf:nil.
_:n3-515 sh:in _:n3-516;
    sh:message "decisionStatus must be a concept from mort:DecisionStatusScheme".
mshape:UnderwritingDecisionShape sh:property _:n3-515.
_:n3-520 sh:path mort:underwritingCondition;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:UnderwritingDecisionShape sh:property _:n3-520.
_:n3-521 sh:path fibo-loan-ln-app:hasApprovedAmount;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:UnderwritingDecisionShape sh:property _:n3-521.
_:n3-522 sh:path dcterms:type;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-523 rdf:first fibo-loan-ln-app:UnderwritingDecision-Approve;
    rdf:rest _:n3-524.
_:n3-524 rdf:first fibo-loan-ln-app:UnderwritingDecision-Deny;
    rdf:rest _:n3-525.
_:n3-525 rdf:first fibo-loan-ln-app:UnderwritingDecision-Eligible;
    rdf:rest _:n3-526.
_:n3-526 rdf:first fibo-loan-ln-app:UnderwritingDecision-Ineligible;
    rdf:rest _:n3-527.
_:n3-527 rdf:first fibo-loan-ln-app:UnderwritingDecision-Refer;
    rdf:rest _:n3-528.
_:n3-528 rdf:first fibo-loan-ln-app:UnderwritingDecision-UnableToDetermine;
    rdf:rest rdf:nil.
_:n3-522 sh:in _:n3-523;
    sh:message "the AUS recommendation must be a FIBO UnderwritingDecision named individual".
mshape:UnderwritingDecisionShape sh:property _:n3-522.
_:n3-529 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:UnderwritingDecisionShape sh:property _:n3-529.
_:n3-530 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:UnderwritingDecisionShape sh:property _:n3-530.
`,
  "zk-operand-anchor": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:ZkOperandAnchorShape a sh:NodeShape;
    sh:targetClass mort:ZkOperandAnchor;
    sh:closed true.
_:n3-531 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:ZkOperandAnchorShape sh:ignoredProperties _:n3-531.
_:n3-532 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:ZkOperandAnchorShape sh:property _:n3-532.
_:n3-533 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ZkOperandAnchorShape sh:property _:n3-533.
_:n3-534 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:ZkOperandAnchorShape sh:property _:n3-534.
_:n3-535 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:ZkOperandAnchorShape sh:property _:n3-535.
_:n3-536 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:ZkOperandAnchorShape sh:property _:n3-536.
_:n3-537 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:ZkOperandAnchorSubjectShape;
    sh:message "credentialSubject must be the holder WebID the verifier matches against the DPoP-bound session".
mshape:ZkOperandAnchorShape sh:property _:n3-537.
_:n3-538 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:ZkOperandAnchorShape sh:property _:n3-538.
mshape:ZkOperandAnchorSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-539 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:ZkOperandAnchorSubjectShape sh:ignoredProperties _:n3-539.
_:n3-540 sh:path mort:field;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-541 rdf:first mort:monthlyGrossIncomeUsd;
    rdf:rest _:n3-542.
_:n3-542 rdf:first mort:totalMonthlyDebtUsd;
    rdf:rest _:n3-543.
_:n3-543 rdf:first mort:creditScoreValue;
    rdf:rest rdf:nil.
_:n3-540 sh:in _:n3-541;
    sh:message "field must be one of decision 0005's ZK scaled-unit field IRIs".
mshape:ZkOperandAnchorSubjectShape sh:property _:n3-540.
_:n3-544 sh:path mort:operandEnc;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^0x[0-9a-f]{1,64}$";
    sh:message "operandEnc must be a 0x-prefixed lowercase hex field element".
mshape:ZkOperandAnchorSubjectShape sh:property _:n3-544.
`,
} as const;

/** Document keys of the bundled SHACL shapes. */
export type ShapesDocumentKey = keyof typeof SHAPES_TURTLE;

/** Every bundled shapes document, in one Turtle-parseable list. */
export const ALL_SHAPES_DOCUMENTS: readonly string[] = Object.values(SHAPES_TURTLE);

/** File stem of the 36 bundled shapes documents. */
export const SHAPES_DOCUMENT_KEYS = Object.keys(SHAPES_TURTLE) as readonly ShapesDocumentKey[];
