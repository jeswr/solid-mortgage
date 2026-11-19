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
  "address-record": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix locn: <http://www.w3.org/ns/locn#>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix odrl: <http://www.w3.org/ns/odrl/2/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:AddressRecordShape a sh:NodeShape;
    sh:targetClass locn:Address;
    sh:closed true.
_:n3-8 sh:path rdf:type.
_:n3-9 rdf:first schema:PostalAddress;
    rdf:rest _:n3-10.
_:n3-10 rdf:first locn:Address;
    rdf:rest rdf:nil.
_:n3-8 sh:in _:n3-9.
mshape:AddressRecordShape sh:property _:n3-8.
_:n3-11 sh:path rdf:type;
    sh:hasValue schema:PostalAddress.
mshape:AddressRecordShape sh:property _:n3-11.
_:n3-12 sh:path schema:streetAddress;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AddressRecordShape sh:property _:n3-12.
_:n3-13 sh:path schema:addressLocality;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AddressRecordShape sh:property _:n3-13.
_:n3-14 sh:path schema:addressRegion;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[A-Z]{2}$".
mshape:AddressRecordShape sh:property _:n3-14.
_:n3-15 sh:path schema:postalCode;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{5}(-[0-9]{4})?$".
mshape:AddressRecordShape sh:property _:n3-15.
_:n3-16 sh:path schema:addressCountry;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[A-Z]{2}$".
mshape:AddressRecordShape sh:property _:n3-16.
_:n3-17 sh:path locn:fullAddress;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AddressRecordShape sh:property _:n3-17.
_:n3-18 sh:path locn:locatorDesignator;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AddressRecordShape sh:property _:n3-18.
_:n3-19 sh:path locn:thoroughfare;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AddressRecordShape sh:property _:n3-19.
_:n3-20 sh:path locn:locatorName;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AddressRecordShape sh:property _:n3-20.
_:n3-21 sh:path locn:postName;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AddressRecordShape sh:property _:n3-21.
_:n3-22 sh:path locn:postCode;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AddressRecordShape sh:property _:n3-22.
_:n3-23 sh:path schema:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:AddressRecordShape sh:property _:n3-23.
_:n3-24 sh:path dcterms:modified;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AddressRecordShape sh:property _:n3-24.
_:n3-25 sh:path prov:wasDerivedFrom;
    sh:nodeKind sh:IRI.
mshape:AddressRecordShape sh:property _:n3-25.
_:n3-26 sh:path prov:generatedAtTime;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AddressRecordShape sh:property _:n3-26.
_:n3-27 sh:path prov:invalidatedAtTime;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AddressRecordShape sh:property _:n3-27.
_:n3-28 sh:path odrl:hasPolicy;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AddressRecordShape sh:property _:n3-28.
`,
  "agent-profile": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:AgentProfileShape a sh:NodeShape;
    sh:targetClass foaf:PersonalProfileDocument;
    sh:closed true.
_:n3-29 sh:path rdf:type;
    sh:hasValue foaf:PersonalProfileDocument.
mshape:AgentProfileShape sh:property _:n3-29.
_:n3-30 sh:path foaf:primaryTopic;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:AgentShape.
mshape:AgentProfileShape sh:property _:n3-30.
`,
  "allergy-intolerance": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:AllergyIntoleranceShape a sh:NodeShape;
    sh:targetClass fhir:AllergyIntolerance;
    sh:closed true.
_:n3-31 sh:path rdf:type.
_:n3-32 rdf:first fhir:AllergyIntolerance;
    rdf:rest rdf:nil.
_:n3-31 sh:in _:n3-32.
mshape:AllergyIntoleranceShape sh:property _:n3-31.
_:n3-33 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-34 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-33 sh:in _:n3-34.
mshape:AllergyIntoleranceShape sh:property _:n3-33.
_:n3-35 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:AllergyIntoleranceShape sh:property _:n3-35.
_:n3-36 sh:path fhir:clinicalStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:AllergyIntoleranceShape sh:property _:n3-36.
_:n3-37 sh:path fhir:verificationStatus;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:AllergyIntoleranceShape sh:property _:n3-37.
_:n3-38 sh:path fhir:category;
    sh:maxCount 1.
mshape:AllergyIntoleranceShape sh:property _:n3-38.
_:n3-40 rdf:first fhir:category;
    rdf:rest _:n3-41.
_:n3-41 rdf:first _:n3-42.
_:n3-42 sh:zeroOrMorePath rdf:rest.
_:n3-41 rdf:rest _:n3-43.
_:n3-43 rdf:first rdf:first;
    rdf:rest _:n3-44.
_:n3-44 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-39 sh:path _:n3-40.
_:n3-45 rdf:first "food";
    rdf:rest _:n3-46.
_:n3-46 rdf:first "medication";
    rdf:rest _:n3-47.
_:n3-47 rdf:first "environment";
    rdf:rest _:n3-48.
_:n3-48 rdf:first "biologic";
    rdf:rest rdf:nil.
_:n3-39 sh:in _:n3-45.
mshape:AllergyIntoleranceShape sh:property _:n3-39.
_:n3-49 sh:path fhir:criticality;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:AllergyIntoleranceShape sh:property _:n3-49.
_:n3-51 rdf:first fhir:criticality;
    rdf:rest _:n3-52.
_:n3-52 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-50 sh:path _:n3-51.
_:n3-53 rdf:first "low";
    rdf:rest _:n3-54.
_:n3-54 rdf:first "high";
    rdf:rest _:n3-55.
_:n3-55 rdf:first "unable-to-assess";
    rdf:rest rdf:nil.
_:n3-50 sh:in _:n3-53.
mshape:AllergyIntoleranceShape sh:property _:n3-50.
_:n3-56 sh:path fhir:code;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirRxNormConceptShape.
mshape:AllergyIntoleranceShape sh:property _:n3-56.
_:n3-57 sh:path fhir:patient;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:AllergyIntoleranceShape sh:property _:n3-57.
_:n3-58 sh:path fhir:recordedDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:AllergyIntoleranceShape sh:property _:n3-58.
_:n3-59 sh:path fhir:note;
    sh:maxCount 1.
mshape:AllergyIntoleranceShape sh:property _:n3-59.
_:n3-61 rdf:first fhir:note;
    rdf:rest _:n3-62.
_:n3-62 rdf:first _:n3-63.
_:n3-63 sh:zeroOrMorePath rdf:rest.
_:n3-62 rdf:rest _:n3-64.
_:n3-64 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-60 sh:path _:n3-61;
    sh:node mshape:FhirAnnotationShape.
mshape:AllergyIntoleranceShape sh:property _:n3-60.
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
_:n3-65 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:AppraisalCredentialShape sh:ignoredProperties _:n3-65.
_:n3-66 sh:message "the appraisal evidence must evaluate the credentialSubject's mort:subjectProperty";
    sh:select "\\n      SELECT $this ?value WHERE {\\n        $this <https://www.w3.org/2018/credentials#evidence> ?report .\\n        ?report <https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/evaluates> ?value .\\n        $this <https://www.w3.org/2018/credentials#credentialSubject> ?subject .\\n        ?subject <https://solid-mortgage-vocab.vercel.app/mort#subjectProperty> ?property .\\n        FILTER (?value != ?property)\\n      }\\n    ".
mshape:AppraisalCredentialShape sh:sparql _:n3-66.
_:n3-67 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:AppraisalCredentialShape sh:property _:n3-67.
_:n3-68 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AppraisalCredentialShape sh:property _:n3-68.
_:n3-69 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:AppraisalCredentialShape sh:property _:n3-69.
_:n3-70 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AppraisalCredentialShape sh:property _:n3-70.
_:n3-71 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:AppraisalCredentialShape sh:property _:n3-71.
_:n3-72 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:AppraisalSubjectShape.
mshape:AppraisalCredentialShape sh:property _:n3-72.
_:n3-73 sh:path cred:evidence;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraisalEvidenceShape.
mshape:AppraisalCredentialShape sh:property _:n3-73.
_:n3-74 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:AppraisalCredentialShape sh:property _:n3-74.
mshape:AppraisalSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-75 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:AppraisalSubjectShape sh:ignoredProperties _:n3-75.
_:n3-76 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraisedPropertyShape.
mshape:AppraisalSubjectShape sh:property _:n3-76.
mshape:AppraisalEvidenceShape a sh:NodeShape;
    sh:closed true.
_:n3-77 sh:path rdf:type;
    sh:hasValue fibo-fnd-arr-asmt:Appraisal.
mshape:AppraisalEvidenceShape sh:property _:n3-77.
_:n3-78 sh:path fibo-fnd-rel-rel:evaluates;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:AppraisalEvidenceShape sh:property _:n3-78.
_:n3-79 sh:path fibo-fnd-rel-rel:isGeneratedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraiserShape.
mshape:AppraisalEvidenceShape sh:property _:n3-79.
_:n3-80 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:AppraisalEvidenceShape sh:property _:n3-80.
mshape:AppraiserShape a sh:NodeShape;
    sh:closed true.
_:n3-81 sh:path rdf:type;
    sh:hasValue fibo-fnd-arr-asmt:Appraiser.
mshape:AppraiserShape sh:property _:n3-81.
_:n3-82 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AppraiserShape sh:property _:n3-82.
_:n3-83 sh:path mort:appraiserLicenseId;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 4.
mshape:AppraiserShape sh:property _:n3-83.
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
_:n3-84 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:AssetCredentialShape sh:ignoredProperties _:n3-84.
_:n3-85 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:AssetCredentialShape sh:property _:n3-85.
_:n3-86 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AssetCredentialShape sh:property _:n3-86.
_:n3-87 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:AssetCredentialShape sh:property _:n3-87.
_:n3-88 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AssetCredentialShape sh:property _:n3-88.
_:n3-89 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:AssetCredentialShape sh:property _:n3-89.
_:n3-90 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:AssetSubjectShape.
mshape:AssetCredentialShape sh:property _:n3-90.
_:n3-91 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:AssetCredentialShape sh:property _:n3-91.
mshape:AssetSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-92 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:AssetSubjectShape sh:ignoredProperties _:n3-92.
_:n3-93 sh:path schema:owns;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:DepositAccountShape.
mshape:AssetSubjectShape sh:property _:n3-93.
mshape:DepositAccountShape a sh:NodeShape;
    sh:closed true.
_:n3-94 sh:path rdf:type;
    sh:hasValue schema:DepositAccount.
mshape:DepositAccountShape sh:property _:n3-94.
_:n3-95 sh:path schema:provider;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:DepositAccountShape sh:property _:n3-95.
_:n3-96 sh:path schema:amount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:DepositAccountShape sh:property _:n3-96.
_:n3-97 sh:path mort:accountLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:message "accountLast4 must be exactly four digits".
mshape:DepositAccountShape sh:property _:n3-97.
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
_:n3-98 sh:path rdf:type;
    sh:hasValue schema:Person.
mshape:BorrowerProfileShape sh:property _:n3-98.
_:n3-99 sh:path rdf:type;
    sh:hasValue fibo-fbc-dae-dbt:Borrower.
mshape:BorrowerProfileShape sh:property _:n3-99.
_:n3-100 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:BorrowerProfileShape sh:property _:n3-100.
_:n3-101 sh:path schema:birthDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:BorrowerProfileShape sh:property _:n3-101.
_:n3-102 sh:path schema:email;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[^@\\\\s]+@[^@\\\\s]+\\\\.[^@\\\\s]+$".
mshape:BorrowerProfileShape sh:property _:n3-102.
_:n3-103 sh:path schema:telephone;
    sh:maxCount 1;
    sh:datatype xsd:string.
mshape:BorrowerProfileShape sh:property _:n3-103.
_:n3-104 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:BorrowerProfileShape sh:property _:n3-104.
_:n3-105 sh:path mort:maritalStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-106 rdf:first mort:MaritalStatus-Married;
    rdf:rest _:n3-107.
_:n3-107 rdf:first mort:MaritalStatus-Separated;
    rdf:rest _:n3-108.
_:n3-108 rdf:first mort:MaritalStatus-Unmarried;
    rdf:rest rdf:nil.
_:n3-105 sh:in _:n3-106;
    sh:message "maritalStatus must be a concept from mort:MaritalStatusScheme (URLA section 1a)".
mshape:BorrowerProfileShape sh:property _:n3-105.
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
_:n3-109 sh:path rdf:type;
    sh:hasValue mort:ClosingDisclosure.
mshape:ClosingDisclosureShape sh:property _:n3-109.
_:n3-110 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingDisclosureShape sh:property _:n3-110.
_:n3-111 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingDisclosureShape sh:property _:n3-111.
_:n3-112 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosingDisclosureShape sh:property _:n3-112.
_:n3-113 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosingDisclosureShape sh:property _:n3-113.
_:n3-114 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-114.
_:n3-115 sh:path mort:receivedDate;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-115.
_:n3-116 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-116.
_:n3-117 sh:path mort:disbursementDate;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-117.
_:n3-118 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-118.
_:n3-119 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 6.5)".
mshape:ClosingDisclosureShape sh:property _:n3-119.
_:n3-120 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:ClosingDisclosureShape sh:property _:n3-120.
_:n3-121 sh:path mort:annualPercentageRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 40.0.
mshape:ClosingDisclosureShape sh:property _:n3-121.
_:n3-122 sh:path mort:monthlyPrincipalAndInterest;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-122.
_:n3-123 sh:path mort:estimatedTotalMonthlyPayment;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-123.
_:n3-124 sh:path fibo-loan-ln-ln:hasTotalClosingCosts;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-124.
_:n3-125 sh:path mort:cashToClose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-125.
_:n3-126 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:ClosingDisclosureShape sh:property _:n3-126.
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
_:n3-127 sh:path rdf:type;
    sh:hasValue fibo-loan-reln-mtg:Mortgage.
mshape:ClosingRecordShape sh:property _:n3-127.
_:n3-128 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosingRecordShape sh:property _:n3-128.
_:n3-129 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:ClosingRecordShape sh:property _:n3-129.
_:n3-130 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingRecordShape sh:property _:n3-130.
_:n3-131 sh:path fibo-loan-ln-ln:hasTotalClosingCosts;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingRecordShape sh:property _:n3-131.
_:n3-132 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 6.125)".
mshape:ClosingRecordShape sh:property _:n3-132.
_:n3-133 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:ClosingRecordShape sh:property _:n3-133.
_:n3-134 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingRecordShape sh:property _:n3-134.
_:n3-135 sh:path mort:recordingReference;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingRecordShape sh:property _:n3-135.
_:n3-136 sh:path mort:eNoteReference;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingRecordShape sh:property _:n3-136.
_:n3-137 sh:path fibo-loan-ln-ln:isServicedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:ClosingRecordShape sh:property _:n3-137.
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
_:n3-138 sh:path rdf:type;
    sh:hasValue schema:PostalAddress.
mshape:PostalAddressShape sh:property _:n3-138.
_:n3-139 sh:path schema:streetAddress;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PostalAddressShape sh:property _:n3-139.
_:n3-140 sh:path schema:addressLocality;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PostalAddressShape sh:property _:n3-140.
_:n3-141 sh:path schema:addressRegion;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[A-Z]{2}$";
    sh:message "addressRegion must be a two-letter US state code".
mshape:PostalAddressShape sh:property _:n3-141.
_:n3-142 sh:path schema:postalCode;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{5}(-[0-9]{4})?$";
    sh:message "postalCode must be a US ZIP or ZIP+4".
mshape:PostalAddressShape sh:property _:n3-142.
mshape:OrganizationShape a sh:NodeShape;
    sh:closed true.
_:n3-143 sh:path rdf:type;
    sh:hasValue schema:Organization.
mshape:OrganizationShape sh:property _:n3-143.
_:n3-144 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OrganizationShape sh:property _:n3-144.
mshape:MonetaryAmountShape a sh:NodeShape;
    sh:closed true.
_:n3-145 sh:path rdf:type;
    sh:hasValue schema:MonetaryAmount.
mshape:MonetaryAmountShape sh:property _:n3-145.
_:n3-146 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:MonetaryAmountShape sh:property _:n3-146.
_:n3-147 sh:path schema:currency;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-148 rdf:first "USD";
    rdf:rest rdf:nil.
_:n3-147 sh:in _:n3-148.
mshape:MonetaryAmountShape sh:property _:n3-147.
mshape:AppraisedValueShape a sh:NodeShape;
    sh:closed true.
_:n3-149 sh:path rdf:type;
    sh:hasValue fibo-fnd-arr-asmt:AppraisedValue.
mshape:AppraisedValueShape sh:property _:n3-149.
_:n3-150 sh:path rdf:type;
    sh:hasValue schema:MonetaryAmount.
mshape:AppraisedValueShape sh:property _:n3-150.
_:n3-151 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:AppraisedValueShape sh:property _:n3-151.
_:n3-152 sh:path schema:currency;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-153 rdf:first "USD";
    rdf:rest rdf:nil.
_:n3-152 sh:in _:n3-153.
mshape:AppraisedValueShape sh:property _:n3-152.
mshape:PropertyShape a sh:NodeShape;
    sh:closed true.
_:n3-154 sh:path rdf:type;
    sh:hasValue fibo-fnd-plc-rp:RealEstate.
mshape:PropertyShape sh:property _:n3-154.
_:n3-155 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:PropertyShape sh:property _:n3-155.
_:n3-156 sh:path fibo-fnd-arr-asmt:hasEstimatedValue;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraisedValueShape.
mshape:PropertyShape sh:property _:n3-156.
mshape:AppraisedPropertyShape a sh:NodeShape;
    sh:node mshape:PropertyShape.
_:n3-157 sh:path fibo-fnd-arr-asmt:hasEstimatedValue;
    sh:minCount 1;
    sh:message "an appraised property must carry its appraised value".
mshape:AppraisedPropertyShape sh:property _:n3-157.
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
_:n3-158 sh:path rdf:type;
    sh:hasValue dpv:ConsentReceipt.
mshape:ConsentReceiptShape sh:property _:n3-158.
_:n3-159 sh:path dpv:hasDataSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-159.
_:n3-160 sh:path dpv:hasDataController;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-160.
_:n3-161 sh:path odrl:target;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-161.
_:n3-162 sh:path dpv:hasPolicy;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-162.
_:n3-163 sh:path dpv:hasPurpose;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-163.
_:n3-164 sh:path dpv:hasConsentStatus;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-165 rdf:first dpv:ConsentGiven;
    rdf:rest _:n3-166.
_:n3-166 rdf:first dpv:ConsentWithdrawn;
    rdf:rest _:n3-167.
_:n3-167 rdf:first dpv:ConsentExpired;
    rdf:rest rdf:nil.
_:n3-164 sh:in _:n3-165;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-164.
_:n3-168 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:ConsentReceiptShape sh:property _:n3-168.
`,
  "contact-details": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:ContactDetailsShape a sh:NodeShape;
    sh:targetClass schema:ContactPoint;
    sh:closed true.
_:n3-169 sh:path rdf:type;
    sh:hasValue schema:ContactPoint.
mshape:ContactDetailsShape sh:property _:n3-169.
_:n3-170 sh:path schema:email;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ContactDetailsShape sh:property _:n3-170.
_:n3-171 sh:path schema:telephone;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ContactDetailsShape sh:property _:n3-171.
_:n3-172 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:ContactDetailsShape sh:property _:n3-172.
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
_:n3-173 sh:path rdf:type;
    sh:hasValue mort:CredentialPointer.
mshape:CredentialPointerShape sh:property _:n3-173.
_:n3-174 sh:path schema:url;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CredentialPointerShape sh:property _:n3-174.
_:n3-175 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CredentialPointerShape sh:property _:n3-175.
_:n3-176 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CredentialPointerShape sh:property _:n3-176.
_:n3-177 sh:path schema:sha256;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9a-f]{64}$";
    sh:minLength 1.
mshape:CredentialPointerShape sh:property _:n3-177.
_:n3-178 sh:path mort:asOf;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CredentialPointerShape sh:property _:n3-178.
_:n3-179 sh:path mort:signatureVerified;
    sh:maxCount 1;
    sh:datatype xsd:boolean.
mshape:CredentialPointerShape sh:property _:n3-179.
_:n3-180 sh:path mort:statusChecked;
    sh:maxCount 1;
    sh:datatype xsd:boolean.
mshape:CredentialPointerShape sh:property _:n3-180.
_:n3-181 sh:path mort:checkedAt;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CredentialPointerShape sh:property _:n3-181.
_:n3-182 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CredentialPointerShape sh:property _:n3-182.
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
_:n3-183 sh:path rdf:type;
    sh:hasValue mort:CreditReport.
mshape:CreditReportShape sh:property _:n3-183.
_:n3-184 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditReportShape sh:property _:n3-184.
_:n3-185 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditReportShape sh:property _:n3-185.
_:n3-186 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditReportShape sh:property _:n3-186.
_:n3-187 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditReportShape sh:property _:n3-187.
_:n3-188 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:CreditReportShape sh:property _:n3-188.
_:n3-189 sh:path mort:permissiblePurpose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditReportShape sh:property _:n3-189.
_:n3-190 sh:path mort:authorisedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditReportShape sh:property _:n3-190.
_:n3-191 sh:path mort:scoreDisclosure;
    sh:minCount 1;
    sh:maxCount 3;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ScoreDisclosureShape.
mshape:CreditReportShape sh:property _:n3-191.
_:n3-192 sh:path mort:totalMonthlyDebtUsd;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 9999.
mshape:CreditReportShape sh:property _:n3-192.
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
_:n3-193 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:CreditScoreCredentialShape sh:ignoredProperties _:n3-193.
_:n3-194 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:CreditScoreCredentialShape sh:property _:n3-194.
_:n3-195 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditScoreCredentialShape sh:property _:n3-195.
_:n3-196 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:CreditScoreCredentialShape sh:property _:n3-196.
_:n3-197 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CreditScoreCredentialShape sh:property _:n3-197.
_:n3-198 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:CreditScoreCredentialShape sh:property _:n3-198.
_:n3-199 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:CreditScoreSubjectShape.
mshape:CreditScoreCredentialShape sh:property _:n3-199.
_:n3-200 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:CreditScoreCredentialShape sh:property _:n3-200.
mshape:CreditScoreSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-201 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:CreditScoreSubjectShape sh:ignoredProperties _:n3-201.
_:n3-202 sh:path mort:creditScoreValue;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 300;
    sh:maxInclusive 850;
    sh:message "creditScoreValue must fit decision 0005's 3-digit budget (300..850)".
mshape:CreditScoreSubjectShape sh:property _:n3-202.
_:n3-203 sh:path mort:totalMonthlyDebtUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 9999;
    sh:message "totalMonthlyDebtUsd must fit decision 0005's 4-digit budget (0..9999 whole USD/month)".
mshape:CreditScoreSubjectShape sh:property _:n3-203.
_:n3-204 sh:path mort:scoreModel;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-205 rdf:first mort:ScoreModel-FICO8;
    rdf:rest rdf:nil.
_:n3-204 sh:in _:n3-205;
    sh:message "scoreModel must be a concept from mort:ScoreModelScheme".
mshape:CreditScoreSubjectShape sh:property _:n3-204.
`,
  "data-product": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix dcat: <http://www.w3.org/ns/dcat#>.
@prefix dpv: <https://w3id.org/dpv#>.
@prefix dprod: <https://ekgf.github.io/dprod/>.
@prefix odrl: <http://www.w3.org/ns/odrl/2/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:DataProductShape a sh:NodeShape;
    sh:targetClass dprod:DataProduct;
    sh:closed true.
_:n3-206 sh:path rdf:type;
    sh:hasValue dprod:DataProduct.
mshape:DataProductShape sh:property _:n3-206.
_:n3-207 sh:path dcterms:title;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DataProductShape sh:property _:n3-207.
_:n3-208 sh:path dcterms:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DataProductShape sh:property _:n3-208.
_:n3-209 sh:path dprod:dataProductOwner;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DataProductShape sh:property _:n3-209.
_:n3-210 sh:path dprod:purpose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DataProductShape sh:property _:n3-210.
_:n3-211 sh:path dpv:hasPurpose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DataProductShape sh:property _:n3-211.
_:n3-212 sh:path dprod:outputPort;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:DataServiceShape.
mshape:DataProductShape sh:property _:n3-212.
_:n3-213 sh:path odrl:hasPolicy;
    sh:nodeKind sh:IRI.
mshape:DataProductShape sh:property _:n3-213.
_:n3-214 sh:path dcterms:modified;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:DataProductShape sh:property _:n3-214.
mshape:DataServiceShape a sh:NodeShape;
    sh:closed true.
_:n3-215 sh:path rdf:type;
    sh:hasValue dcat:DataService.
mshape:DataServiceShape sh:property _:n3-215.
_:n3-216 sh:path dcat:endpointURL;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DataServiceShape sh:property _:n3-216.
`,
  "discharge-summary": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:DischargeSummaryShape a sh:NodeShape;
    sh:targetClass fhir:Composition;
    sh:closed true.
_:n3-217 sh:path rdf:type.
_:n3-218 rdf:first fhir:Composition;
    rdf:rest rdf:nil.
_:n3-217 sh:in _:n3-218.
mshape:DischargeSummaryShape sh:property _:n3-217.
_:n3-219 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-220 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-219 sh:in _:n3-220.
mshape:DischargeSummaryShape sh:property _:n3-219.
_:n3-221 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:DischargeSummaryShape sh:property _:n3-221.
_:n3-222 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:DischargeSummaryShape sh:property _:n3-222.
_:n3-224 rdf:first fhir:status;
    rdf:rest _:n3-225.
_:n3-225 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-223 sh:path _:n3-224.
_:n3-226 rdf:first "preliminary";
    rdf:rest _:n3-227.
_:n3-227 rdf:first "final";
    rdf:rest _:n3-228.
_:n3-228 rdf:first "amended";
    rdf:rest rdf:nil.
_:n3-223 sh:in _:n3-226.
mshape:DischargeSummaryShape sh:property _:n3-223.
_:n3-229 sh:path fhir:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:DischargeSummaryShape sh:property _:n3-229.
_:n3-231 rdf:first fhir:type;
    rdf:rest _:n3-232.
_:n3-232 rdf:first fhir:coding;
    rdf:rest _:n3-233.
_:n3-233 rdf:first _:n3-234.
_:n3-234 sh:zeroOrMorePath rdf:rest.
_:n3-233 rdf:rest _:n3-235.
_:n3-235 rdf:first rdf:first;
    rdf:rest _:n3-236.
_:n3-236 rdf:first fhir:code;
    rdf:rest _:n3-237.
_:n3-237 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-230 sh:path _:n3-231;
    sh:minCount 1.
_:n3-238 rdf:first "18842-5";
    rdf:rest rdf:nil.
_:n3-230 sh:in _:n3-238.
mshape:DischargeSummaryShape sh:property _:n3-230.
_:n3-239 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1.
mshape:DischargeSummaryShape sh:property _:n3-239.
_:n3-241 rdf:first fhir:subject;
    rdf:rest _:n3-242.
_:n3-242 rdf:first _:n3-243.
_:n3-243 sh:zeroOrMorePath rdf:rest.
_:n3-242 rdf:rest _:n3-244.
_:n3-244 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-240 sh:path _:n3-241;
    sh:minCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:DischargeSummaryShape sh:property _:n3-240.
_:n3-245 sh:path fhir:date;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:DischargeSummaryShape sh:property _:n3-245.
_:n3-246 sh:path fhir:author;
    sh:minCount 1;
    sh:maxCount 1.
mshape:DischargeSummaryShape sh:property _:n3-246.
_:n3-248 rdf:first fhir:author;
    rdf:rest _:n3-249.
_:n3-249 rdf:first _:n3-250.
_:n3-250 sh:zeroOrMorePath rdf:rest.
_:n3-249 rdf:rest _:n3-251.
_:n3-251 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-247 sh:path _:n3-248;
    sh:minCount 1;
    sh:node mshape:FhirReferenceShape.
mshape:DischargeSummaryShape sh:property _:n3-247.
_:n3-252 sh:path fhir:title;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:DischargeSummaryShape sh:property _:n3-252.
_:n3-253 sh:path fhir:note;
    sh:maxCount 1.
mshape:DischargeSummaryShape sh:property _:n3-253.
_:n3-255 rdf:first fhir:note;
    rdf:rest _:n3-256.
_:n3-256 rdf:first _:n3-257.
_:n3-257 sh:zeroOrMorePath rdf:rest.
_:n3-256 rdf:rest _:n3-258.
_:n3-258 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-254 sh:path _:n3-255;
    sh:node mshape:FhirAnnotationShape.
mshape:DischargeSummaryShape sh:property _:n3-254.
_:n3-259 sh:path fhir:section;
    sh:minCount 1;
    sh:maxCount 1.
mshape:DischargeSummaryShape sh:property _:n3-259.
_:n3-261 rdf:first fhir:section;
    rdf:rest _:n3-262.
_:n3-262 rdf:first _:n3-263.
_:n3-263 sh:zeroOrMorePath rdf:rest.
_:n3-262 rdf:rest _:n3-264.
_:n3-264 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-260 sh:path _:n3-261;
    sh:minCount 1;
    sh:node mshape:CompositionSectionShape.
mshape:DischargeSummaryShape sh:property _:n3-260.
mshape:CompositionSectionShape a sh:NodeShape;
    sh:closed true.
_:n3-265 sh:path fhir:title;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:CompositionSectionShape sh:property _:n3-265.
_:n3-266 sh:path fhir:entry;
    sh:maxCount 1.
mshape:CompositionSectionShape sh:property _:n3-266.
_:n3-268 rdf:first fhir:entry;
    rdf:rest _:n3-269.
_:n3-269 rdf:first _:n3-270.
_:n3-270 sh:zeroOrMorePath rdf:rest.
_:n3-269 rdf:rest _:n3-271.
_:n3-271 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-267 sh:path _:n3-268;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:CompositionSectionShape sh:property _:n3-267.
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
_:n3-272 sh:path rdf:type;
    sh:hasValue schema:DigitalDocument.
mshape:DocumentShape sh:property _:n3-272.
_:n3-273 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-273.
_:n3-274 sh:path schema:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-274.
_:n3-275 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DocumentShape sh:property _:n3-275.
_:n3-276 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:DocumentShape sh:property _:n3-276.
_:n3-277 sh:path schema:identifier;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-277.
_:n3-278 sh:path schema:about;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DocumentShape sh:property _:n3-278.
_:n3-279 sh:path schema:sha256;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9a-f]{64}$";
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-279.
_:n3-280 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-280.
_:n3-281 sh:path mort:subjectProperty;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:DocumentShape sh:property _:n3-281.
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
_:n3-282 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:EmploymentIncomeCredentialShape sh:ignoredProperties _:n3-282.
_:n3-283 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-283.
_:n3-284 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-284.
_:n3-285 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-285.
_:n3-286 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-286.
_:n3-287 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-287.
_:n3-288 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:EmploymentIncomeSubjectShape;
    sh:message "credentialSubject must be the borrower WebID (holder binding, decision 0012)".
mshape:EmploymentIncomeCredentialShape sh:property _:n3-288.
_:n3-289 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-289.
_:n3-290 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-290.
mshape:EmploymentIncomeSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-291 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:EmploymentIncomeSubjectShape sh:ignoredProperties _:n3-291.
_:n3-292 sh:path schema:worksFor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:EmploymentIncomeSubjectShape sh:property _:n3-292.
_:n3-293 sh:path schema:jobTitle;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EmploymentIncomeSubjectShape sh:property _:n3-293.
_:n3-294 sh:path schema:startDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:EmploymentIncomeSubjectShape sh:property _:n3-294.
_:n3-295 sh:path mort:monthlyGrossIncomeUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 9999;
    sh:message "monthlyGrossIncomeUsd must fit decision 0005's 4-digit budget (0..9999 whole USD/month)".
mshape:EmploymentIncomeSubjectShape sh:property _:n3-295.
`,
  "encounter-record": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:EncounterRecordShape a sh:NodeShape;
    sh:targetClass fhir:Encounter;
    sh:closed true.
_:n3-296 sh:path rdf:type.
_:n3-297 rdf:first fhir:Encounter;
    rdf:rest rdf:nil.
_:n3-296 sh:in _:n3-297.
mshape:EncounterRecordShape sh:property _:n3-296.
_:n3-298 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-299 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-298 sh:in _:n3-299.
mshape:EncounterRecordShape sh:property _:n3-298.
_:n3-300 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:EncounterRecordShape sh:property _:n3-300.
_:n3-301 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:EncounterRecordShape sh:property _:n3-301.
_:n3-303 rdf:first fhir:status;
    rdf:rest _:n3-304.
_:n3-304 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-302 sh:path _:n3-303.
_:n3-305 rdf:first "planned";
    rdf:rest _:n3-306.
_:n3-306 rdf:first "in-progress";
    rdf:rest _:n3-307.
_:n3-307 rdf:first "completed";
    rdf:rest _:n3-308.
_:n3-308 rdf:first "cancelled";
    rdf:rest rdf:nil.
_:n3-302 sh:in _:n3-305.
mshape:EncounterRecordShape sh:property _:n3-302.
_:n3-309 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:EncounterRecordShape sh:property _:n3-309.
_:n3-310 sh:path fhir:serviceProvider;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:EncounterRecordShape sh:property _:n3-310.
_:n3-311 sh:path fhir:actualPeriod;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirPeriodShape.
mshape:EncounterRecordShape sh:property _:n3-311.
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
_:n3-312 sh:path rdf:type;
    sh:hasValue mort:EscrowAccountStatement.
mshape:EscrowAccountStatementShape sh:property _:n3-312.
_:n3-313 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EscrowAccountStatementShape sh:property _:n3-313.
_:n3-314 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EscrowAccountStatementShape sh:property _:n3-314.
_:n3-315 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EscrowAccountStatementShape sh:property _:n3-315.
_:n3-316 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EscrowAccountStatementShape sh:property _:n3-316.
_:n3-317 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:EscrowAccountStatementShape sh:property _:n3-317.
_:n3-318 sh:path mort:monthlyEscrowPayment;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EscrowAccountStatementShape sh:property _:n3-318.
_:n3-319 sh:path mort:lineItem;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:LineItemShape.
mshape:EscrowAccountStatementShape sh:property _:n3-319.
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
_:n3-320 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:EvidenceOfInsuranceCredentialShape sh:ignoredProperties _:n3-320.
_:n3-321 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-321.
_:n3-322 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-322.
_:n3-323 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-323.
_:n3-324 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-324.
_:n3-325 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-325.
_:n3-326 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:EvidenceOfInsuranceSubjectShape.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-326.
_:n3-327 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-327.
_:n3-328 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-328.
mshape:EvidenceOfInsuranceSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-329 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:EvidenceOfInsuranceSubjectShape sh:ignoredProperties _:n3-329.
_:n3-330 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-330.
_:n3-331 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-331.
_:n3-332 sh:path mort:dwellingCoverage;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-332.
_:n3-333 sh:path mort:annualPremium;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-333.
_:n3-334 sh:path mort:deductible;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-334.
_:n3-335 sh:path schema:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:lessThan schema:validThrough.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-335.
_:n3-336 sh:path schema:validThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-336.
_:n3-337 sh:path mort:mortgageeClause;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-337.
_:n3-338 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-338.
`,
  "fhir-support": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:FhirStringShape a sh:NodeShape;
    sh:closed true.
_:n3-339 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:FhirStringShape sh:property _:n3-339.
mshape:FhirIdShape a sh:NodeShape;
    sh:closed true.
_:n3-340 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[A-Za-z0-9.-]{1,64}$".
mshape:FhirIdShape sh:property _:n3-340.
mshape:FhirDateTimeShape a sh:NodeShape;
    sh:closed true.
_:n3-341 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:FhirDateTimeShape sh:property _:n3-341.
mshape:FhirUriShape a sh:NodeShape;
    sh:closed true.
_:n3-342 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:anyURI.
mshape:FhirUriShape sh:property _:n3-342.
mshape:FhirDecimalShape a sh:NodeShape;
    sh:closed true.
_:n3-343 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.
mshape:FhirDecimalShape sh:property _:n3-343.
mshape:FhirCodingShape a sh:NodeShape;
    sh:closed true.
_:n3-344 sh:path fhir:system;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirUriShape.
mshape:FhirCodingShape sh:property _:n3-344.
_:n3-345 sh:path fhir:code;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirCodingShape sh:property _:n3-345.
_:n3-346 sh:path fhir:display;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirCodingShape sh:property _:n3-346.
mshape:FhirCodeableConceptShape a sh:NodeShape;
    sh:closed true.
_:n3-347 sh:path fhir:coding;
    sh:maxCount 1.
mshape:FhirCodeableConceptShape sh:property _:n3-347.
_:n3-349 rdf:first fhir:coding;
    rdf:rest _:n3-350.
_:n3-350 rdf:first _:n3-351.
_:n3-351 sh:zeroOrMorePath rdf:rest.
_:n3-350 rdf:rest _:n3-352.
_:n3-352 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-348 sh:path _:n3-349;
    sh:node mshape:FhirCodingShape.
mshape:FhirCodeableConceptShape sh:property _:n3-348.
_:n3-353 sh:path fhir:text;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirCodeableConceptShape sh:property _:n3-353.
mshape:FhirRxNormConceptShape a sh:NodeShape;
    sh:closed true.
_:n3-354 sh:path fhir:coding;
    sh:minCount 1;
    sh:maxCount 1.
mshape:FhirRxNormConceptShape sh:property _:n3-354.
_:n3-356 rdf:first fhir:coding;
    rdf:rest _:n3-357.
_:n3-357 rdf:first _:n3-358.
_:n3-358 sh:zeroOrMorePath rdf:rest.
_:n3-357 rdf:rest _:n3-359.
_:n3-359 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-355 sh:path _:n3-356;
    sh:minCount 1;
    sh:node mshape:FhirCodingShape.
mshape:FhirRxNormConceptShape sh:property _:n3-355.
_:n3-361 rdf:first fhir:coding;
    rdf:rest _:n3-362.
_:n3-362 rdf:first _:n3-363.
_:n3-363 sh:zeroOrMorePath rdf:rest.
_:n3-362 rdf:rest _:n3-364.
_:n3-364 rdf:first rdf:first;
    rdf:rest _:n3-365.
_:n3-365 rdf:first fhir:system;
    rdf:rest _:n3-366.
_:n3-366 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-360 sh:path _:n3-361.
_:n3-367 rdf:first "http://www.nlm.nih.gov/research/umls/rxnorm"^^xsd:anyURI;
    rdf:rest rdf:nil.
_:n3-360 sh:in _:n3-367.
mshape:FhirRxNormConceptShape sh:property _:n3-360.
_:n3-368 sh:path fhir:text;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirRxNormConceptShape sh:property _:n3-368.
mshape:FhirReferenceShape a sh:NodeShape;
    sh:closed true.
_:n3-369 sh:path fhir:reference;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirReferenceShape sh:property _:n3-369.
_:n3-370 sh:path fhir:link;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:FhirReferenceShape sh:property _:n3-370.
_:n3-371 sh:path fhir:display;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirReferenceShape sh:property _:n3-371.
mshape:FhirLinkedReferenceShape a sh:NodeShape;
    sh:node mshape:FhirReferenceShape.
_:n3-372 sh:path fhir:link;
    sh:minCount 1.
mshape:FhirLinkedReferenceShape sh:property _:n3-372.
_:n3-373 sh:path fhir:reference;
    sh:minCount 1.
mshape:FhirLinkedReferenceShape sh:property _:n3-373.
mshape:FhirMedicineShape a sh:NodeShape;
    sh:closed true.
_:n3-374 sh:path fhir:concept;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirRxNormConceptShape.
mshape:FhirMedicineShape sh:property _:n3-374.
mshape:FhirDosageShape a sh:NodeShape;
    sh:closed true.
_:n3-375 sh:path fhir:text;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirDosageShape sh:property _:n3-375.
mshape:FhirAnnotationShape a sh:NodeShape;
    sh:closed true.
_:n3-376 sh:path fhir:text;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirAnnotationShape sh:property _:n3-376.
mshape:FhirQuantityShape a sh:NodeShape;
    sh:closed true.
_:n3-377 sh:path fhir:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDecimalShape.
mshape:FhirQuantityShape sh:property _:n3-377.
_:n3-378 sh:path fhir:unit;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirQuantityShape sh:property _:n3-378.
mshape:FhirPeriodShape a sh:NodeShape;
    sh:closed true.
_:n3-379 sh:path fhir:start;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:FhirPeriodShape sh:property _:n3-379.
_:n3-380 sh:path fhir:end;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:FhirPeriodShape sh:property _:n3-380.
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
_:n3-381 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:IdentityCredentialShape sh:ignoredProperties _:n3-381.
_:n3-382 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:IdentityCredentialShape sh:property _:n3-382.
_:n3-383 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:IdentityCredentialShape sh:property _:n3-383.
_:n3-384 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:IdentityCredentialShape sh:property _:n3-384.
_:n3-385 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:IdentityCredentialShape sh:property _:n3-385.
_:n3-386 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:IdentityCredentialShape sh:property _:n3-386.
_:n3-387 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:IdentitySubjectShape.
mshape:IdentityCredentialShape sh:property _:n3-387.
_:n3-388 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:IdentityCredentialShape sh:property _:n3-388.
_:n3-389 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:IdentityCredentialShape sh:property _:n3-389.
mshape:IdentitySubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-390 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:IdentitySubjectShape sh:ignoredProperties _:n3-390.
_:n3-391 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:IdentitySubjectShape sh:property _:n3-391.
_:n3-392 sh:path schema:birthDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:IdentitySubjectShape sh:property _:n3-392.
_:n3-393 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:IdentitySubjectShape sh:property _:n3-393.
_:n3-394 sh:path mort:taxIdLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:minLength 1;
    sh:message "taxIdLast4 is exactly four digits; the full identifier never enters the pod".
mshape:IdentitySubjectShape sh:property _:n3-394.
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
_:n3-395 sh:path rdf:type;
    sh:hasValue as:Announce.
mshape:InboxMessageShape sh:property _:n3-395.
_:n3-396 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-397 rdf:first mort:MessageKind-CreditReportOrder;
    rdf:rest _:n3-398.
_:n3-398 rdf:first mort:MessageKind-CreditReportDelivery;
    rdf:rest _:n3-399.
_:n3-399 rdf:first mort:MessageKind-CasefileSubmission;
    rdf:rest _:n3-400.
_:n3-400 rdf:first mort:MessageKind-FindingsDelivery;
    rdf:rest _:n3-401.
_:n3-401 rdf:first mort:MessageKind-ServiceOrder;
    rdf:rest _:n3-402.
_:n3-402 rdf:first mort:MessageKind-AppraisalDelivery;
    rdf:rest _:n3-403.
_:n3-403 rdf:first mort:MessageKind-CommitmentDelivery;
    rdf:rest _:n3-404.
_:n3-404 rdf:first mort:MessageKind-RefreshRequest;
    rdf:rest _:n3-405.
_:n3-405 rdf:first mort:MessageKind-RefreshDelivery;
    rdf:rest _:n3-406.
_:n3-406 rdf:first mort:MessageKind-ClosingInstructions;
    rdf:rest _:n3-407.
_:n3-407 rdf:first mort:MessageKind-ClosingConfirmation;
    rdf:rest _:n3-408.
_:n3-408 rdf:first mort:MessageKind-RecordingSubmission;
    rdf:rest _:n3-409.
_:n3-409 rdf:first mort:MessageKind-RecordingConfirmation;
    rdf:rest _:n3-410.
_:n3-410 rdf:first mort:MessageKind-LoanDelivery;
    rdf:rest _:n3-411.
_:n3-411 rdf:first mort:MessageKind-PurchaseConfirmation;
    rdf:rest _:n3-412.
_:n3-412 rdf:first mort:MessageKind-ServicingBoarding;
    rdf:rest rdf:nil.
_:n3-396 sh:in _:n3-397;
    sh:message "dcterms:type must be a concept from mort:MessageKindScheme".
mshape:InboxMessageShape sh:property _:n3-396.
_:n3-413 sh:path as:actor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:InboxMessageShape sh:property _:n3-413.
_:n3-414 sh:path as:object;
    sh:nodeKind sh:IRI.
mshape:InboxMessageShape sh:property _:n3-414.
_:n3-415 sh:path as:summary;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:InboxMessageShape sh:property _:n3-415.
_:n3-416 sh:path as:published;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:InboxMessageShape sh:property _:n3-416.
_:n3-417 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:InboxMessageShape sh:property _:n3-417.
_:n3-418 sh:path as:inReplyTo;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:InboxMessageShape sh:property _:n3-418.
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
_:n3-419 sh:path rdf:type;
    sh:hasValue fibo-loan-ln-app:LoanApplication.
mshape:LoanApplicationShape sh:property _:n3-419.
_:n3-420 sh:path dcterms:created;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanApplicationShape sh:property _:n3-420.
_:n3-421 sh:path fibo-fnd-arr-rep:isSubmittedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanApplicationShape sh:property _:n3-421.
_:n3-422 sh:path fibo-loan-ln-app:hasRequestedAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanApplicationShape sh:property _:n3-422.
_:n3-423 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:LoanApplicationShape sh:property _:n3-423.
_:n3-424 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:LoanApplicationShape sh:property _:n3-424.
_:n3-425 sh:path dcterms:type;
    sh:minCount 3;
    sh:maxCount 4;
    sh:nodeKind sh:IRI.
_:n3-426 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-BusinessOrCommercial;
    rdf:rest _:n3-427.
_:n3-427 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-DwellingConstruction;
    rdf:rest _:n3-428.
_:n3-428 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-HomeImprovement;
    rdf:rest _:n3-429.
_:n3-429 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing;
    rdf:rest _:n3-430.
_:n3-430 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-MortgageModification;
    rdf:rest _:n3-431.
_:n3-431 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-RealPropertyPurchase;
    rdf:rest _:n3-432.
_:n3-432 rdf:first fibo-loan-reln-org:PropertyUsage-investment;
    rdf:rest _:n3-433.
_:n3-433 rdf:first fibo-loan-reln-org:PropertyUsage-primaryResidence;
    rdf:rest _:n3-434.
_:n3-434 rdf:first fibo-loan-reln-org:PropertyUsage-secondHome;
    rdf:rest _:n3-435.
_:n3-435 rdf:first fibo-loan-reln-org:AmortizationType-adjustableRate;
    rdf:rest _:n3-436.
_:n3-436 rdf:first fibo-loan-reln-org:AmortizationType-fixedRate;
    rdf:rest _:n3-437.
_:n3-437 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPayment;
    rdf:rest _:n3-438.
_:n3-438 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPaymentAdjustable;
    rdf:rest _:n3-439.
_:n3-439 rdf:first fibo-loan-reln-org:AmortizationType-growingEquity;
    rdf:rest _:n3-440.
_:n3-440 rdf:first fibo-loan-reln-org:AmortizationType-rateImprovement;
    rdf:rest _:n3-441.
_:n3-441 rdf:first fibo-loan-reln-org:AmortizationType-step;
    rdf:rest _:n3-442.
_:n3-442 rdf:first fibo-loan-reln-org:CashOutStatus-CashOut;
    rdf:rest _:n3-443.
_:n3-443 rdf:first fibo-loan-reln-org:CashOutStatus-LimitedCashOut;
    rdf:rest _:n3-444.
_:n3-444 rdf:first fibo-loan-reln-org:CashOutStatus-NoCashOut;
    rdf:rest rdf:nil.
_:n3-425 sh:in _:n3-426;
    sh:message "dcterms:type values must be URLA-aligned FIBO named individuals".
mshape:LoanApplicationShape sh:property _:n3-425.
_:n3-445 sh:path dcterms:type.
_:n3-447 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-BusinessOrCommercial;
    rdf:rest _:n3-448.
_:n3-448 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-DwellingConstruction;
    rdf:rest _:n3-449.
_:n3-449 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-HomeImprovement;
    rdf:rest _:n3-450.
_:n3-450 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing;
    rdf:rest _:n3-451.
_:n3-451 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-MortgageModification;
    rdf:rest _:n3-452.
_:n3-452 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-RealPropertyPurchase;
    rdf:rest rdf:nil.
_:n3-446 sh:in _:n3-447.
_:n3-445 sh:qualifiedValueShape _:n3-446;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1;
    sh:message "exactly one FIBO MortgageLoanPurpose individual is required".
mshape:LoanApplicationShape sh:property _:n3-445.
_:n3-453 sh:path dcterms:type.
_:n3-455 rdf:first fibo-loan-reln-org:PropertyUsage-investment;
    rdf:rest _:n3-456.
_:n3-456 rdf:first fibo-loan-reln-org:PropertyUsage-primaryResidence;
    rdf:rest _:n3-457.
_:n3-457 rdf:first fibo-loan-reln-org:PropertyUsage-secondHome;
    rdf:rest rdf:nil.
_:n3-454 sh:in _:n3-455.
_:n3-453 sh:qualifiedValueShape _:n3-454;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1;
    sh:message "exactly one FIBO PropertyUsage individual is required".
mshape:LoanApplicationShape sh:property _:n3-453.
_:n3-458 sh:path dcterms:type.
_:n3-460 rdf:first fibo-loan-reln-org:AmortizationType-adjustableRate;
    rdf:rest _:n3-461.
_:n3-461 rdf:first fibo-loan-reln-org:AmortizationType-fixedRate;
    rdf:rest _:n3-462.
_:n3-462 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPayment;
    rdf:rest _:n3-463.
_:n3-463 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPaymentAdjustable;
    rdf:rest _:n3-464.
_:n3-464 rdf:first fibo-loan-reln-org:AmortizationType-growingEquity;
    rdf:rest _:n3-465.
_:n3-465 rdf:first fibo-loan-reln-org:AmortizationType-rateImprovement;
    rdf:rest _:n3-466.
_:n3-466 rdf:first fibo-loan-reln-org:AmortizationType-step;
    rdf:rest rdf:nil.
_:n3-459 sh:in _:n3-460.
_:n3-458 sh:qualifiedValueShape _:n3-459;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1;
    sh:message "exactly one FIBO AmortizationType individual is required".
mshape:LoanApplicationShape sh:property _:n3-458.
_:n3-467 rdf:first _:n3-468.
_:n3-469 sh:path dcterms:type;
    sh:hasValue fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing.
_:n3-468 sh:property _:n3-469.
_:n3-470 sh:path dcterms:type.
_:n3-472 rdf:first fibo-loan-reln-org:CashOutStatus-CashOut;
    rdf:rest _:n3-473.
_:n3-473 rdf:first fibo-loan-reln-org:CashOutStatus-LimitedCashOut;
    rdf:rest _:n3-474.
_:n3-474 rdf:first fibo-loan-reln-org:CashOutStatus-NoCashOut;
    rdf:rest rdf:nil.
_:n3-471 sh:in _:n3-472.
_:n3-470 sh:qualifiedValueShape _:n3-471;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1.
_:n3-468 sh:property _:n3-470.
_:n3-467 rdf:rest _:n3-475.
_:n3-475 rdf:first _:n3-476.
_:n3-478 sh:path dcterms:type;
    sh:hasValue fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing.
_:n3-477 sh:property _:n3-478.
_:n3-476 sh:not _:n3-477.
_:n3-479 sh:path dcterms:type.
_:n3-481 rdf:first fibo-loan-reln-org:CashOutStatus-CashOut;
    rdf:rest _:n3-482.
_:n3-482 rdf:first fibo-loan-reln-org:CashOutStatus-LimitedCashOut;
    rdf:rest _:n3-483.
_:n3-483 rdf:first fibo-loan-reln-org:CashOutStatus-NoCashOut;
    rdf:rest rdf:nil.
_:n3-480 sh:in _:n3-481.
_:n3-479 sh:qualifiedValueShape _:n3-480;
    sh:qualifiedMaxCount 0.
_:n3-476 sh:property _:n3-479.
_:n3-475 rdf:rest rdf:nil.
mshape:LoanApplicationShape sh:or _:n3-467.
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
_:n3-484 sh:path rdf:type;
    sh:hasValue mort:LoanEstimate.
mshape:LoanEstimateShape sh:property _:n3-484.
_:n3-485 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanEstimateShape sh:property _:n3-485.
_:n3-486 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanEstimateShape sh:property _:n3-486.
_:n3-487 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanEstimateShape sh:property _:n3-487.
_:n3-488 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanEstimateShape sh:property _:n3-488.
_:n3-489 sh:path mort:applicationDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:lessThan schema:expires.
mshape:LoanEstimateShape sh:property _:n3-489.
_:n3-490 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanEstimateShape sh:property _:n3-490.
_:n3-491 sh:path schema:expires;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanEstimateShape sh:property _:n3-491.
_:n3-492 sh:path mort:intentToProceedDate;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanEstimateShape sh:property _:n3-492.
_:n3-493 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-493.
_:n3-494 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 6.5)".
mshape:LoanEstimateShape sh:property _:n3-494.
_:n3-495 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:LoanEstimateShape sh:property _:n3-495.
_:n3-496 sh:path mort:annualPercentageRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 40.0.
mshape:LoanEstimateShape sh:property _:n3-496.
_:n3-497 sh:path mort:monthlyPrincipalAndInterest;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-497.
_:n3-498 sh:path mort:estimatedTotalMonthlyPayment;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-498.
_:n3-499 sh:path fibo-loan-ln-ln:hasTotalClosingCosts;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-499.
_:n3-500 sh:path mort:cashToClose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-500.
_:n3-501 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:LoanEstimateShape sh:property _:n3-501.
`,
  "medication-dispense": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:MedicationDispenseShape a sh:NodeShape;
    sh:targetClass fhir:MedicationDispense;
    sh:closed true.
_:n3-502 sh:path rdf:type.
_:n3-503 rdf:first fhir:MedicationDispense;
    rdf:rest rdf:nil.
_:n3-502 sh:in _:n3-503.
mshape:MedicationDispenseShape sh:property _:n3-502.
_:n3-504 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-505 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-504 sh:in _:n3-505.
mshape:MedicationDispenseShape sh:property _:n3-504.
_:n3-506 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:MedicationDispenseShape sh:property _:n3-506.
_:n3-507 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:MedicationDispenseShape sh:property _:n3-507.
_:n3-509 rdf:first fhir:status;
    rdf:rest _:n3-510.
_:n3-510 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-508 sh:path _:n3-509.
_:n3-511 rdf:first "completed";
    rdf:rest _:n3-512.
_:n3-512 rdf:first "in-progress";
    rdf:rest _:n3-513.
_:n3-513 rdf:first "declined";
    rdf:rest rdf:nil.
_:n3-508 sh:in _:n3-511.
mshape:MedicationDispenseShape sh:property _:n3-508.
_:n3-514 sh:path fhir:medication;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirMedicineShape.
mshape:MedicationDispenseShape sh:property _:n3-514.
_:n3-515 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationDispenseShape sh:property _:n3-515.
_:n3-516 sh:path fhir:performer;
    sh:minCount 1;
    sh:maxCount 1.
mshape:MedicationDispenseShape sh:property _:n3-516.
_:n3-518 rdf:first fhir:performer;
    rdf:rest _:n3-519.
_:n3-519 rdf:first _:n3-520.
_:n3-520 sh:zeroOrMorePath rdf:rest.
_:n3-519 rdf:rest _:n3-521.
_:n3-521 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-517 sh:path _:n3-518;
    sh:minCount 1;
    sh:node mshape:DispensePerformerShape.
mshape:MedicationDispenseShape sh:property _:n3-517.
_:n3-522 sh:path fhir:authorizingPrescription;
    sh:maxCount 1.
mshape:MedicationDispenseShape sh:property _:n3-522.
_:n3-524 rdf:first fhir:authorizingPrescription;
    rdf:rest _:n3-525.
_:n3-525 rdf:first _:n3-526.
_:n3-526 sh:zeroOrMorePath rdf:rest.
_:n3-525 rdf:rest _:n3-527.
_:n3-527 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-523 sh:path _:n3-524;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationDispenseShape sh:property _:n3-523.
_:n3-528 sh:path fhir:quantity;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirQuantityShape.
mshape:MedicationDispenseShape sh:property _:n3-528.
_:n3-529 sh:path fhir:whenHandedOver;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:MedicationDispenseShape sh:property _:n3-529.
_:n3-530 sh:path fhir:dosageInstruction;
    sh:maxCount 1.
mshape:MedicationDispenseShape sh:property _:n3-530.
_:n3-532 rdf:first fhir:dosageInstruction;
    rdf:rest _:n3-533.
_:n3-533 rdf:first _:n3-534.
_:n3-534 sh:zeroOrMorePath rdf:rest.
_:n3-533 rdf:rest _:n3-535.
_:n3-535 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-531 sh:path _:n3-532;
    sh:node mshape:FhirDosageShape.
mshape:MedicationDispenseShape sh:property _:n3-531.
mshape:DispensePerformerShape a sh:NodeShape;
    sh:closed true.
_:n3-536 sh:path fhir:actor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:DispensePerformerShape sh:property _:n3-536.
`,
  "medication-request": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:MedicationRequestShape a sh:NodeShape;
    sh:targetClass fhir:MedicationRequest;
    sh:closed true.
_:n3-537 sh:path rdf:type.
_:n3-538 rdf:first fhir:MedicationRequest;
    rdf:rest rdf:nil.
_:n3-537 sh:in _:n3-538.
mshape:MedicationRequestShape sh:property _:n3-537.
_:n3-539 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-540 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-539 sh:in _:n3-540.
mshape:MedicationRequestShape sh:property _:n3-539.
_:n3-541 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:MedicationRequestShape sh:property _:n3-541.
_:n3-542 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:MedicationRequestShape sh:property _:n3-542.
_:n3-544 rdf:first fhir:status;
    rdf:rest _:n3-545.
_:n3-545 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-543 sh:path _:n3-544.
_:n3-546 rdf:first "active";
    rdf:rest _:n3-547.
_:n3-547 rdf:first "on-hold";
    rdf:rest _:n3-548.
_:n3-548 rdf:first "ended";
    rdf:rest _:n3-549.
_:n3-549 rdf:first "stopped";
    rdf:rest _:n3-550.
_:n3-550 rdf:first "completed";
    rdf:rest _:n3-551.
_:n3-551 rdf:first "cancelled";
    rdf:rest _:n3-552.
_:n3-552 rdf:first "entered-in-error";
    rdf:rest _:n3-553.
_:n3-553 rdf:first "draft";
    rdf:rest _:n3-554.
_:n3-554 rdf:first "unknown";
    rdf:rest rdf:nil.
_:n3-543 sh:in _:n3-546.
mshape:MedicationRequestShape sh:property _:n3-543.
_:n3-555 sh:path fhir:intent;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:MedicationRequestShape sh:property _:n3-555.
_:n3-557 rdf:first fhir:intent;
    rdf:rest _:n3-558.
_:n3-558 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-556 sh:path _:n3-557.
_:n3-559 rdf:first "order";
    rdf:rest _:n3-560.
_:n3-560 rdf:first "plan";
    rdf:rest _:n3-561.
_:n3-561 rdf:first "proposal";
    rdf:rest rdf:nil.
_:n3-556 sh:in _:n3-559.
mshape:MedicationRequestShape sh:property _:n3-556.
_:n3-562 sh:path fhir:medication;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirMedicineShape.
mshape:MedicationRequestShape sh:property _:n3-562.
_:n3-563 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationRequestShape sh:property _:n3-563.
_:n3-564 sh:path fhir:authoredOn;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:MedicationRequestShape sh:property _:n3-564.
_:n3-565 sh:path fhir:requester;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationRequestShape sh:property _:n3-565.
_:n3-566 sh:path fhir:dosageInstruction;
    sh:minCount 1;
    sh:maxCount 1.
mshape:MedicationRequestShape sh:property _:n3-566.
_:n3-568 rdf:first fhir:dosageInstruction;
    rdf:rest _:n3-569.
_:n3-569 rdf:first _:n3-570.
_:n3-570 sh:zeroOrMorePath rdf:rest.
_:n3-569 rdf:rest _:n3-571.
_:n3-571 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-567 sh:path _:n3-568;
    sh:minCount 1;
    sh:node mshape:FhirDosageShape.
mshape:MedicationRequestShape sh:property _:n3-567.
`,
  "medication-statement": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:MedicationStatementShape a sh:NodeShape;
    sh:targetClass fhir:MedicationStatement;
    sh:closed true.
_:n3-572 sh:path rdf:type.
_:n3-573 rdf:first fhir:MedicationStatement;
    rdf:rest rdf:nil.
_:n3-572 sh:in _:n3-573.
mshape:MedicationStatementShape sh:property _:n3-572.
_:n3-574 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-575 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-574 sh:in _:n3-575.
mshape:MedicationStatementShape sh:property _:n3-574.
_:n3-576 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:MedicationStatementShape sh:property _:n3-576.
_:n3-578 rdf:first fhir:status;
    rdf:rest _:n3-579.
_:n3-579 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-577 sh:path _:n3-578;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-580 rdf:first "recorded";
    rdf:rest _:n3-581.
_:n3-581 rdf:first "entered-in-error";
    rdf:rest _:n3-582.
_:n3-582 rdf:first "draft";
    rdf:rest rdf:nil.
_:n3-577 sh:in _:n3-580.
mshape:MedicationStatementShape sh:property _:n3-577.
_:n3-583 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:MedicationStatementShape sh:property _:n3-583.
_:n3-584 sh:path fhir:medication;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirMedicineShape.
mshape:MedicationStatementShape sh:property _:n3-584.
_:n3-585 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationStatementShape sh:property _:n3-585.
_:n3-586 sh:path fhir:dateAsserted;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:MedicationStatementShape sh:property _:n3-586.
_:n3-587 sh:path fhir:dosage;
    sh:minCount 1;
    sh:maxCount 1.
mshape:MedicationStatementShape sh:property _:n3-587.
_:n3-589 rdf:first fhir:dosage;
    rdf:rest _:n3-590.
_:n3-590 rdf:first _:n3-591.
_:n3-591 sh:zeroOrMorePath rdf:rest.
_:n3-590 rdf:rest _:n3-592.
_:n3-592 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-588 sh:path _:n3-589;
    sh:minCount 1;
    sh:node mshape:FhirDosageShape.
mshape:MedicationStatementShape sh:property _:n3-588.
_:n3-593 sh:path fhir:adherence;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:MedicationAdherenceShape.
mshape:MedicationStatementShape sh:property _:n3-593.
mshape:MedicationAdherenceShape a sh:NodeShape;
    sh:closed true.
_:n3-594 sh:path fhir:code;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:MedicationAdherenceShape sh:property _:n3-594.
_:n3-596 rdf:first fhir:code;
    rdf:rest _:n3-597.
_:n3-597 rdf:first fhir:coding;
    rdf:rest _:n3-598.
_:n3-598 rdf:first _:n3-599.
_:n3-599 sh:zeroOrMorePath rdf:rest.
_:n3-598 rdf:rest _:n3-600.
_:n3-600 rdf:first rdf:first;
    rdf:rest _:n3-601.
_:n3-601 rdf:first fhir:code;
    rdf:rest _:n3-602.
_:n3-602 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-595 sh:path _:n3-596;
    sh:minCount 1.
_:n3-603 rdf:first "taking-as-directed";
    rdf:rest _:n3-604.
_:n3-604 rdf:first "stopped-as-directed";
    rdf:rest rdf:nil.
_:n3-595 sh:in _:n3-603.
mshape:MedicationAdherenceShape sh:property _:n3-595.
_:n3-605 sh:path fhir:reason;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:MedicationAdherenceShape sh:property _:n3-605.
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
_:n3-606 sh:path rdf:type;
    sh:hasValue odrl:Agreement.
mshape:OdrlPolicyShape sh:property _:n3-606.
_:n3-607 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OdrlPolicyShape sh:property _:n3-607.
_:n3-608 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OdrlPolicyShape sh:property _:n3-608.
_:n3-609 sh:path dcterms:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OdrlPolicyShape sh:property _:n3-609.
_:n3-610 sh:path odrl:assigner;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OdrlPolicyShape sh:property _:n3-610.
_:n3-611 sh:path odrl:assignee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OdrlPolicyShape sh:property _:n3-611.
_:n3-612 sh:path odrl:permission;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PermissionShape.
mshape:OdrlPolicyShape sh:property _:n3-612.
_:n3-613 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:OdrlPolicyShape sh:property _:n3-613.
_:n3-614 sh:path dcterms:source;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OdrlPolicyShape sh:property _:n3-614.
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
_:n3-615 sh:path rdf:type;
    sh:hasValue mort:PaymentMandate.
mshape:PaymentMandateShape sh:property _:n3-615.
_:n3-616 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PaymentMandateShape sh:property _:n3-616.
_:n3-617 sh:path mort:payee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PaymentMandateShape sh:property _:n3-617.
_:n3-618 sh:path mort:accountLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:minLength 1.
mshape:PaymentMandateShape sh:property _:n3-618.
_:n3-619 sh:path schema:provider;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:PaymentMandateShape sh:property _:n3-619.
_:n3-620 sh:path schema:amount;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PaymentMandateShape sh:property _:n3-620.
_:n3-621 sh:path mort:debitDayOfMonth;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1;
    sh:maxInclusive 28.
mshape:PaymentMandateShape sh:property _:n3-621.
_:n3-622 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:PaymentMandateShape sh:property _:n3-622.
_:n3-623 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PaymentMandateShape sh:property _:n3-623.
`,
  "provenance-record": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:ProvenanceRecordShape a sh:NodeShape;
    sh:targetClass fhir:Provenance;
    sh:closed true.
_:n3-624 sh:path rdf:type.
_:n3-625 rdf:first fhir:Provenance;
    rdf:rest rdf:nil.
_:n3-624 sh:in _:n3-625.
mshape:ProvenanceRecordShape sh:property _:n3-624.
_:n3-626 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-627 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-626 sh:in _:n3-627.
mshape:ProvenanceRecordShape sh:property _:n3-626.
_:n3-628 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:ProvenanceRecordShape sh:property _:n3-628.
_:n3-629 sh:path fhir:target;
    sh:minCount 1;
    sh:maxCount 1.
mshape:ProvenanceRecordShape sh:property _:n3-629.
_:n3-631 rdf:first fhir:target;
    rdf:rest _:n3-632.
_:n3-632 rdf:first _:n3-633.
_:n3-633 sh:zeroOrMorePath rdf:rest.
_:n3-632 rdf:rest _:n3-634.
_:n3-634 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-630 sh:path _:n3-631;
    sh:minCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:ProvenanceRecordShape sh:property _:n3-630.
_:n3-635 sh:path fhir:recorded;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:ProvenanceRecordShape sh:property _:n3-635.
_:n3-636 sh:path fhir:why;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:ProvenanceRecordShape sh:property _:n3-636.
_:n3-637 sh:path fhir:activity;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:ProvenanceRecordShape sh:property _:n3-637.
_:n3-639 rdf:first fhir:activity;
    rdf:rest _:n3-640.
_:n3-640 rdf:first fhir:coding;
    rdf:rest _:n3-641.
_:n3-641 rdf:first _:n3-642.
_:n3-642 sh:zeroOrMorePath rdf:rest.
_:n3-641 rdf:rest _:n3-643.
_:n3-643 rdf:first rdf:first;
    rdf:rest _:n3-644.
_:n3-644 rdf:first fhir:code;
    rdf:rest _:n3-645.
_:n3-645 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-638 sh:path _:n3-639;
    sh:minCount 1.
_:n3-646 rdf:first "CREATE";
    rdf:rest _:n3-647.
_:n3-647 rdf:first "UPDATE";
    rdf:rest rdf:nil.
_:n3-638 sh:in _:n3-646.
mshape:ProvenanceRecordShape sh:property _:n3-638.
_:n3-648 sh:path fhir:patient;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:ProvenanceRecordShape sh:property _:n3-648.
_:n3-649 sh:path fhir:agent;
    sh:minCount 1;
    sh:maxCount 1.
mshape:ProvenanceRecordShape sh:property _:n3-649.
_:n3-651 rdf:first fhir:agent;
    rdf:rest _:n3-652.
_:n3-652 rdf:first _:n3-653.
_:n3-653 sh:zeroOrMorePath rdf:rest.
_:n3-652 rdf:rest _:n3-654.
_:n3-654 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-650 sh:path _:n3-651;
    sh:minCount 1;
    sh:node mshape:ProvenanceAgentShape.
mshape:ProvenanceRecordShape sh:property _:n3-650.
mshape:ProvenanceAgentShape a sh:NodeShape;
    sh:closed true.
_:n3-655 sh:path fhir:type;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:ProvenanceAgentShape sh:property _:n3-655.
_:n3-656 sh:path fhir:who;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirReferenceShape.
mshape:ProvenanceAgentShape sh:property _:n3-656.
_:n3-657 sh:path fhir:onBehalfOf;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:ProvenanceAgentShape sh:property _:n3-657.
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
_:n3-658 sh:path rdf:type;
    sh:hasValue mort:PurchaseAgreement.
mshape:PurchaseAgreementShape sh:property _:n3-658.
_:n3-659 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PurchaseAgreementShape sh:property _:n3-659.
_:n3-660 sh:path schema:buyer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PurchaseAgreementShape sh:property _:n3-660.
_:n3-661 sh:path schema:seller;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:NamedPartyShape.
mshape:PurchaseAgreementShape sh:property _:n3-661.
_:n3-662 sh:path mort:purchasePrice;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PurchaseAgreementShape sh:property _:n3-662.
_:n3-663 sh:path mort:earnestMoneyDeposit;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PurchaseAgreementShape sh:property _:n3-663.
_:n3-664 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:PurchaseAgreementShape sh:property _:n3-664.
_:n3-665 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:PurchaseAgreementShape sh:property _:n3-665.
_:n3-666 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:PurchaseAgreementShape sh:property _:n3-666.
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
_:n3-667 sh:path rdf:type;
    sh:hasValue mort:RecordedInstrument.
mshape:RecordedInstrumentShape sh:property _:n3-667.
_:n3-668 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-668.
_:n3-669 sh:path mort:recordingReference;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-669.
_:n3-670 sh:path mort:recordedAt;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:RecordedInstrumentShape sh:property _:n3-670.
_:n3-671 sh:path mort:grantor;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-671.
_:n3-672 sh:path mort:grantee;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-672.
_:n3-673 sh:path mort:parcelNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-673.
_:n3-674 sh:path dcterms:creator;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:RecordedInstrumentShape sh:property _:n3-674.
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
_:n3-675 sh:path rdf:type;
    sh:hasValue mort:RecordingReceipt.
mshape:RecordingReceiptShape sh:property _:n3-675.
_:n3-676 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordingReceiptShape sh:property _:n3-676.
_:n3-677 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:RecordingReceiptShape sh:property _:n3-677.
_:n3-678 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:RecordingReceiptShape sh:property _:n3-678.
_:n3-679 sh:path mort:recordedInstrument;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:RecordingReceiptShape sh:property _:n3-679.
_:n3-680 sh:path mort:recordingReference;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordingReceiptShape sh:property _:n3-680.
_:n3-681 sh:path mort:subjectProperty;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:RecordingReceiptShape sh:property _:n3-681.
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
_:n3-682 sh:path rdf:type;
    sh:hasValue mort:CreditScoreNotice.
mshape:CreditScoreNoticeShape sh:property _:n3-682.
_:n3-683 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditScoreNoticeShape sh:property _:n3-683.
_:n3-684 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditScoreNoticeShape sh:property _:n3-684.
_:n3-685 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditScoreNoticeShape sh:property _:n3-685.
_:n3-686 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditScoreNoticeShape sh:property _:n3-686.
_:n3-687 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:CreditScoreNoticeShape sh:property _:n3-687.
_:n3-688 sh:path mort:scoreDisclosure;
    sh:minCount 1;
    sh:maxCount 3;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ScoreDisclosureShape.
mshape:CreditScoreNoticeShape sh:property _:n3-688.
_:n3-689 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditScoreNoticeShape sh:property _:n3-689.
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
_:n3-690 sh:path rdf:type;
    sh:hasValue schema:Order.
mshape:ServiceOrderShape sh:property _:n3-690.
_:n3-691 sh:path schema:orderNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ServiceOrderShape sh:property _:n3-691.
_:n3-692 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-693 rdf:first mort:ServiceKind-CreditReport;
    rdf:rest _:n3-694.
_:n3-694 rdf:first mort:ServiceKind-Appraisal;
    rdf:rest _:n3-695.
_:n3-695 rdf:first mort:ServiceKind-Title;
    rdf:rest _:n3-696.
_:n3-696 rdf:first mort:ServiceKind-FloodDetermination;
    rdf:rest _:n3-697.
_:n3-697 rdf:first mort:ServiceKind-TaxTranscripts;
    rdf:rest rdf:nil.
_:n3-692 sh:in _:n3-693.
mshape:ServiceOrderShape sh:property _:n3-692.
_:n3-698 sh:path schema:customer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ServiceOrderShape sh:property _:n3-698.
_:n3-699 sh:path schema:seller;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ServiceOrderShape sh:property _:n3-699.
_:n3-700 sh:path schema:orderDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ServiceOrderShape sh:property _:n3-700.
_:n3-701 sh:path schema:orderStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-702 rdf:first schema:OrderProcessing;
    rdf:rest _:n3-703.
_:n3-703 rdf:first schema:OrderDelivered;
    rdf:rest rdf:nil.
_:n3-701 sh:in _:n3-702.
mshape:ServiceOrderShape sh:property _:n3-701.
_:n3-704 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ServiceOrderShape sh:property _:n3-704.
_:n3-705 sh:path mort:authorisedBy;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ServiceOrderShape sh:property _:n3-705.
_:n3-706 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ServiceOrderShape sh:property _:n3-706.
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
_:n3-707 sh:path rdf:type;
    sh:hasValue mort:LoanTransferNotice.
mshape:LoanTransferNoticeShape sh:property _:n3-707.
_:n3-708 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-708.
_:n3-709 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-710 rdf:first mort:NoticeKind-ServicingTransferFromTransferor;
    rdf:rest _:n3-711.
_:n3-711 rdf:first mort:NoticeKind-ServicingTransferFromTransferee;
    rdf:rest _:n3-712.
_:n3-712 rdf:first mort:NoticeKind-OwnershipTransfer;
    rdf:rest rdf:nil.
_:n3-709 sh:in _:n3-710;
    sh:message "dcterms:type must be a concept from mort:NoticeKindScheme".
mshape:LoanTransferNoticeShape sh:property _:n3-709.
_:n3-713 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-713.
_:n3-714 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanTransferNoticeShape sh:property _:n3-714.
_:n3-715 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanTransferNoticeShape sh:property _:n3-715.
_:n3-716 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanTransferNoticeShape sh:property _:n3-716.
_:n3-717 sh:path mort:transferEffectiveDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanTransferNoticeShape sh:property _:n3-717.
_:n3-718 sh:path mort:transferor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:LoanTransferNoticeShape sh:property _:n3-718.
_:n3-719 sh:path mort:transferee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:LoanTransferNoticeShape sh:property _:n3-719.
_:n3-720 sh:path mort:paymentProtectionEnds;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanTransferNoticeShape sh:property _:n3-720.
_:n3-721 sh:path schema:telephone;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-721.
_:n3-722 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-722.
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
_:n3-723 sh:path rdf:type;
    sh:hasValue mort:SettlementStatement.
mshape:SettlementStatementShape sh:property _:n3-723.
_:n3-724 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SettlementStatementShape sh:property _:n3-724.
_:n3-725 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SettlementStatementShape sh:property _:n3-725.
_:n3-726 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SettlementStatementShape sh:property _:n3-726.
_:n3-727 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:SettlementStatementShape sh:property _:n3-727.
_:n3-728 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:SettlementStatementShape sh:property _:n3-728.
_:n3-729 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:SettlementStatementShape sh:property _:n3-729.
_:n3-730 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:SettlementStatementShape sh:property _:n3-730.
_:n3-731 sh:path mort:disbursementDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:SettlementStatementShape sh:property _:n3-731.
_:n3-732 sh:path mort:purchasePrice;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:SettlementStatementShape sh:property _:n3-732.
_:n3-733 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:SettlementStatementShape sh:property _:n3-733.
_:n3-734 sh:path mort:lineItem;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:LineItemShape.
mshape:SettlementStatementShape sh:property _:n3-734.
_:n3-735 sh:path mort:cashToClose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:SettlementStatementShape sh:property _:n3-735.
_:n3-736 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:SettlementStatementShape sh:property _:n3-736.
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
_:n3-737 sh:path rdf:type;
    sh:hasValue schema:SingleFamilyResidence.
mshape:SubjectPropertyShape sh:property _:n3-737.
_:n3-738 sh:path rdf:type;
    sh:hasValue fibo-fnd-plc-rp:RealEstate.
mshape:SubjectPropertyShape sh:property _:n3-738.
_:n3-739 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:SubjectPropertyShape sh:property _:n3-739.
_:n3-740 sh:path schema:yearBuilt;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1600;
    sh:maxInclusive 2100.
mshape:SubjectPropertyShape sh:property _:n3-740.
_:n3-741 sh:path schema:floorSize;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:FloorSizeShape.
mshape:SubjectPropertyShape sh:property _:n3-741.
_:n3-742 sh:path schema:numberOfBedrooms;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 50.
mshape:SubjectPropertyShape sh:property _:n3-742.
_:n3-743 sh:path schema:numberOfBathroomsTotal;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 50.
mshape:SubjectPropertyShape sh:property _:n3-743.
_:n3-744 sh:path mort:constructionType;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-744.
_:n3-745 sh:path mort:roofType;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-745.
_:n3-746 sh:path mort:parcelNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-746.
_:n3-747 sh:path mort:legalDescription;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-747.
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
_:n3-748 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:NamedPartyShape sh:ignoredProperties _:n3-748.
_:n3-749 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:NamedPartyShape sh:property _:n3-749.
mshape:LineItemShape a sh:NodeShape;
    sh:closed true.
_:n3-750 sh:path rdf:type;
    sh:hasValue schema:MonetaryAmount.
mshape:LineItemShape sh:property _:n3-750.
_:n3-751 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LineItemShape sh:property _:n3-751.
_:n3-752 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal.
mshape:LineItemShape sh:property _:n3-752.
_:n3-753 sh:path schema:currency;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-754 rdf:first "USD";
    rdf:rest rdf:nil.
_:n3-753 sh:in _:n3-754.
mshape:LineItemShape sh:property _:n3-753.
mshape:FloorSizeShape a sh:NodeShape;
    sh:closed true.
_:n3-755 sh:path rdf:type;
    sh:hasValue schema:QuantitativeValue.
mshape:FloorSizeShape sh:property _:n3-755.
_:n3-756 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 1.0.
mshape:FloorSizeShape sh:property _:n3-756.
_:n3-757 sh:path schema:unitCode;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-758 rdf:first "FTK";
    rdf:rest rdf:nil.
_:n3-757 sh:in _:n3-758.
mshape:FloorSizeShape sh:property _:n3-757.
mshape:ScoreDisclosureShape a sh:NodeShape;
    sh:closed true.
_:n3-759 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:ScoreDisclosureShape sh:ignoredProperties _:n3-759.
_:n3-760 sh:path mort:creditScoreValue;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 300;
    sh:maxInclusive 850.
mshape:ScoreDisclosureShape sh:property _:n3-760.
_:n3-761 sh:path mort:scoreModel;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-762 rdf:first mort:ScoreModel-FICO8;
    rdf:rest _:n3-763.
_:n3-763 rdf:first mort:ScoreModel-ClassicFICO;
    rdf:rest _:n3-764.
_:n3-764 rdf:first mort:ScoreModel-VantageScore4;
    rdf:rest rdf:nil.
_:n3-761 sh:in _:n3-762.
mshape:ScoreDisclosureShape sh:property _:n3-761.
_:n3-765 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ScoreDisclosureShape sh:property _:n3-765.
_:n3-766 sh:path dcterms:created;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ScoreDisclosureShape sh:property _:n3-766.
_:n3-767 sh:path mort:keyFactor;
    sh:maxCount 5;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ScoreDisclosureShape sh:property _:n3-767.
mshape:ConstraintShape a sh:NodeShape;
    sh:closed true.
_:n3-768 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:ConstraintShape sh:ignoredProperties _:n3-768.
_:n3-769 sh:path odrl:leftOperand;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-770 rdf:first odrl:purpose;
    rdf:rest _:n3-771.
_:n3-771 rdf:first odrl:dateTime;
    rdf:rest _:n3-772.
_:n3-772 rdf:first odrl:event;
    rdf:rest rdf:nil.
_:n3-769 sh:in _:n3-770.
mshape:ConstraintShape sh:property _:n3-769.
_:n3-773 sh:path odrl:operator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-774 rdf:first odrl:eq;
    rdf:rest _:n3-775.
_:n3-775 rdf:first odrl:lt;
    rdf:rest _:n3-776.
_:n3-776 rdf:first odrl:lteq;
    rdf:rest rdf:nil.
_:n3-773 sh:in _:n3-774.
mshape:ConstraintShape sh:property _:n3-773.
_:n3-777 sh:path odrl:rightOperand;
    sh:minCount 1;
    sh:maxCount 1.
mshape:ConstraintShape sh:property _:n3-777.
mshape:PermissionShape a sh:NodeShape;
    sh:closed true.
_:n3-778 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:PermissionShape sh:ignoredProperties _:n3-778.
_:n3-779 sh:path odrl:target;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:PermissionShape sh:property _:n3-779.
_:n3-780 sh:path odrl:action;
    sh:minCount 1;
    sh:maxCount 3;
    sh:nodeKind sh:IRI.
_:n3-781 rdf:first odrl:read;
    rdf:rest _:n3-782.
_:n3-782 rdf:first odrl:append;
    rdf:rest _:n3-783.
_:n3-783 rdf:first odrl:write;
    rdf:rest rdf:nil.
_:n3-780 sh:in _:n3-781.
mshape:PermissionShape sh:property _:n3-780.
_:n3-784 sh:path odrl:assignee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PermissionShape sh:property _:n3-784.
_:n3-785 sh:path odrl:constraint;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ConstraintShape.
mshape:PermissionShape sh:property _:n3-785.
mshape:AgentShape a sh:NodeShape;
    sh:closed true.
_:n3-786 sh:path rdf:type;
    sh:minCount 1.
_:n3-787 rdf:first schema:Person;
    rdf:rest _:n3-788.
_:n3-788 rdf:first schema:Organization;
    rdf:rest _:n3-789.
_:n3-789 rdf:first foaf:Agent;
    rdf:rest rdf:nil.
_:n3-786 sh:in _:n3-787.
mshape:AgentShape sh:property _:n3-786.
_:n3-790 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AgentShape sh:property _:n3-790.
_:n3-791 sh:path ldp:inbox;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-791.
_:n3-792 sh:path pim:storage;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-792.
_:n3-793 sh:path sec:verificationMethod;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-793.
_:n3-794 sh:path sec:assertionMethod;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-794.
_:n3-795 sh:path mort:titleVesting;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AgentShape sh:property _:n3-795.
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
_:n3-796 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:TitleClearCredentialShape sh:ignoredProperties _:n3-796.
_:n3-797 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:TitleClearCredentialShape sh:property _:n3-797.
_:n3-798 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:TitleClearCredentialShape sh:property _:n3-798.
_:n3-799 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:TitleClearCredentialShape sh:property _:n3-799.
_:n3-800 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:TitleClearCredentialShape sh:property _:n3-800.
_:n3-801 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleClearCredentialShape sh:property _:n3-801.
_:n3-802 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:TitleClearSubjectShape.
mshape:TitleClearCredentialShape sh:property _:n3-802.
_:n3-803 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleClearCredentialShape sh:property _:n3-803.
_:n3-804 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:TitleClearCredentialShape sh:property _:n3-804.
mshape:TitleClearSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-805 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:TitleClearSubjectShape sh:ignoredProperties _:n3-805.
_:n3-806 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:TitleClearSubjectShape sh:property _:n3-806.
_:n3-807 sh:path mort:titleStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-808 rdf:first mort:TitleStatus-Clear;
    rdf:rest _:n3-809.
_:n3-809 rdf:first mort:TitleStatus-Clouded;
    rdf:rest rdf:nil.
_:n3-807 sh:in _:n3-808;
    sh:message "titleStatus must be a concept from mort:TitleStatusScheme".
mshape:TitleClearSubjectShape sh:property _:n3-807.
_:n3-810 sh:path mort:searchedThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:message "searchedThrough is the effective xsd:date through which public records were searched".
mshape:TitleClearSubjectShape sh:property _:n3-810.
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
_:n3-811 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:TitleCommitmentCredentialShape sh:ignoredProperties _:n3-811.
_:n3-812 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:TitleCommitmentCredentialShape sh:property _:n3-812.
_:n3-813 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-813.
_:n3-814 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:TitleCommitmentCredentialShape sh:property _:n3-814.
_:n3-815 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:TitleCommitmentCredentialShape sh:property _:n3-815.
_:n3-816 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-816.
_:n3-817 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:TitleCommitmentSubjectShape.
mshape:TitleCommitmentCredentialShape sh:property _:n3-817.
_:n3-818 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-818.
_:n3-819 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-819.
mshape:TitleCommitmentSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-820 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:TitleCommitmentSubjectShape sh:ignoredProperties _:n3-820.
_:n3-821 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-821.
_:n3-822 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:TitleCommitmentSubjectShape sh:property _:n3-822.
_:n3-823 sh:path mort:searchedThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:TitleCommitmentSubjectShape sh:property _:n3-823.
_:n3-824 sh:path mort:vestedOwner;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-824.
_:n3-825 sh:path mort:proposedInsured;
    sh:minCount 1;
    sh:maxCount 2;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-825.
_:n3-826 sh:path mort:ownerPolicyAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:TitleCommitmentSubjectShape sh:property _:n3-826.
_:n3-827 sh:path mort:loanPolicyAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:TitleCommitmentSubjectShape sh:property _:n3-827.
_:n3-828 sh:path mort:titleRequirement;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-828.
_:n3-829 sh:path mort:titleException;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-829.
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
_:n3-830 sh:path rdf:type;
    sh:hasValue fibo-loan-ln-app:UnderwritingDecision.
mshape:UnderwritingDecisionShape sh:property _:n3-830.
_:n3-831 sh:path fibo-fnd-rel-rel:evaluates;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:UnderwritingDecisionShape sh:property _:n3-831.
_:n3-832 sh:path mort:decisionStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-833 rdf:first mort:DecisionStatus-Approved;
    rdf:rest _:n3-834.
_:n3-834 rdf:first mort:DecisionStatus-ApprovedWithConditions;
    rdf:rest _:n3-835.
_:n3-835 rdf:first mort:DecisionStatus-Denied;
    rdf:rest _:n3-836.
_:n3-836 rdf:first mort:DecisionStatus-Suspended;
    rdf:rest rdf:nil.
_:n3-832 sh:in _:n3-833;
    sh:message "decisionStatus must be a concept from mort:DecisionStatusScheme".
mshape:UnderwritingDecisionShape sh:property _:n3-832.
_:n3-837 sh:path mort:underwritingCondition;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:UnderwritingDecisionShape sh:property _:n3-837.
_:n3-838 sh:path fibo-loan-ln-app:hasApprovedAmount;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:UnderwritingDecisionShape sh:property _:n3-838.
_:n3-839 sh:path dcterms:type;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-840 rdf:first fibo-loan-ln-app:UnderwritingDecision-Approve;
    rdf:rest _:n3-841.
_:n3-841 rdf:first fibo-loan-ln-app:UnderwritingDecision-Deny;
    rdf:rest _:n3-842.
_:n3-842 rdf:first fibo-loan-ln-app:UnderwritingDecision-Eligible;
    rdf:rest _:n3-843.
_:n3-843 rdf:first fibo-loan-ln-app:UnderwritingDecision-Ineligible;
    rdf:rest _:n3-844.
_:n3-844 rdf:first fibo-loan-ln-app:UnderwritingDecision-Refer;
    rdf:rest _:n3-845.
_:n3-845 rdf:first fibo-loan-ln-app:UnderwritingDecision-UnableToDetermine;
    rdf:rest rdf:nil.
_:n3-839 sh:in _:n3-840;
    sh:message "the AUS recommendation must be a FIBO UnderwritingDecision named individual".
mshape:UnderwritingDecisionShape sh:property _:n3-839.
_:n3-846 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:UnderwritingDecisionShape sh:property _:n3-846.
_:n3-847 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:UnderwritingDecisionShape sh:property _:n3-847.
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
_:n3-848 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:ZkOperandAnchorShape sh:ignoredProperties _:n3-848.
_:n3-849 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:ZkOperandAnchorShape sh:property _:n3-849.
_:n3-850 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ZkOperandAnchorShape sh:property _:n3-850.
_:n3-851 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:ZkOperandAnchorShape sh:property _:n3-851.
_:n3-852 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:ZkOperandAnchorShape sh:property _:n3-852.
_:n3-853 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:ZkOperandAnchorShape sh:property _:n3-853.
_:n3-854 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:ZkOperandAnchorSubjectShape;
    sh:message "credentialSubject must be the holder WebID the verifier matches against the DPoP-bound session".
mshape:ZkOperandAnchorShape sh:property _:n3-854.
_:n3-855 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:ZkOperandAnchorShape sh:property _:n3-855.
mshape:ZkOperandAnchorSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-856 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:ZkOperandAnchorSubjectShape sh:ignoredProperties _:n3-856.
_:n3-857 sh:path mort:field;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-858 rdf:first mort:monthlyGrossIncomeUsd;
    rdf:rest _:n3-859.
_:n3-859 rdf:first mort:totalMonthlyDebtUsd;
    rdf:rest _:n3-860.
_:n3-860 rdf:first mort:creditScoreValue;
    rdf:rest rdf:nil.
_:n3-857 sh:in _:n3-858;
    sh:message "field must be one of decision 0005's ZK scaled-unit field IRIs".
mshape:ZkOperandAnchorSubjectShape sh:property _:n3-857.
_:n3-861 sh:path mort:operandEnc;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^0x[0-9a-f]{1,64}$";
    sh:message "operandEnc must be a 0x-prefixed lowercase hex field element".
mshape:ZkOperandAnchorSubjectShape sh:property _:n3-861.
`,
} as const;

/** Document keys of the bundled SHACL shapes. */
export type ShapesDocumentKey = keyof typeof SHAPES_TURTLE;

/** Every bundled shapes document, in one Turtle-parseable list. */
export const ALL_SHAPES_DOCUMENTS: readonly string[] = Object.values(SHAPES_TURTLE);

/** File stem of the 46 bundled shapes documents. */
export const SHAPES_DOCUMENT_KEYS = Object.keys(SHAPES_TURTLE) as readonly ShapesDocumentKey[];
