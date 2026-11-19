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
  "adverse-action-notice": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.

mshape:AdverseActionNoticeShape a sh:NodeShape;
    sh:targetClass mort:AdverseActionNotice;
    sh:closed true.
_:n3-29 sh:path rdf:type;
    sh:hasValue mort:AdverseActionNotice.
mshape:AdverseActionNoticeShape sh:property _:n3-29.
_:n3-30 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AdverseActionNoticeShape sh:property _:n3-30.
_:n3-31 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AdverseActionNoticeShape sh:property _:n3-31.
_:n3-32 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AdverseActionNoticeShape sh:property _:n3-32.
_:n3-33 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AdverseActionNoticeShape sh:property _:n3-33.
_:n3-34 sh:path mort:adverseActionReason;
    sh:minCount 1;
    sh:maxCount 4;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AdverseActionNoticeShape sh:property _:n3-34.
_:n3-35 sh:path mort:scoreDisclosure;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ScoreDisclosureShape.
mshape:AdverseActionNoticeShape sh:property _:n3-35.
_:n3-36 sh:path schema:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AdverseActionNoticeShape sh:property _:n3-36.
`,
  "agent-profile": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:AgentProfileShape a sh:NodeShape;
    sh:targetClass foaf:PersonalProfileDocument;
    sh:closed true.
_:n3-37 sh:path rdf:type;
    sh:hasValue foaf:PersonalProfileDocument.
mshape:AgentProfileShape sh:property _:n3-37.
_:n3-38 sh:path foaf:primaryTopic;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:AgentShape.
mshape:AgentProfileShape sh:property _:n3-38.
`,
  "allergy-intolerance": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:AllergyIntoleranceShape a sh:NodeShape;
    sh:targetClass fhir:AllergyIntolerance;
    sh:closed true.
_:n3-39 sh:path rdf:type.
_:n3-40 rdf:first fhir:AllergyIntolerance;
    rdf:rest rdf:nil.
_:n3-39 sh:in _:n3-40.
mshape:AllergyIntoleranceShape sh:property _:n3-39.
_:n3-41 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-42 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-41 sh:in _:n3-42.
mshape:AllergyIntoleranceShape sh:property _:n3-41.
_:n3-43 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:AllergyIntoleranceShape sh:property _:n3-43.
_:n3-44 sh:path fhir:clinicalStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:AllergyIntoleranceShape sh:property _:n3-44.
_:n3-45 sh:path fhir:verificationStatus;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:AllergyIntoleranceShape sh:property _:n3-45.
_:n3-46 sh:path fhir:category;
    sh:maxCount 1.
mshape:AllergyIntoleranceShape sh:property _:n3-46.
_:n3-48 rdf:first fhir:category;
    rdf:rest _:n3-49.
_:n3-49 rdf:first _:n3-50.
_:n3-50 sh:zeroOrMorePath rdf:rest.
_:n3-49 rdf:rest _:n3-51.
_:n3-51 rdf:first rdf:first;
    rdf:rest _:n3-52.
_:n3-52 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-47 sh:path _:n3-48.
_:n3-53 rdf:first "food";
    rdf:rest _:n3-54.
_:n3-54 rdf:first "medication";
    rdf:rest _:n3-55.
_:n3-55 rdf:first "environment";
    rdf:rest _:n3-56.
_:n3-56 rdf:first "biologic";
    rdf:rest rdf:nil.
_:n3-47 sh:in _:n3-53.
mshape:AllergyIntoleranceShape sh:property _:n3-47.
_:n3-57 sh:path fhir:criticality;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:AllergyIntoleranceShape sh:property _:n3-57.
_:n3-59 rdf:first fhir:criticality;
    rdf:rest _:n3-60.
_:n3-60 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-58 sh:path _:n3-59.
_:n3-61 rdf:first "low";
    rdf:rest _:n3-62.
_:n3-62 rdf:first "high";
    rdf:rest _:n3-63.
_:n3-63 rdf:first "unable-to-assess";
    rdf:rest rdf:nil.
_:n3-58 sh:in _:n3-61.
mshape:AllergyIntoleranceShape sh:property _:n3-58.
_:n3-64 sh:path fhir:code;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirRxNormConceptShape.
mshape:AllergyIntoleranceShape sh:property _:n3-64.
_:n3-65 sh:path fhir:patient;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:AllergyIntoleranceShape sh:property _:n3-65.
_:n3-66 sh:path fhir:recordedDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:AllergyIntoleranceShape sh:property _:n3-66.
_:n3-67 sh:path fhir:note;
    sh:maxCount 1.
mshape:AllergyIntoleranceShape sh:property _:n3-67.
_:n3-69 rdf:first fhir:note;
    rdf:rest _:n3-70.
_:n3-70 rdf:first _:n3-71.
_:n3-71 sh:zeroOrMorePath rdf:rest.
_:n3-70 rdf:rest _:n3-72.
_:n3-72 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-68 sh:path _:n3-69;
    sh:node mshape:FhirAnnotationShape.
mshape:AllergyIntoleranceShape sh:property _:n3-68.
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
_:n3-73 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:AppraisalCredentialShape sh:ignoredProperties _:n3-73.
_:n3-74 sh:message "the appraisal evidence must evaluate the credentialSubject's mort:subjectProperty";
    sh:select "\\n      SELECT $this ?value WHERE {\\n        $this <https://www.w3.org/2018/credentials#evidence> ?report .\\n        ?report <https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/evaluates> ?value .\\n        $this <https://www.w3.org/2018/credentials#credentialSubject> ?subject .\\n        ?subject <https://solid-mortgage-vocab.vercel.app/mort#subjectProperty> ?property .\\n        FILTER (?value != ?property)\\n      }\\n    ".
mshape:AppraisalCredentialShape sh:sparql _:n3-74.
_:n3-75 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:AppraisalCredentialShape sh:property _:n3-75.
_:n3-76 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AppraisalCredentialShape sh:property _:n3-76.
_:n3-77 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:AppraisalCredentialShape sh:property _:n3-77.
_:n3-78 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AppraisalCredentialShape sh:property _:n3-78.
_:n3-79 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:AppraisalCredentialShape sh:property _:n3-79.
_:n3-80 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:AppraisalSubjectShape.
mshape:AppraisalCredentialShape sh:property _:n3-80.
_:n3-81 sh:path cred:evidence;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraisalEvidenceShape.
mshape:AppraisalCredentialShape sh:property _:n3-81.
_:n3-82 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:AppraisalCredentialShape sh:property _:n3-82.
mshape:AppraisalSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-83 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:AppraisalSubjectShape sh:ignoredProperties _:n3-83.
_:n3-84 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraisedPropertyShape.
mshape:AppraisalSubjectShape sh:property _:n3-84.
mshape:AppraisalEvidenceShape a sh:NodeShape;
    sh:closed true.
_:n3-85 sh:path rdf:type;
    sh:hasValue fibo-fnd-arr-asmt:Appraisal.
mshape:AppraisalEvidenceShape sh:property _:n3-85.
_:n3-86 sh:path fibo-fnd-rel-rel:evaluates;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:AppraisalEvidenceShape sh:property _:n3-86.
_:n3-87 sh:path fibo-fnd-rel-rel:isGeneratedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraiserShape.
mshape:AppraisalEvidenceShape sh:property _:n3-87.
_:n3-88 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:AppraisalEvidenceShape sh:property _:n3-88.
mshape:AppraiserShape a sh:NodeShape;
    sh:closed true.
_:n3-89 sh:path rdf:type;
    sh:hasValue fibo-fnd-arr-asmt:Appraiser.
mshape:AppraiserShape sh:property _:n3-89.
_:n3-90 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AppraiserShape sh:property _:n3-90.
_:n3-91 sh:path mort:appraiserLicenseId;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 4.
mshape:AppraiserShape sh:property _:n3-91.
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
_:n3-92 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:AssetCredentialShape sh:ignoredProperties _:n3-92.
_:n3-93 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:AssetCredentialShape sh:property _:n3-93.
_:n3-94 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AssetCredentialShape sh:property _:n3-94.
_:n3-95 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:AssetCredentialShape sh:property _:n3-95.
_:n3-96 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:AssetCredentialShape sh:property _:n3-96.
_:n3-97 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:AssetCredentialShape sh:property _:n3-97.
_:n3-98 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:AssetSubjectShape.
mshape:AssetCredentialShape sh:property _:n3-98.
_:n3-99 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:AssetCredentialShape sh:property _:n3-99.
mshape:AssetSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-100 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:AssetSubjectShape sh:ignoredProperties _:n3-100.
_:n3-101 sh:path schema:owns;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:DepositAccountShape.
mshape:AssetSubjectShape sh:property _:n3-101.
mshape:DepositAccountShape a sh:NodeShape;
    sh:closed true.
_:n3-102 sh:path rdf:type;
    sh:hasValue schema:DepositAccount.
mshape:DepositAccountShape sh:property _:n3-102.
_:n3-103 sh:path schema:provider;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:DepositAccountShape sh:property _:n3-103.
_:n3-104 sh:path schema:amount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:DepositAccountShape sh:property _:n3-104.
_:n3-105 sh:path mort:accountLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:message "accountLast4 must be exactly four digits".
mshape:DepositAccountShape sh:property _:n3-105.
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
_:n3-106 sh:path rdf:type;
    sh:hasValue schema:Person.
mshape:BorrowerProfileShape sh:property _:n3-106.
_:n3-107 sh:path rdf:type;
    sh:hasValue fibo-fbc-dae-dbt:Borrower.
mshape:BorrowerProfileShape sh:property _:n3-107.
_:n3-108 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:BorrowerProfileShape sh:property _:n3-108.
_:n3-109 sh:path schema:birthDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:BorrowerProfileShape sh:property _:n3-109.
_:n3-110 sh:path schema:email;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[^@\\\\s]+@[^@\\\\s]+\\\\.[^@\\\\s]+$".
mshape:BorrowerProfileShape sh:property _:n3-110.
_:n3-111 sh:path schema:telephone;
    sh:maxCount 1;
    sh:datatype xsd:string.
mshape:BorrowerProfileShape sh:property _:n3-111.
_:n3-112 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:BorrowerProfileShape sh:property _:n3-112.
_:n3-113 sh:path mort:maritalStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-114 rdf:first mort:MaritalStatus-Married;
    rdf:rest _:n3-115.
_:n3-115 rdf:first mort:MaritalStatus-Separated;
    rdf:rest _:n3-116.
_:n3-116 rdf:first mort:MaritalStatus-Unmarried;
    rdf:rest rdf:nil.
_:n3-113 sh:in _:n3-114;
    sh:message "maritalStatus must be a concept from mort:MaritalStatusScheme (URLA section 1a)".
mshape:BorrowerProfileShape sh:property _:n3-113.
`,
  "cash-flow-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:CashFlowCredentialShape a sh:NodeShape;
    sh:targetClass mort:CashFlowCredential;
    sh:closed true.
_:n3-117 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:CashFlowCredentialShape sh:ignoredProperties _:n3-117.
_:n3-118 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:CashFlowCredentialShape sh:property _:n3-118.
_:n3-119 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CashFlowCredentialShape sh:property _:n3-119.
_:n3-120 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:CashFlowCredentialShape sh:property _:n3-120.
_:n3-121 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CashFlowCredentialShape sh:property _:n3-121.
_:n3-122 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:CashFlowCredentialShape sh:property _:n3-122.
_:n3-123 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:CashFlowSubjectShape;
    sh:message "credentialSubject must be the borrower WebID (holder binding)".
mshape:CashFlowCredentialShape sh:property _:n3-123.
_:n3-124 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:CashFlowCredentialShape sh:property _:n3-124.
mshape:CashFlowSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-125 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:CashFlowSubjectShape sh:ignoredProperties _:n3-125.
_:n3-126 sh:path schema:owns;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:DepositAccountShape.
mshape:CashFlowSubjectShape sh:property _:n3-126.
_:n3-127 sh:path mort:depositStream;
    sh:minCount 1;
    sh:maxCount 8;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:DepositStreamShape.
mshape:CashFlowSubjectShape sh:property _:n3-127.
_:n3-128 sh:path mort:averageDailyBalance;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:CashFlowSubjectShape sh:property _:n3-128.
_:n3-129 sh:path mort:observationMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1;
    sh:maxInclusive 36.
mshape:CashFlowSubjectShape sh:property _:n3-129.
_:n3-130 sh:path mort:nsf90Count;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 99;
    sh:message "nsf90Count must fit its ZK budget (0..99 returned payments)".
mshape:CashFlowSubjectShape sh:property _:n3-130.
_:n3-131 sh:path mort:cashFlowScoreValue;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 300;
    sh:maxInclusive 850;
    sh:message "cashFlowScoreValue must fit its 3-digit ZK budget (300..850)".
mshape:CashFlowSubjectShape sh:property _:n3-131.
_:n3-132 sh:path mort:scoreModel;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-133 rdf:first mort:ScoreModel-CashFlowV1;
    rdf:rest rdf:nil.
_:n3-132 sh:in _:n3-133.
mshape:CashFlowSubjectShape sh:property _:n3-132.
mshape:DepositStreamShape a sh:NodeShape;
    sh:closed true.
_:n3-134 sh:path rdf:type;
    sh:hasValue mort:DepositStream.
mshape:DepositStreamShape sh:property _:n3-134.
_:n3-135 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DepositStreamShape sh:property _:n3-135.
_:n3-136 sh:path schema:amount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:DepositStreamShape sh:property _:n3-136.
`,
  "closed-end-disclosure": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.

mshape:ClosedEndCreditDisclosureShape a sh:NodeShape;
    sh:targetClass mort:ClosedEndCreditDisclosure;
    sh:closed true.
_:n3-137 sh:path rdf:type;
    sh:hasValue mort:ClosedEndCreditDisclosure.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-137.
_:n3-138 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-138.
_:n3-139 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-139.
_:n3-140 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-140.
_:n3-141 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-141.
_:n3-142 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-142.
_:n3-143 sh:path mort:amountFinanced;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-143.
_:n3-144 sh:path mort:financeCharge;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-144.
_:n3-145 sh:path mort:totalOfPayments;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-145.
_:n3-146 sh:path mort:annualPercentageRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 36.0;
    sh:message "the demo's small-dollar loans stay at or under a 36% APR".
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-146.
_:n3-147 sh:path schema:numberOfLoanPayments;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1;
    sh:maxInclusive 60.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-147.
_:n3-148 sh:path schema:loanPaymentAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-148.
_:n3-149 sh:path mort:paymentIntervalDays;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1;
    sh:maxInclusive 31.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-149.
_:n3-150 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosedEndCreditDisclosureShape sh:property _:n3-150.
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
_:n3-151 sh:path rdf:type;
    sh:hasValue mort:ClosingDisclosure.
mshape:ClosingDisclosureShape sh:property _:n3-151.
_:n3-152 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingDisclosureShape sh:property _:n3-152.
_:n3-153 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingDisclosureShape sh:property _:n3-153.
_:n3-154 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosingDisclosureShape sh:property _:n3-154.
_:n3-155 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosingDisclosureShape sh:property _:n3-155.
_:n3-156 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-156.
_:n3-157 sh:path mort:receivedDate;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-157.
_:n3-158 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-158.
_:n3-159 sh:path mort:disbursementDate;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingDisclosureShape sh:property _:n3-159.
_:n3-160 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-160.
_:n3-161 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 6.5)".
mshape:ClosingDisclosureShape sh:property _:n3-161.
_:n3-162 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:ClosingDisclosureShape sh:property _:n3-162.
_:n3-163 sh:path mort:annualPercentageRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 40.0.
mshape:ClosingDisclosureShape sh:property _:n3-163.
_:n3-164 sh:path mort:monthlyPrincipalAndInterest;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-164.
_:n3-165 sh:path mort:estimatedTotalMonthlyPayment;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-165.
_:n3-166 sh:path fibo-loan-ln-ln:hasTotalClosingCosts;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-166.
_:n3-167 sh:path mort:cashToClose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingDisclosureShape sh:property _:n3-167.
_:n3-168 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:ClosingDisclosureShape sh:property _:n3-168.
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
_:n3-169 sh:path rdf:type;
    sh:hasValue fibo-loan-reln-mtg:Mortgage.
mshape:ClosingRecordShape sh:property _:n3-169.
_:n3-170 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ClosingRecordShape sh:property _:n3-170.
_:n3-171 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:ClosingRecordShape sh:property _:n3-171.
_:n3-172 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingRecordShape sh:property _:n3-172.
_:n3-173 sh:path fibo-loan-ln-ln:hasTotalClosingCosts;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:ClosingRecordShape sh:property _:n3-173.
_:n3-174 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 6.125)".
mshape:ClosingRecordShape sh:property _:n3-174.
_:n3-175 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:ClosingRecordShape sh:property _:n3-175.
_:n3-176 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ClosingRecordShape sh:property _:n3-176.
_:n3-177 sh:path mort:recordingReference;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingRecordShape sh:property _:n3-177.
_:n3-178 sh:path mort:eNoteReference;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ClosingRecordShape sh:property _:n3-178.
_:n3-179 sh:path fibo-loan-ln-ln:isServicedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:ClosingRecordShape sh:property _:n3-179.
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
_:n3-180 sh:path rdf:type;
    sh:hasValue schema:PostalAddress.
mshape:PostalAddressShape sh:property _:n3-180.
_:n3-181 sh:path schema:streetAddress;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PostalAddressShape sh:property _:n3-181.
_:n3-182 sh:path schema:addressLocality;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PostalAddressShape sh:property _:n3-182.
_:n3-183 sh:path schema:addressRegion;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[A-Z]{2}$";
    sh:message "addressRegion must be a two-letter US state code".
mshape:PostalAddressShape sh:property _:n3-183.
_:n3-184 sh:path schema:postalCode;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{5}(-[0-9]{4})?$";
    sh:message "postalCode must be a US ZIP or ZIP+4".
mshape:PostalAddressShape sh:property _:n3-184.
mshape:OrganizationShape a sh:NodeShape;
    sh:closed true.
_:n3-185 sh:path rdf:type;
    sh:hasValue schema:Organization.
mshape:OrganizationShape sh:property _:n3-185.
_:n3-186 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OrganizationShape sh:property _:n3-186.
mshape:MonetaryAmountShape a sh:NodeShape;
    sh:closed true.
_:n3-187 sh:path rdf:type;
    sh:hasValue schema:MonetaryAmount.
mshape:MonetaryAmountShape sh:property _:n3-187.
_:n3-188 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:MonetaryAmountShape sh:property _:n3-188.
_:n3-189 sh:path schema:currency;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-190 rdf:first "USD";
    rdf:rest rdf:nil.
_:n3-189 sh:in _:n3-190.
mshape:MonetaryAmountShape sh:property _:n3-189.
mshape:AppraisedValueShape a sh:NodeShape;
    sh:closed true.
_:n3-191 sh:path rdf:type;
    sh:hasValue fibo-fnd-arr-asmt:AppraisedValue.
mshape:AppraisedValueShape sh:property _:n3-191.
_:n3-192 sh:path rdf:type;
    sh:hasValue schema:MonetaryAmount.
mshape:AppraisedValueShape sh:property _:n3-192.
_:n3-193 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:AppraisedValueShape sh:property _:n3-193.
_:n3-194 sh:path schema:currency;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-195 rdf:first "USD";
    rdf:rest rdf:nil.
_:n3-194 sh:in _:n3-195.
mshape:AppraisedValueShape sh:property _:n3-194.
mshape:PropertyShape a sh:NodeShape;
    sh:closed true.
_:n3-196 sh:path rdf:type;
    sh:hasValue fibo-fnd-plc-rp:RealEstate.
mshape:PropertyShape sh:property _:n3-196.
_:n3-197 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:PropertyShape sh:property _:n3-197.
_:n3-198 sh:path fibo-fnd-arr-asmt:hasEstimatedValue;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AppraisedValueShape.
mshape:PropertyShape sh:property _:n3-198.
mshape:AppraisedPropertyShape a sh:NodeShape;
    sh:node mshape:PropertyShape.
_:n3-199 sh:path fibo-fnd-arr-asmt:hasEstimatedValue;
    sh:minCount 1;
    sh:message "an appraised property must carry its appraised value".
mshape:AppraisedPropertyShape sh:property _:n3-199.
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
_:n3-200 sh:path rdf:type;
    sh:hasValue dpv:ConsentReceipt.
mshape:ConsentReceiptShape sh:property _:n3-200.
_:n3-201 sh:path dpv:hasDataSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-201.
_:n3-202 sh:path dpv:hasDataController;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-202.
_:n3-203 sh:path odrl:target;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-203.
_:n3-204 sh:path dpv:hasPolicy;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-204.
_:n3-205 sh:path dpv:hasPurpose;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-205.
_:n3-206 sh:path dpv:hasConsentStatus;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-207 rdf:first dpv:ConsentGiven;
    rdf:rest _:n3-208.
_:n3-208 rdf:first dpv:ConsentWithdrawn;
    rdf:rest _:n3-209.
_:n3-209 rdf:first dpv:ConsentExpired;
    rdf:rest rdf:nil.
_:n3-206 sh:in _:n3-207;
    sh:nodeKind sh:IRI.
mshape:ConsentReceiptShape sh:property _:n3-206.
_:n3-210 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:ConsentReceiptShape sh:property _:n3-210.
`,
  "contact-details": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:ContactDetailsShape a sh:NodeShape;
    sh:targetClass schema:ContactPoint;
    sh:closed true.
_:n3-211 sh:path rdf:type;
    sh:hasValue schema:ContactPoint.
mshape:ContactDetailsShape sh:property _:n3-211.
_:n3-212 sh:path schema:email;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ContactDetailsShape sh:property _:n3-212.
_:n3-213 sh:path schema:telephone;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ContactDetailsShape sh:property _:n3-213.
_:n3-214 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:ContactDetailsShape sh:property _:n3-214.
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
_:n3-215 sh:path rdf:type;
    sh:hasValue mort:CredentialPointer.
mshape:CredentialPointerShape sh:property _:n3-215.
_:n3-216 sh:path schema:url;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CredentialPointerShape sh:property _:n3-216.
_:n3-217 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CredentialPointerShape sh:property _:n3-217.
_:n3-218 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CredentialPointerShape sh:property _:n3-218.
_:n3-219 sh:path schema:sha256;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9a-f]{64}$";
    sh:minLength 1.
mshape:CredentialPointerShape sh:property _:n3-219.
_:n3-220 sh:path mort:asOf;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CredentialPointerShape sh:property _:n3-220.
_:n3-221 sh:path mort:signatureVerified;
    sh:maxCount 1;
    sh:datatype xsd:boolean.
mshape:CredentialPointerShape sh:property _:n3-221.
_:n3-222 sh:path mort:statusChecked;
    sh:maxCount 1;
    sh:datatype xsd:boolean.
mshape:CredentialPointerShape sh:property _:n3-222.
_:n3-223 sh:path mort:checkedAt;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CredentialPointerShape sh:property _:n3-223.
_:n3-224 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CredentialPointerShape sh:property _:n3-224.
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
_:n3-225 sh:path rdf:type;
    sh:hasValue mort:CreditReport.
mshape:CreditReportShape sh:property _:n3-225.
_:n3-226 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditReportShape sh:property _:n3-226.
_:n3-227 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditReportShape sh:property _:n3-227.
_:n3-228 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditReportShape sh:property _:n3-228.
_:n3-229 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditReportShape sh:property _:n3-229.
_:n3-230 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:CreditReportShape sh:property _:n3-230.
_:n3-231 sh:path mort:permissiblePurpose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditReportShape sh:property _:n3-231.
_:n3-232 sh:path mort:authorisedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditReportShape sh:property _:n3-232.
_:n3-233 sh:path mort:scoreDisclosure;
    sh:minCount 1;
    sh:maxCount 3;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ScoreDisclosureShape.
mshape:CreditReportShape sh:property _:n3-233.
_:n3-234 sh:path mort:totalMonthlyDebtUsd;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 9999.
mshape:CreditReportShape sh:property _:n3-234.
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
_:n3-235 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:CreditScoreCredentialShape sh:ignoredProperties _:n3-235.
_:n3-236 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:CreditScoreCredentialShape sh:property _:n3-236.
_:n3-237 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditScoreCredentialShape sh:property _:n3-237.
_:n3-238 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:CreditScoreCredentialShape sh:property _:n3-238.
_:n3-239 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CreditScoreCredentialShape sh:property _:n3-239.
_:n3-240 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:CreditScoreCredentialShape sh:property _:n3-240.
_:n3-241 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:CreditScoreSubjectShape.
mshape:CreditScoreCredentialShape sh:property _:n3-241.
_:n3-242 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:CreditScoreCredentialShape sh:property _:n3-242.
mshape:CreditScoreSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-243 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:CreditScoreSubjectShape sh:ignoredProperties _:n3-243.
_:n3-244 sh:path mort:creditScoreValue;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 300;
    sh:maxInclusive 850;
    sh:message "creditScoreValue must fit decision 0005's 3-digit budget (300..850)".
mshape:CreditScoreSubjectShape sh:property _:n3-244.
_:n3-245 sh:path mort:totalMonthlyDebtUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 9999;
    sh:message "totalMonthlyDebtUsd must fit decision 0005's 4-digit budget (0..9999 whole USD/month)".
mshape:CreditScoreSubjectShape sh:property _:n3-245.
_:n3-246 sh:path mort:scoreModel;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-247 rdf:first mort:ScoreModel-FICO8;
    rdf:rest rdf:nil.
_:n3-246 sh:in _:n3-247;
    sh:message "scoreModel must be a concept from mort:ScoreModelScheme".
mshape:CreditScoreSubjectShape sh:property _:n3-246.
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
_:n3-248 sh:path rdf:type;
    sh:hasValue dprod:DataProduct.
mshape:DataProductShape sh:property _:n3-248.
_:n3-249 sh:path dcterms:title;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DataProductShape sh:property _:n3-249.
_:n3-250 sh:path dcterms:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DataProductShape sh:property _:n3-250.
_:n3-251 sh:path dprod:dataProductOwner;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DataProductShape sh:property _:n3-251.
_:n3-252 sh:path dprod:purpose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DataProductShape sh:property _:n3-252.
_:n3-253 sh:path dpv:hasPurpose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DataProductShape sh:property _:n3-253.
_:n3-254 sh:path dprod:outputPort;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:DataServiceShape.
mshape:DataProductShape sh:property _:n3-254.
_:n3-255 sh:path odrl:hasPolicy;
    sh:nodeKind sh:IRI.
mshape:DataProductShape sh:property _:n3-255.
_:n3-256 sh:path dcterms:modified;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:DataProductShape sh:property _:n3-256.
mshape:DataServiceShape a sh:NodeShape;
    sh:closed true.
_:n3-257 sh:path rdf:type;
    sh:hasValue dcat:DataService.
mshape:DataServiceShape sh:property _:n3-257.
_:n3-258 sh:path dcat:endpointURL;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DataServiceShape sh:property _:n3-258.
`,
  "discharge-summary": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:DischargeSummaryShape a sh:NodeShape;
    sh:targetClass fhir:Composition;
    sh:closed true.
_:n3-259 sh:path rdf:type.
_:n3-260 rdf:first fhir:Composition;
    rdf:rest rdf:nil.
_:n3-259 sh:in _:n3-260.
mshape:DischargeSummaryShape sh:property _:n3-259.
_:n3-261 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-262 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-261 sh:in _:n3-262.
mshape:DischargeSummaryShape sh:property _:n3-261.
_:n3-263 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:DischargeSummaryShape sh:property _:n3-263.
_:n3-264 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:DischargeSummaryShape sh:property _:n3-264.
_:n3-266 rdf:first fhir:status;
    rdf:rest _:n3-267.
_:n3-267 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-265 sh:path _:n3-266.
_:n3-268 rdf:first "preliminary";
    rdf:rest _:n3-269.
_:n3-269 rdf:first "final";
    rdf:rest _:n3-270.
_:n3-270 rdf:first "amended";
    rdf:rest rdf:nil.
_:n3-265 sh:in _:n3-268.
mshape:DischargeSummaryShape sh:property _:n3-265.
_:n3-271 sh:path fhir:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:DischargeSummaryShape sh:property _:n3-271.
_:n3-273 rdf:first fhir:type;
    rdf:rest _:n3-274.
_:n3-274 rdf:first fhir:coding;
    rdf:rest _:n3-275.
_:n3-275 rdf:first _:n3-276.
_:n3-276 sh:zeroOrMorePath rdf:rest.
_:n3-275 rdf:rest _:n3-277.
_:n3-277 rdf:first rdf:first;
    rdf:rest _:n3-278.
_:n3-278 rdf:first fhir:code;
    rdf:rest _:n3-279.
_:n3-279 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-272 sh:path _:n3-273;
    sh:minCount 1.
_:n3-280 rdf:first "18842-5";
    rdf:rest rdf:nil.
_:n3-272 sh:in _:n3-280.
mshape:DischargeSummaryShape sh:property _:n3-272.
_:n3-281 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1.
mshape:DischargeSummaryShape sh:property _:n3-281.
_:n3-283 rdf:first fhir:subject;
    rdf:rest _:n3-284.
_:n3-284 rdf:first _:n3-285.
_:n3-285 sh:zeroOrMorePath rdf:rest.
_:n3-284 rdf:rest _:n3-286.
_:n3-286 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-282 sh:path _:n3-283;
    sh:minCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:DischargeSummaryShape sh:property _:n3-282.
_:n3-287 sh:path fhir:date;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:DischargeSummaryShape sh:property _:n3-287.
_:n3-288 sh:path fhir:author;
    sh:minCount 1;
    sh:maxCount 1.
mshape:DischargeSummaryShape sh:property _:n3-288.
_:n3-290 rdf:first fhir:author;
    rdf:rest _:n3-291.
_:n3-291 rdf:first _:n3-292.
_:n3-292 sh:zeroOrMorePath rdf:rest.
_:n3-291 rdf:rest _:n3-293.
_:n3-293 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-289 sh:path _:n3-290;
    sh:minCount 1;
    sh:node mshape:FhirReferenceShape.
mshape:DischargeSummaryShape sh:property _:n3-289.
_:n3-294 sh:path fhir:title;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:DischargeSummaryShape sh:property _:n3-294.
_:n3-295 sh:path fhir:note;
    sh:maxCount 1.
mshape:DischargeSummaryShape sh:property _:n3-295.
_:n3-297 rdf:first fhir:note;
    rdf:rest _:n3-298.
_:n3-298 rdf:first _:n3-299.
_:n3-299 sh:zeroOrMorePath rdf:rest.
_:n3-298 rdf:rest _:n3-300.
_:n3-300 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-296 sh:path _:n3-297;
    sh:node mshape:FhirAnnotationShape.
mshape:DischargeSummaryShape sh:property _:n3-296.
_:n3-301 sh:path fhir:section;
    sh:minCount 1;
    sh:maxCount 1.
mshape:DischargeSummaryShape sh:property _:n3-301.
_:n3-303 rdf:first fhir:section;
    rdf:rest _:n3-304.
_:n3-304 rdf:first _:n3-305.
_:n3-305 sh:zeroOrMorePath rdf:rest.
_:n3-304 rdf:rest _:n3-306.
_:n3-306 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-302 sh:path _:n3-303;
    sh:minCount 1;
    sh:node mshape:CompositionSectionShape.
mshape:DischargeSummaryShape sh:property _:n3-302.
mshape:CompositionSectionShape a sh:NodeShape;
    sh:closed true.
_:n3-307 sh:path fhir:title;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:CompositionSectionShape sh:property _:n3-307.
_:n3-308 sh:path fhir:entry;
    sh:maxCount 1.
mshape:CompositionSectionShape sh:property _:n3-308.
_:n3-310 rdf:first fhir:entry;
    rdf:rest _:n3-311.
_:n3-311 rdf:first _:n3-312.
_:n3-312 sh:zeroOrMorePath rdf:rest.
_:n3-311 rdf:rest _:n3-313.
_:n3-313 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-309 sh:path _:n3-310;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:CompositionSectionShape sh:property _:n3-309.
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
_:n3-314 sh:path rdf:type;
    sh:hasValue schema:DigitalDocument.
mshape:DocumentShape sh:property _:n3-314.
_:n3-315 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-315.
_:n3-316 sh:path schema:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-316.
_:n3-317 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DocumentShape sh:property _:n3-317.
_:n3-318 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:DocumentShape sh:property _:n3-318.
_:n3-319 sh:path schema:identifier;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-319.
_:n3-320 sh:path schema:about;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:DocumentShape sh:property _:n3-320.
_:n3-321 sh:path schema:sha256;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9a-f]{64}$";
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-321.
_:n3-322 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:DocumentShape sh:property _:n3-322.
_:n3-323 sh:path mort:subjectProperty;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:DocumentShape sh:property _:n3-323.
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
_:n3-324 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:EmploymentIncomeCredentialShape sh:ignoredProperties _:n3-324.
_:n3-325 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-325.
_:n3-326 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-326.
_:n3-327 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-327.
_:n3-328 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-328.
_:n3-329 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-329.
_:n3-330 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:EmploymentIncomeSubjectShape;
    sh:message "credentialSubject must be the borrower WebID (holder binding, decision 0012)".
mshape:EmploymentIncomeCredentialShape sh:property _:n3-330.
_:n3-331 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-331.
_:n3-332 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:EmploymentIncomeCredentialShape sh:property _:n3-332.
mshape:EmploymentIncomeSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-333 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:EmploymentIncomeSubjectShape sh:ignoredProperties _:n3-333.
_:n3-334 sh:path schema:worksFor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:EmploymentIncomeSubjectShape sh:property _:n3-334.
_:n3-335 sh:path schema:jobTitle;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EmploymentIncomeSubjectShape sh:property _:n3-335.
_:n3-336 sh:path schema:startDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:EmploymentIncomeSubjectShape sh:property _:n3-336.
_:n3-337 sh:path mort:monthlyGrossIncomeUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 9999;
    sh:message "monthlyGrossIncomeUsd must fit decision 0005's 4-digit budget (0..9999 whole USD/month)".
mshape:EmploymentIncomeSubjectShape sh:property _:n3-337.
`,
  "encounter-record": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:EncounterRecordShape a sh:NodeShape;
    sh:targetClass fhir:Encounter;
    sh:closed true.
_:n3-338 sh:path rdf:type.
_:n3-339 rdf:first fhir:Encounter;
    rdf:rest rdf:nil.
_:n3-338 sh:in _:n3-339.
mshape:EncounterRecordShape sh:property _:n3-338.
_:n3-340 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-341 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-340 sh:in _:n3-341.
mshape:EncounterRecordShape sh:property _:n3-340.
_:n3-342 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:EncounterRecordShape sh:property _:n3-342.
_:n3-343 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:EncounterRecordShape sh:property _:n3-343.
_:n3-345 rdf:first fhir:status;
    rdf:rest _:n3-346.
_:n3-346 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-344 sh:path _:n3-345.
_:n3-347 rdf:first "planned";
    rdf:rest _:n3-348.
_:n3-348 rdf:first "in-progress";
    rdf:rest _:n3-349.
_:n3-349 rdf:first "completed";
    rdf:rest _:n3-350.
_:n3-350 rdf:first "cancelled";
    rdf:rest rdf:nil.
_:n3-344 sh:in _:n3-347.
mshape:EncounterRecordShape sh:property _:n3-344.
_:n3-351 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:EncounterRecordShape sh:property _:n3-351.
_:n3-352 sh:path fhir:serviceProvider;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:EncounterRecordShape sh:property _:n3-352.
_:n3-353 sh:path fhir:actualPeriod;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirPeriodShape.
mshape:EncounterRecordShape sh:property _:n3-353.
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
_:n3-354 sh:path rdf:type;
    sh:hasValue mort:EscrowAccountStatement.
mshape:EscrowAccountStatementShape sh:property _:n3-354.
_:n3-355 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EscrowAccountStatementShape sh:property _:n3-355.
_:n3-356 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EscrowAccountStatementShape sh:property _:n3-356.
_:n3-357 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EscrowAccountStatementShape sh:property _:n3-357.
_:n3-358 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EscrowAccountStatementShape sh:property _:n3-358.
_:n3-359 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:EscrowAccountStatementShape sh:property _:n3-359.
_:n3-360 sh:path mort:monthlyEscrowPayment;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EscrowAccountStatementShape sh:property _:n3-360.
_:n3-361 sh:path mort:lineItem;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:LineItemShape.
mshape:EscrowAccountStatementShape sh:property _:n3-361.
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
_:n3-362 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:EvidenceOfInsuranceCredentialShape sh:ignoredProperties _:n3-362.
_:n3-363 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-363.
_:n3-364 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-364.
_:n3-365 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-365.
_:n3-366 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-366.
_:n3-367 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-367.
_:n3-368 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:EvidenceOfInsuranceSubjectShape.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-368.
_:n3-369 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-369.
_:n3-370 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:EvidenceOfInsuranceCredentialShape sh:property _:n3-370.
mshape:EvidenceOfInsuranceSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-371 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:EvidenceOfInsuranceSubjectShape sh:ignoredProperties _:n3-371.
_:n3-372 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-372.
_:n3-373 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-373.
_:n3-374 sh:path mort:dwellingCoverage;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-374.
_:n3-375 sh:path mort:annualPremium;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-375.
_:n3-376 sh:path mort:deductible;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-376.
_:n3-377 sh:path schema:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:lessThan schema:validThrough.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-377.
_:n3-378 sh:path schema:validThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-378.
_:n3-379 sh:path mort:mortgageeClause;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-379.
_:n3-380 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EvidenceOfInsuranceSubjectShape sh:property _:n3-380.
`,
  "fhir-support": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:FhirStringShape a sh:NodeShape;
    sh:closed true.
_:n3-381 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:FhirStringShape sh:property _:n3-381.
mshape:FhirIdShape a sh:NodeShape;
    sh:closed true.
_:n3-382 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[A-Za-z0-9.-]{1,64}$".
mshape:FhirIdShape sh:property _:n3-382.
mshape:FhirDateTimeShape a sh:NodeShape;
    sh:closed true.
_:n3-383 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:FhirDateTimeShape sh:property _:n3-383.
mshape:FhirUriShape a sh:NodeShape;
    sh:closed true.
_:n3-384 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:anyURI.
mshape:FhirUriShape sh:property _:n3-384.
mshape:FhirDecimalShape a sh:NodeShape;
    sh:closed true.
_:n3-385 sh:path fhir:v;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.
mshape:FhirDecimalShape sh:property _:n3-385.
mshape:FhirCodingShape a sh:NodeShape;
    sh:closed true.
_:n3-386 sh:path fhir:system;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirUriShape.
mshape:FhirCodingShape sh:property _:n3-386.
_:n3-387 sh:path fhir:code;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirCodingShape sh:property _:n3-387.
_:n3-388 sh:path fhir:display;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirCodingShape sh:property _:n3-388.
mshape:FhirCodeableConceptShape a sh:NodeShape;
    sh:closed true.
_:n3-389 sh:path fhir:coding;
    sh:maxCount 1.
mshape:FhirCodeableConceptShape sh:property _:n3-389.
_:n3-391 rdf:first fhir:coding;
    rdf:rest _:n3-392.
_:n3-392 rdf:first _:n3-393.
_:n3-393 sh:zeroOrMorePath rdf:rest.
_:n3-392 rdf:rest _:n3-394.
_:n3-394 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-390 sh:path _:n3-391;
    sh:node mshape:FhirCodingShape.
mshape:FhirCodeableConceptShape sh:property _:n3-390.
_:n3-395 sh:path fhir:text;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirCodeableConceptShape sh:property _:n3-395.
mshape:FhirRxNormConceptShape a sh:NodeShape;
    sh:closed true.
_:n3-396 sh:path fhir:coding;
    sh:minCount 1;
    sh:maxCount 1.
mshape:FhirRxNormConceptShape sh:property _:n3-396.
_:n3-398 rdf:first fhir:coding;
    rdf:rest _:n3-399.
_:n3-399 rdf:first _:n3-400.
_:n3-400 sh:zeroOrMorePath rdf:rest.
_:n3-399 rdf:rest _:n3-401.
_:n3-401 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-397 sh:path _:n3-398;
    sh:minCount 1;
    sh:node mshape:FhirCodingShape.
mshape:FhirRxNormConceptShape sh:property _:n3-397.
_:n3-403 rdf:first fhir:coding;
    rdf:rest _:n3-404.
_:n3-404 rdf:first _:n3-405.
_:n3-405 sh:zeroOrMorePath rdf:rest.
_:n3-404 rdf:rest _:n3-406.
_:n3-406 rdf:first rdf:first;
    rdf:rest _:n3-407.
_:n3-407 rdf:first fhir:system;
    rdf:rest _:n3-408.
_:n3-408 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-402 sh:path _:n3-403.
_:n3-409 rdf:first "http://www.nlm.nih.gov/research/umls/rxnorm"^^xsd:anyURI;
    rdf:rest rdf:nil.
_:n3-402 sh:in _:n3-409.
mshape:FhirRxNormConceptShape sh:property _:n3-402.
_:n3-410 sh:path fhir:text;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirRxNormConceptShape sh:property _:n3-410.
mshape:FhirReferenceShape a sh:NodeShape;
    sh:closed true.
_:n3-411 sh:path fhir:reference;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirReferenceShape sh:property _:n3-411.
_:n3-412 sh:path fhir:link;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:FhirReferenceShape sh:property _:n3-412.
_:n3-413 sh:path fhir:display;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirReferenceShape sh:property _:n3-413.
mshape:FhirLinkedReferenceShape a sh:NodeShape;
    sh:node mshape:FhirReferenceShape.
_:n3-414 sh:path fhir:link;
    sh:minCount 1.
mshape:FhirLinkedReferenceShape sh:property _:n3-414.
_:n3-415 sh:path fhir:reference;
    sh:minCount 1.
mshape:FhirLinkedReferenceShape sh:property _:n3-415.
mshape:FhirMedicineShape a sh:NodeShape;
    sh:closed true.
_:n3-416 sh:path fhir:concept;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirRxNormConceptShape.
mshape:FhirMedicineShape sh:property _:n3-416.
mshape:FhirDosageShape a sh:NodeShape;
    sh:closed true.
_:n3-417 sh:path fhir:text;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirDosageShape sh:property _:n3-417.
mshape:FhirAnnotationShape a sh:NodeShape;
    sh:closed true.
_:n3-418 sh:path fhir:text;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirAnnotationShape sh:property _:n3-418.
mshape:FhirQuantityShape a sh:NodeShape;
    sh:closed true.
_:n3-419 sh:path fhir:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDecimalShape.
mshape:FhirQuantityShape sh:property _:n3-419.
_:n3-420 sh:path fhir:unit;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:FhirQuantityShape sh:property _:n3-420.
mshape:FhirPeriodShape a sh:NodeShape;
    sh:closed true.
_:n3-421 sh:path fhir:start;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:FhirPeriodShape sh:property _:n3-421.
_:n3-422 sh:path fhir:end;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:FhirPeriodShape sh:property _:n3-422.
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
_:n3-423 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:IdentityCredentialShape sh:ignoredProperties _:n3-423.
_:n3-424 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:IdentityCredentialShape sh:property _:n3-424.
_:n3-425 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:IdentityCredentialShape sh:property _:n3-425.
_:n3-426 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:IdentityCredentialShape sh:property _:n3-426.
_:n3-427 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:IdentityCredentialShape sh:property _:n3-427.
_:n3-428 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:IdentityCredentialShape sh:property _:n3-428.
_:n3-429 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:IdentitySubjectShape.
mshape:IdentityCredentialShape sh:property _:n3-429.
_:n3-430 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:IdentityCredentialShape sh:property _:n3-430.
_:n3-431 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:IdentityCredentialShape sh:property _:n3-431.
mshape:IdentitySubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-432 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:IdentitySubjectShape sh:ignoredProperties _:n3-432.
_:n3-433 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:IdentitySubjectShape sh:property _:n3-433.
_:n3-434 sh:path schema:birthDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:IdentitySubjectShape sh:property _:n3-434.
_:n3-435 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:IdentitySubjectShape sh:property _:n3-435.
_:n3-436 sh:path mort:taxIdLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:minLength 1;
    sh:message "taxIdLast4 is exactly four digits; the full identifier never enters the pod".
mshape:IdentitySubjectShape sh:property _:n3-436.
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
_:n3-437 sh:path rdf:type;
    sh:hasValue as:Announce.
mshape:InboxMessageShape sh:property _:n3-437.
_:n3-438 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-439 rdf:first mort:MessageKind-CreditReportOrder;
    rdf:rest _:n3-440.
_:n3-440 rdf:first mort:MessageKind-CreditReportDelivery;
    rdf:rest _:n3-441.
_:n3-441 rdf:first mort:MessageKind-CasefileSubmission;
    rdf:rest _:n3-442.
_:n3-442 rdf:first mort:MessageKind-FindingsDelivery;
    rdf:rest _:n3-443.
_:n3-443 rdf:first mort:MessageKind-ServiceOrder;
    rdf:rest _:n3-444.
_:n3-444 rdf:first mort:MessageKind-AppraisalDelivery;
    rdf:rest _:n3-445.
_:n3-445 rdf:first mort:MessageKind-CommitmentDelivery;
    rdf:rest _:n3-446.
_:n3-446 rdf:first mort:MessageKind-RefreshRequest;
    rdf:rest _:n3-447.
_:n3-447 rdf:first mort:MessageKind-RefreshDelivery;
    rdf:rest _:n3-448.
_:n3-448 rdf:first mort:MessageKind-ClosingInstructions;
    rdf:rest _:n3-449.
_:n3-449 rdf:first mort:MessageKind-ClosingConfirmation;
    rdf:rest _:n3-450.
_:n3-450 rdf:first mort:MessageKind-RecordingSubmission;
    rdf:rest _:n3-451.
_:n3-451 rdf:first mort:MessageKind-RecordingConfirmation;
    rdf:rest _:n3-452.
_:n3-452 rdf:first mort:MessageKind-LoanDelivery;
    rdf:rest _:n3-453.
_:n3-453 rdf:first mort:MessageKind-PurchaseConfirmation;
    rdf:rest _:n3-454.
_:n3-454 rdf:first mort:MessageKind-ServicingBoarding;
    rdf:rest _:n3-455.
_:n3-455 rdf:first mort:MessageKind-RepaymentFurnishing;
    rdf:rest _:n3-456.
_:n3-456 rdf:first mort:MessageKind-PayoutConfirmation;
    rdf:rest _:n3-457.
_:n3-457 rdf:first mort:MessageKind-ScoreInquiry;
    rdf:rest _:n3-458.
_:n3-458 rdf:first mort:MessageKind-ScoreDelivery;
    rdf:rest rdf:nil.
_:n3-438 sh:in _:n3-439;
    sh:message "dcterms:type must be a concept from mort:MessageKindScheme".
mshape:InboxMessageShape sh:property _:n3-438.
_:n3-459 sh:path as:actor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:InboxMessageShape sh:property _:n3-459.
_:n3-460 sh:path as:object;
    sh:nodeKind sh:IRI.
mshape:InboxMessageShape sh:property _:n3-460.
_:n3-461 sh:path as:summary;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:InboxMessageShape sh:property _:n3-461.
_:n3-462 sh:path as:published;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:InboxMessageShape sh:property _:n3-462.
_:n3-463 sh:path mort:loanNumber;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:InboxMessageShape sh:property _:n3-463.
_:n3-464 sh:path as:inReplyTo;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:InboxMessageShape sh:property _:n3-464.
`,
  "kyb-beneficial-ownership-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>.
@prefix cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>.
@prefix fibo-be-le-lei: <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LEIEntities/>.
@prefix fibo-be-le-lp: <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/>.
@prefix fibo-be-oac-exec: <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/Executives/>.
@prefix fibo-be-oac-opty: <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/OwnershipParties/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:BeneficialOwnershipCredentialShape a sh:NodeShape;
    sh:targetClass mort:BeneficialOwnershipCredential;
    sh:closed true.
_:n3-465 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:BeneficialOwnershipCredentialShape sh:ignoredProperties _:n3-465.
_:n3-466 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:BeneficialOwnershipCredentialShape sh:property _:n3-466.
_:n3-467 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:BeneficialOwnershipCredentialShape sh:property _:n3-467.
_:n3-468 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:BeneficialOwnershipCredentialShape sh:property _:n3-468.
_:n3-469 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:BeneficialOwnershipCredentialShape sh:property _:n3-469.
_:n3-470 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:BeneficialOwnershipCredentialShape sh:property _:n3-470.
_:n3-471 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:BeneficialOwnershipSubjectShape.
mshape:BeneficialOwnershipCredentialShape sh:property _:n3-471.
_:n3-472 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:BeneficialOwnershipCredentialShape sh:property _:n3-472.
mshape:BeneficialOwnershipSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-473 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:BeneficialOwnershipSubjectShape sh:ignoredProperties _:n3-473.
_:n3-474 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:BeneficialOwnershipSubjectShape sh:property _:n3-474.
_:n3-475 sh:path fibo-be-oac-opty:hasDirectOwnership;
    sh:minCount 1;
    sh:maxCount 8;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:EntityOwnershipShape;
    sh:message "between one and eight direct owners (the completeness circuit has eight slots)".
mshape:BeneficialOwnershipSubjectShape sh:property _:n3-475.
`,
  "kyb-cdd-decision-record": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix dcterms: <http://purl.org/dc/terms/>.

mshape:CddDecisionRecordShape a sh:NodeShape;
    sh:targetClass mort:CddDecisionRecord;
    sh:closed true.
_:n3-476 sh:path rdf:type;
    sh:hasValue mort:CddDecisionRecord.
mshape:CddDecisionRecordShape sh:property _:n3-476.
_:n3-477 sh:path dcterms:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:message "the customer entity's WebID".
mshape:CddDecisionRecordShape sh:property _:n3-477.
_:n3-478 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CddDecisionRecordShape sh:property _:n3-478.
_:n3-479 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CddDecisionRecordShape sh:property _:n3-479.
_:n3-480 sh:path mort:cddDecisionStatus;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-481 rdf:first mort:CddDecisionStatus-Opened;
    rdf:rest _:n3-482.
_:n3-482 rdf:first mort:CddDecisionStatus-Declined;
    rdf:rest _:n3-483.
_:n3-483 rdf:first mort:CddDecisionStatus-PendingReview;
    rdf:rest rdf:nil.
_:n3-480 sh:in _:n3-481.
mshape:CddDecisionRecordShape sh:property _:n3-480.
_:n3-484 sh:path mort:cddCheckDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:CddDecisionRecordShape sh:property _:n3-484.
_:n3-485 sh:path mort:checkedCredential;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:CddDecisionRecordShape sh:property _:n3-485.
_:n3-486 sh:path mort:identifiedBeneficialOwner;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CddDecisionRecordShape sh:property _:n3-486.
_:n3-487 sh:path mort:controlPerson;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CddDecisionRecordShape sh:property _:n3-487.
`,
  "kyb-common": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>.
@prefix cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>.
@prefix fibo-be-le-lei: <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LEIEntities/>.
@prefix fibo-be-le-lp: <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/>.
@prefix fibo-be-oac-exec: <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/Executives/>.
@prefix fibo-be-oac-opty: <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/OwnershipParties/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:LegalEntityIdentifierShape a sh:NodeShape;
    sh:closed true.
_:n3-488 sh:path rdf:type;
    sh:hasValue fibo-be-le-lei:LegalEntityIdentifier.
mshape:LegalEntityIdentifierShape sh:property _:n3-488.
_:n3-489 sh:path cmns-txt:hasTextValue;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9A-Z]{18}[0-9]{2}$";
    sh:message "an LEI is 20 characters (ISO 17442): 18 alphanumerics and two check digits".
mshape:LegalEntityIdentifierShape sh:property _:n3-489.
_:n3-490 sh:path mort:isIllustrativeLei;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:boolean;
    sh:hasValue true;
    sh:message "every LEI in the demo is a flagged illustrative value, never a real GLEIF-issued one".
mshape:LegalEntityIdentifierShape sh:property _:n3-490.
mshape:EntityOwnershipShape a sh:NodeShape;
    sh:closed true.
_:n3-491 sh:path rdf:type;
    sh:hasValue fibo-be-oac-opty:EntityOwnership.
mshape:EntityOwnershipShape sh:property _:n3-491.
_:n3-492 sh:path fibo-be-oac-opty:hasOwningEntity;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:EntityOwnerShape.
mshape:EntityOwnershipShape sh:property _:n3-492.
_:n3-493 sh:path fibo-be-le-lei:hasOwnershipPercentage;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 100.0.
mshape:EntityOwnershipShape sh:property _:n3-493.
_:n3-494 sh:path mort:ownershipPercentageBps;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 10000.
mshape:EntityOwnershipShape sh:property _:n3-494.
mshape:EntityOwnerShape a sh:NodeShape;
    sh:closed true.
_:n3-495 sh:path rdf:type;
    sh:hasValue schema:Person.
mshape:EntityOwnerShape sh:property _:n3-495.
_:n3-496 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:EntityOwnerShape sh:property _:n3-496.
mshape:AuthorisedOfficerShape a sh:NodeShape;
    sh:closed true.
_:n3-497 sh:path rdf:type;
    sh:hasValue fibo-be-oac-exec:CorporateOfficer.
mshape:AuthorisedOfficerShape sh:property _:n3-497.
_:n3-498 sh:path rdf:type;
    sh:hasValue fibo-be-oac-exec:Signatory.
mshape:AuthorisedOfficerShape sh:property _:n3-498.
_:n3-499 sh:path rdf:type;
    sh:hasValue schema:Person.
mshape:AuthorisedOfficerShape sh:property _:n3-499.
_:n3-500 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AuthorisedOfficerShape sh:property _:n3-500.
_:n3-501 sh:path schema:jobTitle;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AuthorisedOfficerShape sh:property _:n3-501.
`,
  "kyb-officer-authorisation-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>.
@prefix cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>.
@prefix fibo-be-le-lei: <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LEIEntities/>.
@prefix fibo-be-le-lp: <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/>.
@prefix fibo-be-oac-exec: <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/Executives/>.
@prefix fibo-be-oac-opty: <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/OwnershipParties/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:OfficerAuthorisationCredentialShape a sh:NodeShape;
    sh:targetClass mort:OfficerAuthorisationCredential;
    sh:closed true.
_:n3-502 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:OfficerAuthorisationCredentialShape sh:ignoredProperties _:n3-502.
_:n3-503 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:OfficerAuthorisationCredentialShape sh:property _:n3-503.
_:n3-504 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OfficerAuthorisationCredentialShape sh:property _:n3-504.
_:n3-505 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:OfficerAuthorisationCredentialShape sh:property _:n3-505.
_:n3-506 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:OfficerAuthorisationCredentialShape sh:property _:n3-506.
_:n3-507 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:OfficerAuthorisationCredentialShape sh:property _:n3-507.
_:n3-508 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:OfficerAuthorisationSubjectShape.
mshape:OfficerAuthorisationCredentialShape sh:property _:n3-508.
_:n3-509 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:OfficerAuthorisationCredentialShape sh:property _:n3-509.
mshape:OfficerAuthorisationSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-510 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:OfficerAuthorisationSubjectShape sh:ignoredProperties _:n3-510.
_:n3-511 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OfficerAuthorisationSubjectShape sh:property _:n3-511.
_:n3-512 sh:path fibo-be-oac-exec:hasCorporateOfficer;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:AuthorisedOfficerShape.
mshape:OfficerAuthorisationSubjectShape sh:property _:n3-512.
`,
  "kyb-organisational-identity-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>.
@prefix cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>.
@prefix fibo-be-le-lei: <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LEIEntities/>.
@prefix fibo-be-le-lp: <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/>.
@prefix fibo-be-oac-exec: <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/Executives/>.
@prefix fibo-be-oac-opty: <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/OwnershipParties/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:OrganisationalIdentityCredentialShape a sh:NodeShape;
    sh:targetClass mort:OrganisationalIdentityCredential;
    sh:closed true.
_:n3-513 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:OrganisationalIdentityCredentialShape sh:ignoredProperties _:n3-513.
_:n3-514 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:OrganisationalIdentityCredentialShape sh:property _:n3-514.
_:n3-515 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OrganisationalIdentityCredentialShape sh:property _:n3-515.
_:n3-516 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:OrganisationalIdentityCredentialShape sh:property _:n3-516.
_:n3-517 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:OrganisationalIdentityCredentialShape sh:property _:n3-517.
_:n3-518 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:OrganisationalIdentityCredentialShape sh:property _:n3-518.
_:n3-519 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:OrganisationalIdentitySubjectShape.
mshape:OrganisationalIdentityCredentialShape sh:property _:n3-519.
_:n3-520 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:OrganisationalIdentityCredentialShape sh:property _:n3-520.
mshape:OrganisationalIdentitySubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-521 sh:path rdf:type;
    sh:hasValue fibo-be-le-lei:LEIRegisteredEntity.
mshape:OrganisationalIdentitySubjectShape sh:property _:n3-521.
_:n3-522 sh:path rdf:type;
    sh:hasValue fibo-be-le-lp:BusinessEntity.
mshape:OrganisationalIdentitySubjectShape sh:property _:n3-522.
_:n3-523 sh:path rdf:type;
    sh:hasValue schema:Organization.
mshape:OrganisationalIdentitySubjectShape sh:property _:n3-523.
_:n3-524 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OrganisationalIdentitySubjectShape sh:property _:n3-524.
_:n3-525 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:OrganisationalIdentitySubjectShape sh:property _:n3-525.
_:n3-526 sh:path cmns-id:isIdentifiedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:LegalEntityIdentifierShape.
mshape:OrganisationalIdentitySubjectShape sh:property _:n3-526.
_:n3-527 sh:path fibo-be-le-lei:hasLegalForm;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-528 rdf:first mort:EntityLegalForm-LLC;
    rdf:rest _:n3-529.
_:n3-529 rdf:first mort:EntityLegalForm-Corp;
    rdf:rest _:n3-530.
_:n3-530 rdf:first mort:EntityLegalForm-LLP;
    rdf:rest rdf:nil.
_:n3-527 sh:in _:n3-528.
mshape:OrganisationalIdentitySubjectShape sh:property _:n3-527.
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
_:n3-531 sh:path rdf:type;
    sh:hasValue fibo-loan-ln-app:LoanApplication.
mshape:LoanApplicationShape sh:property _:n3-531.
_:n3-532 sh:path dcterms:created;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanApplicationShape sh:property _:n3-532.
_:n3-533 sh:path fibo-fnd-arr-rep:isSubmittedBy;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanApplicationShape sh:property _:n3-533.
_:n3-534 sh:path fibo-loan-ln-app:hasRequestedAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanApplicationShape sh:property _:n3-534.
_:n3-535 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:LoanApplicationShape sh:property _:n3-535.
_:n3-536 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:LoanApplicationShape sh:property _:n3-536.
_:n3-537 sh:path dcterms:type;
    sh:minCount 3;
    sh:maxCount 4;
    sh:nodeKind sh:IRI.
_:n3-538 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-BusinessOrCommercial;
    rdf:rest _:n3-539.
_:n3-539 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-DwellingConstruction;
    rdf:rest _:n3-540.
_:n3-540 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-HomeImprovement;
    rdf:rest _:n3-541.
_:n3-541 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing;
    rdf:rest _:n3-542.
_:n3-542 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-MortgageModification;
    rdf:rest _:n3-543.
_:n3-543 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-RealPropertyPurchase;
    rdf:rest _:n3-544.
_:n3-544 rdf:first fibo-loan-reln-org:PropertyUsage-investment;
    rdf:rest _:n3-545.
_:n3-545 rdf:first fibo-loan-reln-org:PropertyUsage-primaryResidence;
    rdf:rest _:n3-546.
_:n3-546 rdf:first fibo-loan-reln-org:PropertyUsage-secondHome;
    rdf:rest _:n3-547.
_:n3-547 rdf:first fibo-loan-reln-org:AmortizationType-adjustableRate;
    rdf:rest _:n3-548.
_:n3-548 rdf:first fibo-loan-reln-org:AmortizationType-fixedRate;
    rdf:rest _:n3-549.
_:n3-549 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPayment;
    rdf:rest _:n3-550.
_:n3-550 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPaymentAdjustable;
    rdf:rest _:n3-551.
_:n3-551 rdf:first fibo-loan-reln-org:AmortizationType-growingEquity;
    rdf:rest _:n3-552.
_:n3-552 rdf:first fibo-loan-reln-org:AmortizationType-rateImprovement;
    rdf:rest _:n3-553.
_:n3-553 rdf:first fibo-loan-reln-org:AmortizationType-step;
    rdf:rest _:n3-554.
_:n3-554 rdf:first fibo-loan-reln-org:CashOutStatus-CashOut;
    rdf:rest _:n3-555.
_:n3-555 rdf:first fibo-loan-reln-org:CashOutStatus-LimitedCashOut;
    rdf:rest _:n3-556.
_:n3-556 rdf:first fibo-loan-reln-org:CashOutStatus-NoCashOut;
    rdf:rest rdf:nil.
_:n3-537 sh:in _:n3-538;
    sh:message "dcterms:type values must be URLA-aligned FIBO named individuals".
mshape:LoanApplicationShape sh:property _:n3-537.
_:n3-557 sh:path dcterms:type.
_:n3-559 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-BusinessOrCommercial;
    rdf:rest _:n3-560.
_:n3-560 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-DwellingConstruction;
    rdf:rest _:n3-561.
_:n3-561 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-HomeImprovement;
    rdf:rest _:n3-562.
_:n3-562 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing;
    rdf:rest _:n3-563.
_:n3-563 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-MortgageModification;
    rdf:rest _:n3-564.
_:n3-564 rdf:first fibo-loan-reln-org:MortgageLoanPurpose-RealPropertyPurchase;
    rdf:rest rdf:nil.
_:n3-558 sh:in _:n3-559.
_:n3-557 sh:qualifiedValueShape _:n3-558;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1;
    sh:message "exactly one FIBO MortgageLoanPurpose individual is required".
mshape:LoanApplicationShape sh:property _:n3-557.
_:n3-565 sh:path dcterms:type.
_:n3-567 rdf:first fibo-loan-reln-org:PropertyUsage-investment;
    rdf:rest _:n3-568.
_:n3-568 rdf:first fibo-loan-reln-org:PropertyUsage-primaryResidence;
    rdf:rest _:n3-569.
_:n3-569 rdf:first fibo-loan-reln-org:PropertyUsage-secondHome;
    rdf:rest rdf:nil.
_:n3-566 sh:in _:n3-567.
_:n3-565 sh:qualifiedValueShape _:n3-566;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1;
    sh:message "exactly one FIBO PropertyUsage individual is required".
mshape:LoanApplicationShape sh:property _:n3-565.
_:n3-570 sh:path dcterms:type.
_:n3-572 rdf:first fibo-loan-reln-org:AmortizationType-adjustableRate;
    rdf:rest _:n3-573.
_:n3-573 rdf:first fibo-loan-reln-org:AmortizationType-fixedRate;
    rdf:rest _:n3-574.
_:n3-574 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPayment;
    rdf:rest _:n3-575.
_:n3-575 rdf:first fibo-loan-reln-org:AmortizationType-graduatedPaymentAdjustable;
    rdf:rest _:n3-576.
_:n3-576 rdf:first fibo-loan-reln-org:AmortizationType-growingEquity;
    rdf:rest _:n3-577.
_:n3-577 rdf:first fibo-loan-reln-org:AmortizationType-rateImprovement;
    rdf:rest _:n3-578.
_:n3-578 rdf:first fibo-loan-reln-org:AmortizationType-step;
    rdf:rest rdf:nil.
_:n3-571 sh:in _:n3-572.
_:n3-570 sh:qualifiedValueShape _:n3-571;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1;
    sh:message "exactly one FIBO AmortizationType individual is required".
mshape:LoanApplicationShape sh:property _:n3-570.
_:n3-579 rdf:first _:n3-580.
_:n3-581 sh:path dcterms:type;
    sh:hasValue fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing.
_:n3-580 sh:property _:n3-581.
_:n3-582 sh:path dcterms:type.
_:n3-584 rdf:first fibo-loan-reln-org:CashOutStatus-CashOut;
    rdf:rest _:n3-585.
_:n3-585 rdf:first fibo-loan-reln-org:CashOutStatus-LimitedCashOut;
    rdf:rest _:n3-586.
_:n3-586 rdf:first fibo-loan-reln-org:CashOutStatus-NoCashOut;
    rdf:rest rdf:nil.
_:n3-583 sh:in _:n3-584.
_:n3-582 sh:qualifiedValueShape _:n3-583;
    sh:qualifiedMinCount 1;
    sh:qualifiedMaxCount 1.
_:n3-580 sh:property _:n3-582.
_:n3-579 rdf:rest _:n3-587.
_:n3-587 rdf:first _:n3-588.
_:n3-590 sh:path dcterms:type;
    sh:hasValue fibo-loan-reln-org:MortgageLoanPurpose-LoanRefinancing.
_:n3-589 sh:property _:n3-590.
_:n3-588 sh:not _:n3-589.
_:n3-591 sh:path dcterms:type.
_:n3-593 rdf:first fibo-loan-reln-org:CashOutStatus-CashOut;
    rdf:rest _:n3-594.
_:n3-594 rdf:first fibo-loan-reln-org:CashOutStatus-LimitedCashOut;
    rdf:rest _:n3-595.
_:n3-595 rdf:first fibo-loan-reln-org:CashOutStatus-NoCashOut;
    rdf:rest rdf:nil.
_:n3-592 sh:in _:n3-593.
_:n3-591 sh:qualifiedValueShape _:n3-592;
    sh:qualifiedMaxCount 0.
_:n3-588 sh:property _:n3-591.
_:n3-587 rdf:rest rdf:nil.
mshape:LoanApplicationShape sh:or _:n3-579.
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
_:n3-596 sh:path rdf:type;
    sh:hasValue mort:LoanEstimate.
mshape:LoanEstimateShape sh:property _:n3-596.
_:n3-597 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanEstimateShape sh:property _:n3-597.
_:n3-598 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanEstimateShape sh:property _:n3-598.
_:n3-599 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanEstimateShape sh:property _:n3-599.
_:n3-600 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanEstimateShape sh:property _:n3-600.
_:n3-601 sh:path mort:applicationDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:lessThan schema:expires.
mshape:LoanEstimateShape sh:property _:n3-601.
_:n3-602 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanEstimateShape sh:property _:n3-602.
_:n3-603 sh:path schema:expires;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanEstimateShape sh:property _:n3-603.
_:n3-604 sh:path mort:intentToProceedDate;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanEstimateShape sh:property _:n3-604.
_:n3-605 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-605.
_:n3-606 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 6.5)".
mshape:LoanEstimateShape sh:property _:n3-606.
_:n3-607 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 12;
    sh:maxInclusive 480.
mshape:LoanEstimateShape sh:property _:n3-607.
_:n3-608 sh:path mort:annualPercentageRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 40.0.
mshape:LoanEstimateShape sh:property _:n3-608.
_:n3-609 sh:path mort:monthlyPrincipalAndInterest;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-609.
_:n3-610 sh:path mort:estimatedTotalMonthlyPayment;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-610.
_:n3-611 sh:path fibo-loan-ln-ln:hasTotalClosingCosts;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-611.
_:n3-612 sh:path mort:cashToClose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:LoanEstimateShape sh:property _:n3-612.
_:n3-613 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:LoanEstimateShape sh:property _:n3-613.
`,
  "medication-dispense": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:MedicationDispenseShape a sh:NodeShape;
    sh:targetClass fhir:MedicationDispense;
    sh:closed true.
_:n3-614 sh:path rdf:type.
_:n3-615 rdf:first fhir:MedicationDispense;
    rdf:rest rdf:nil.
_:n3-614 sh:in _:n3-615.
mshape:MedicationDispenseShape sh:property _:n3-614.
_:n3-616 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-617 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-616 sh:in _:n3-617.
mshape:MedicationDispenseShape sh:property _:n3-616.
_:n3-618 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:MedicationDispenseShape sh:property _:n3-618.
_:n3-619 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:MedicationDispenseShape sh:property _:n3-619.
_:n3-621 rdf:first fhir:status;
    rdf:rest _:n3-622.
_:n3-622 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-620 sh:path _:n3-621.
_:n3-623 rdf:first "completed";
    rdf:rest _:n3-624.
_:n3-624 rdf:first "in-progress";
    rdf:rest _:n3-625.
_:n3-625 rdf:first "declined";
    rdf:rest rdf:nil.
_:n3-620 sh:in _:n3-623.
mshape:MedicationDispenseShape sh:property _:n3-620.
_:n3-626 sh:path fhir:medication;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirMedicineShape.
mshape:MedicationDispenseShape sh:property _:n3-626.
_:n3-627 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationDispenseShape sh:property _:n3-627.
_:n3-628 sh:path fhir:performer;
    sh:minCount 1;
    sh:maxCount 1.
mshape:MedicationDispenseShape sh:property _:n3-628.
_:n3-630 rdf:first fhir:performer;
    rdf:rest _:n3-631.
_:n3-631 rdf:first _:n3-632.
_:n3-632 sh:zeroOrMorePath rdf:rest.
_:n3-631 rdf:rest _:n3-633.
_:n3-633 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-629 sh:path _:n3-630;
    sh:minCount 1;
    sh:node mshape:DispensePerformerShape.
mshape:MedicationDispenseShape sh:property _:n3-629.
_:n3-634 sh:path fhir:authorizingPrescription;
    sh:maxCount 1.
mshape:MedicationDispenseShape sh:property _:n3-634.
_:n3-636 rdf:first fhir:authorizingPrescription;
    rdf:rest _:n3-637.
_:n3-637 rdf:first _:n3-638.
_:n3-638 sh:zeroOrMorePath rdf:rest.
_:n3-637 rdf:rest _:n3-639.
_:n3-639 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-635 sh:path _:n3-636;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationDispenseShape sh:property _:n3-635.
_:n3-640 sh:path fhir:quantity;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirQuantityShape.
mshape:MedicationDispenseShape sh:property _:n3-640.
_:n3-641 sh:path fhir:whenHandedOver;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:MedicationDispenseShape sh:property _:n3-641.
_:n3-642 sh:path fhir:dosageInstruction;
    sh:maxCount 1.
mshape:MedicationDispenseShape sh:property _:n3-642.
_:n3-644 rdf:first fhir:dosageInstruction;
    rdf:rest _:n3-645.
_:n3-645 rdf:first _:n3-646.
_:n3-646 sh:zeroOrMorePath rdf:rest.
_:n3-645 rdf:rest _:n3-647.
_:n3-647 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-643 sh:path _:n3-644;
    sh:node mshape:FhirDosageShape.
mshape:MedicationDispenseShape sh:property _:n3-643.
mshape:DispensePerformerShape a sh:NodeShape;
    sh:closed true.
_:n3-648 sh:path fhir:actor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:DispensePerformerShape sh:property _:n3-648.
`,
  "medication-request": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:MedicationRequestShape a sh:NodeShape;
    sh:targetClass fhir:MedicationRequest;
    sh:closed true.
_:n3-649 sh:path rdf:type.
_:n3-650 rdf:first fhir:MedicationRequest;
    rdf:rest rdf:nil.
_:n3-649 sh:in _:n3-650.
mshape:MedicationRequestShape sh:property _:n3-649.
_:n3-651 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-652 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-651 sh:in _:n3-652.
mshape:MedicationRequestShape sh:property _:n3-651.
_:n3-653 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:MedicationRequestShape sh:property _:n3-653.
_:n3-654 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:MedicationRequestShape sh:property _:n3-654.
_:n3-656 rdf:first fhir:status;
    rdf:rest _:n3-657.
_:n3-657 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-655 sh:path _:n3-656.
_:n3-658 rdf:first "active";
    rdf:rest _:n3-659.
_:n3-659 rdf:first "on-hold";
    rdf:rest _:n3-660.
_:n3-660 rdf:first "ended";
    rdf:rest _:n3-661.
_:n3-661 rdf:first "stopped";
    rdf:rest _:n3-662.
_:n3-662 rdf:first "completed";
    rdf:rest _:n3-663.
_:n3-663 rdf:first "cancelled";
    rdf:rest _:n3-664.
_:n3-664 rdf:first "entered-in-error";
    rdf:rest _:n3-665.
_:n3-665 rdf:first "draft";
    rdf:rest _:n3-666.
_:n3-666 rdf:first "unknown";
    rdf:rest rdf:nil.
_:n3-655 sh:in _:n3-658.
mshape:MedicationRequestShape sh:property _:n3-655.
_:n3-667 sh:path fhir:intent;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:MedicationRequestShape sh:property _:n3-667.
_:n3-669 rdf:first fhir:intent;
    rdf:rest _:n3-670.
_:n3-670 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-668 sh:path _:n3-669.
_:n3-671 rdf:first "order";
    rdf:rest _:n3-672.
_:n3-672 rdf:first "plan";
    rdf:rest _:n3-673.
_:n3-673 rdf:first "proposal";
    rdf:rest rdf:nil.
_:n3-668 sh:in _:n3-671.
mshape:MedicationRequestShape sh:property _:n3-668.
_:n3-674 sh:path fhir:medication;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirMedicineShape.
mshape:MedicationRequestShape sh:property _:n3-674.
_:n3-675 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationRequestShape sh:property _:n3-675.
_:n3-676 sh:path fhir:authoredOn;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:MedicationRequestShape sh:property _:n3-676.
_:n3-677 sh:path fhir:requester;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationRequestShape sh:property _:n3-677.
_:n3-678 sh:path fhir:dosageInstruction;
    sh:minCount 1;
    sh:maxCount 1.
mshape:MedicationRequestShape sh:property _:n3-678.
_:n3-680 rdf:first fhir:dosageInstruction;
    rdf:rest _:n3-681.
_:n3-681 rdf:first _:n3-682.
_:n3-682 sh:zeroOrMorePath rdf:rest.
_:n3-681 rdf:rest _:n3-683.
_:n3-683 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-679 sh:path _:n3-680;
    sh:minCount 1;
    sh:node mshape:FhirDosageShape.
mshape:MedicationRequestShape sh:property _:n3-679.
`,
  "medication-statement": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:MedicationStatementShape a sh:NodeShape;
    sh:targetClass fhir:MedicationStatement;
    sh:closed true.
_:n3-684 sh:path rdf:type.
_:n3-685 rdf:first fhir:MedicationStatement;
    rdf:rest rdf:nil.
_:n3-684 sh:in _:n3-685.
mshape:MedicationStatementShape sh:property _:n3-684.
_:n3-686 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-687 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-686 sh:in _:n3-687.
mshape:MedicationStatementShape sh:property _:n3-686.
_:n3-688 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:MedicationStatementShape sh:property _:n3-688.
_:n3-690 rdf:first fhir:status;
    rdf:rest _:n3-691.
_:n3-691 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-689 sh:path _:n3-690;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-692 rdf:first "recorded";
    rdf:rest _:n3-693.
_:n3-693 rdf:first "entered-in-error";
    rdf:rest _:n3-694.
_:n3-694 rdf:first "draft";
    rdf:rest rdf:nil.
_:n3-689 sh:in _:n3-692.
mshape:MedicationStatementShape sh:property _:n3-689.
_:n3-695 sh:path fhir:status;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:MedicationStatementShape sh:property _:n3-695.
_:n3-696 sh:path fhir:medication;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirMedicineShape.
mshape:MedicationStatementShape sh:property _:n3-696.
_:n3-697 sh:path fhir:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:MedicationStatementShape sh:property _:n3-697.
_:n3-698 sh:path fhir:dateAsserted;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:MedicationStatementShape sh:property _:n3-698.
_:n3-699 sh:path fhir:dosage;
    sh:minCount 1;
    sh:maxCount 1.
mshape:MedicationStatementShape sh:property _:n3-699.
_:n3-701 rdf:first fhir:dosage;
    rdf:rest _:n3-702.
_:n3-702 rdf:first _:n3-703.
_:n3-703 sh:zeroOrMorePath rdf:rest.
_:n3-702 rdf:rest _:n3-704.
_:n3-704 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-700 sh:path _:n3-701;
    sh:minCount 1;
    sh:node mshape:FhirDosageShape.
mshape:MedicationStatementShape sh:property _:n3-700.
_:n3-705 sh:path fhir:adherence;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:MedicationAdherenceShape.
mshape:MedicationStatementShape sh:property _:n3-705.
mshape:MedicationAdherenceShape a sh:NodeShape;
    sh:closed true.
_:n3-706 sh:path fhir:code;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:MedicationAdherenceShape sh:property _:n3-706.
_:n3-708 rdf:first fhir:code;
    rdf:rest _:n3-709.
_:n3-709 rdf:first fhir:coding;
    rdf:rest _:n3-710.
_:n3-710 rdf:first _:n3-711.
_:n3-711 sh:zeroOrMorePath rdf:rest.
_:n3-710 rdf:rest _:n3-712.
_:n3-712 rdf:first rdf:first;
    rdf:rest _:n3-713.
_:n3-713 rdf:first fhir:code;
    rdf:rest _:n3-714.
_:n3-714 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-707 sh:path _:n3-708;
    sh:minCount 1.
_:n3-715 rdf:first "taking-as-directed";
    rdf:rest _:n3-716.
_:n3-716 rdf:first "stopped-as-directed";
    rdf:rest rdf:nil.
_:n3-707 sh:in _:n3-715.
mshape:MedicationAdherenceShape sh:property _:n3-707.
_:n3-717 sh:path fhir:reason;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:MedicationAdherenceShape sh:property _:n3-717.
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
_:n3-718 sh:path rdf:type;
    sh:hasValue odrl:Agreement.
mshape:OdrlPolicyShape sh:property _:n3-718.
_:n3-719 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OdrlPolicyShape sh:property _:n3-719.
_:n3-720 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OdrlPolicyShape sh:property _:n3-720.
_:n3-721 sh:path dcterms:description;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:OdrlPolicyShape sh:property _:n3-721.
_:n3-722 sh:path odrl:assigner;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OdrlPolicyShape sh:property _:n3-722.
_:n3-723 sh:path odrl:assignee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OdrlPolicyShape sh:property _:n3-723.
_:n3-724 sh:path odrl:permission;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PermissionShape.
mshape:OdrlPolicyShape sh:property _:n3-724.
_:n3-725 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:OdrlPolicyShape sh:property _:n3-725.
_:n3-726 sh:path dcterms:source;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:OdrlPolicyShape sh:property _:n3-726.
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
_:n3-727 sh:path rdf:type;
    sh:hasValue mort:PaymentMandate.
mshape:PaymentMandateShape sh:property _:n3-727.
_:n3-728 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PaymentMandateShape sh:property _:n3-728.
_:n3-729 sh:path mort:payee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PaymentMandateShape sh:property _:n3-729.
_:n3-730 sh:path mort:accountLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:minLength 1.
mshape:PaymentMandateShape sh:property _:n3-730.
_:n3-731 sh:path schema:provider;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:PaymentMandateShape sh:property _:n3-731.
_:n3-732 sh:path schema:amount;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PaymentMandateShape sh:property _:n3-732.
_:n3-733 sh:path mort:debitDayOfMonth;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1;
    sh:maxInclusive 28.
mshape:PaymentMandateShape sh:property _:n3-733.
_:n3-734 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:PaymentMandateShape sh:property _:n3-734.
_:n3-735 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PaymentMandateShape sh:property _:n3-735.
`,
  "payout-instruction": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:PayoutInstructionShape a sh:NodeShape;
    sh:targetClass mort:PayoutInstruction;
    sh:closed true.
_:n3-736 sh:path rdf:type;
    sh:hasValue mort:PayoutInstruction.
mshape:PayoutInstructionShape sh:property _:n3-736.
_:n3-737 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PayoutInstructionShape sh:property _:n3-737.
_:n3-738 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PayoutInstructionShape sh:property _:n3-738.
_:n3-739 sh:path mort:paymentRail;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-740 rdf:first mort:PaymentRail-PushToCard;
    rdf:rest rdf:nil.
_:n3-739 sh:in _:n3-740.
mshape:PayoutInstructionShape sh:property _:n3-739.
_:n3-741 sh:path schema:provider;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:PayoutInstructionShape sh:property _:n3-741.
_:n3-742 sh:path mort:accountLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$";
    sh:message "accountLast4 must be exactly four digits; the full card number never enters the pod".
mshape:PayoutInstructionShape sh:property _:n3-742.
_:n3-743 sh:path schema:amount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PayoutInstructionShape sh:property _:n3-743.
_:n3-744 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PayoutInstructionShape sh:property _:n3-744.
_:n3-745 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:PayoutInstructionShape sh:property _:n3-745.
`,
  "provenance-record": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix fhir: <http://hl7.org/fhir/>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:ProvenanceRecordShape a sh:NodeShape;
    sh:targetClass fhir:Provenance;
    sh:closed true.
_:n3-746 sh:path rdf:type.
_:n3-747 rdf:first fhir:Provenance;
    rdf:rest rdf:nil.
_:n3-746 sh:in _:n3-747.
mshape:ProvenanceRecordShape sh:property _:n3-746.
_:n3-748 sh:path fhir:nodeRole;
    sh:maxCount 1.
_:n3-749 rdf:first fhir:treeRoot;
    rdf:rest rdf:nil.
_:n3-748 sh:in _:n3-749.
mshape:ProvenanceRecordShape sh:property _:n3-748.
_:n3-750 sh:path fhir:id;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirIdShape.
mshape:ProvenanceRecordShape sh:property _:n3-750.
_:n3-751 sh:path fhir:target;
    sh:minCount 1;
    sh:maxCount 1.
mshape:ProvenanceRecordShape sh:property _:n3-751.
_:n3-753 rdf:first fhir:target;
    rdf:rest _:n3-754.
_:n3-754 rdf:first _:n3-755.
_:n3-755 sh:zeroOrMorePath rdf:rest.
_:n3-754 rdf:rest _:n3-756.
_:n3-756 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-752 sh:path _:n3-753;
    sh:minCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:ProvenanceRecordShape sh:property _:n3-752.
_:n3-757 sh:path fhir:recorded;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirDateTimeShape.
mshape:ProvenanceRecordShape sh:property _:n3-757.
_:n3-758 sh:path fhir:why;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirStringShape.
mshape:ProvenanceRecordShape sh:property _:n3-758.
_:n3-759 sh:path fhir:activity;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:ProvenanceRecordShape sh:property _:n3-759.
_:n3-761 rdf:first fhir:activity;
    rdf:rest _:n3-762.
_:n3-762 rdf:first fhir:coding;
    rdf:rest _:n3-763.
_:n3-763 rdf:first _:n3-764.
_:n3-764 sh:zeroOrMorePath rdf:rest.
_:n3-763 rdf:rest _:n3-765.
_:n3-765 rdf:first rdf:first;
    rdf:rest _:n3-766.
_:n3-766 rdf:first fhir:code;
    rdf:rest _:n3-767.
_:n3-767 rdf:first fhir:v;
    rdf:rest rdf:nil.
_:n3-760 sh:path _:n3-761;
    sh:minCount 1.
_:n3-768 rdf:first "CREATE";
    rdf:rest _:n3-769.
_:n3-769 rdf:first "UPDATE";
    rdf:rest rdf:nil.
_:n3-760 sh:in _:n3-768.
mshape:ProvenanceRecordShape sh:property _:n3-760.
_:n3-770 sh:path fhir:patient;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:ProvenanceRecordShape sh:property _:n3-770.
_:n3-771 sh:path fhir:agent;
    sh:minCount 1;
    sh:maxCount 1.
mshape:ProvenanceRecordShape sh:property _:n3-771.
_:n3-773 rdf:first fhir:agent;
    rdf:rest _:n3-774.
_:n3-774 rdf:first _:n3-775.
_:n3-775 sh:zeroOrMorePath rdf:rest.
_:n3-774 rdf:rest _:n3-776.
_:n3-776 rdf:first rdf:first;
    rdf:rest rdf:nil.
_:n3-772 sh:path _:n3-773;
    sh:minCount 1;
    sh:node mshape:ProvenanceAgentShape.
mshape:ProvenanceRecordShape sh:property _:n3-772.
mshape:ProvenanceAgentShape a sh:NodeShape;
    sh:closed true.
_:n3-777 sh:path fhir:type;
    sh:maxCount 1;
    sh:node mshape:FhirCodeableConceptShape.
mshape:ProvenanceAgentShape sh:property _:n3-777.
_:n3-778 sh:path fhir:who;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirReferenceShape.
mshape:ProvenanceAgentShape sh:property _:n3-778.
_:n3-779 sh:path fhir:onBehalfOf;
    sh:minCount 1;
    sh:maxCount 1;
    sh:node mshape:FhirLinkedReferenceShape.
mshape:ProvenanceAgentShape sh:property _:n3-779.
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
_:n3-780 sh:path rdf:type;
    sh:hasValue mort:PurchaseAgreement.
mshape:PurchaseAgreementShape sh:property _:n3-780.
_:n3-781 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PurchaseAgreementShape sh:property _:n3-781.
_:n3-782 sh:path schema:buyer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PurchaseAgreementShape sh:property _:n3-782.
_:n3-783 sh:path schema:seller;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:NamedPartyShape.
mshape:PurchaseAgreementShape sh:property _:n3-783.
_:n3-784 sh:path mort:purchasePrice;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PurchaseAgreementShape sh:property _:n3-784.
_:n3-785 sh:path mort:earnestMoneyDeposit;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:PurchaseAgreementShape sh:property _:n3-785.
_:n3-786 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:PurchaseAgreementShape sh:property _:n3-786.
_:n3-787 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:PurchaseAgreementShape sh:property _:n3-787.
_:n3-788 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:PurchaseAgreementShape sh:property _:n3-788.
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
_:n3-789 sh:path rdf:type;
    sh:hasValue mort:RecordedInstrument.
mshape:RecordedInstrumentShape sh:property _:n3-789.
_:n3-790 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-790.
_:n3-791 sh:path mort:recordingReference;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-791.
_:n3-792 sh:path mort:recordedAt;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:RecordedInstrumentShape sh:property _:n3-792.
_:n3-793 sh:path mort:grantor;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-793.
_:n3-794 sh:path mort:grantee;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-794.
_:n3-795 sh:path mort:parcelNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordedInstrumentShape sh:property _:n3-795.
_:n3-796 sh:path dcterms:creator;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:RecordedInstrumentShape sh:property _:n3-796.
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
_:n3-797 sh:path rdf:type;
    sh:hasValue mort:RecordingReceipt.
mshape:RecordingReceiptShape sh:property _:n3-797.
_:n3-798 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordingReceiptShape sh:property _:n3-798.
_:n3-799 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:RecordingReceiptShape sh:property _:n3-799.
_:n3-800 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:RecordingReceiptShape sh:property _:n3-800.
_:n3-801 sh:path mort:recordedInstrument;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:RecordingReceiptShape sh:property _:n3-801.
_:n3-802 sh:path mort:recordingReference;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:RecordingReceiptShape sh:property _:n3-802.
_:n3-803 sh:path mort:subjectProperty;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:RecordingReceiptShape sh:property _:n3-803.
`,
  "repayment-history-credential": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/>.

mshape:RepaymentHistoryCredentialShape a sh:NodeShape;
    sh:targetClass mort:RepaymentHistoryCredential;
    sh:closed true.
_:n3-804 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:RepaymentHistoryCredentialShape sh:ignoredProperties _:n3-804.
_:n3-805 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:RepaymentHistoryCredentialShape sh:property _:n3-805.
_:n3-806 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:RepaymentHistoryCredentialShape sh:property _:n3-806.
_:n3-807 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:RepaymentHistoryCredentialShape sh:property _:n3-807.
_:n3-808 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:RepaymentHistoryCredentialShape sh:property _:n3-808.
_:n3-809 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:RepaymentHistoryCredentialShape sh:property _:n3-809.
_:n3-810 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:RepaymentHistorySubjectShape.
mshape:RepaymentHistoryCredentialShape sh:property _:n3-810.
_:n3-811 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:RepaymentHistoryCredentialShape sh:property _:n3-811.
mshape:RepaymentHistorySubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-812 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:RepaymentHistorySubjectShape sh:ignoredProperties _:n3-812.
_:n3-813 sh:path fibo-loan-ln-ln:hasPaymentHistory;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PaymentHistoryShape.
mshape:RepaymentHistorySubjectShape sh:property _:n3-813.
mshape:PaymentHistoryShape a sh:NodeShape;
    sh:closed true.
_:n3-814 sh:path rdf:type;
    sh:hasValue fibo-loan-ln-ln:PaymentHistory.
mshape:PaymentHistoryShape sh:property _:n3-814.
_:n3-815 sh:path mort:servicedLoan;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PaymentHistoryShape sh:property _:n3-815.
_:n3-816 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:PaymentHistoryShape sh:property _:n3-816.
_:n3-817 sh:path mort:onTimePaymentCount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 999.
mshape:PaymentHistoryShape sh:property _:n3-817.
_:n3-818 sh:path mort:latePaymentCount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 999.
mshape:PaymentHistoryShape sh:property _:n3-818.
_:n3-819 sh:path mort:scheduledPaymentCount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1;
    sh:maxInclusive 999.
mshape:PaymentHistoryShape sh:property _:n3-819.
_:n3-820 sh:path schema:startDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:lessThan schema:endDate;
    sh:message "the reporting period must end after it starts".
mshape:PaymentHistoryShape sh:property _:n3-820.
_:n3-821 sh:path schema:endDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:PaymentHistoryShape sh:property _:n3-821.
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
_:n3-822 sh:path rdf:type;
    sh:hasValue mort:CreditScoreNotice.
mshape:CreditScoreNoticeShape sh:property _:n3-822.
_:n3-823 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditScoreNoticeShape sh:property _:n3-823.
_:n3-824 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditScoreNoticeShape sh:property _:n3-824.
_:n3-825 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditScoreNoticeShape sh:property _:n3-825.
_:n3-826 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CreditScoreNoticeShape sh:property _:n3-826.
_:n3-827 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:CreditScoreNoticeShape sh:property _:n3-827.
_:n3-828 sh:path mort:scoreDisclosure;
    sh:minCount 1;
    sh:maxCount 3;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ScoreDisclosureShape.
mshape:CreditScoreNoticeShape sh:property _:n3-828.
_:n3-829 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CreditScoreNoticeShape sh:property _:n3-829.
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
_:n3-830 sh:path rdf:type;
    sh:hasValue schema:Order.
mshape:ServiceOrderShape sh:property _:n3-830.
_:n3-831 sh:path schema:orderNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ServiceOrderShape sh:property _:n3-831.
_:n3-832 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-833 rdf:first mort:ServiceKind-CreditReport;
    rdf:rest _:n3-834.
_:n3-834 rdf:first mort:ServiceKind-Appraisal;
    rdf:rest _:n3-835.
_:n3-835 rdf:first mort:ServiceKind-Title;
    rdf:rest _:n3-836.
_:n3-836 rdf:first mort:ServiceKind-FloodDetermination;
    rdf:rest _:n3-837.
_:n3-837 rdf:first mort:ServiceKind-TaxTranscripts;
    rdf:rest rdf:nil.
_:n3-832 sh:in _:n3-833.
mshape:ServiceOrderShape sh:property _:n3-832.
_:n3-838 sh:path schema:customer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ServiceOrderShape sh:property _:n3-838.
_:n3-839 sh:path schema:seller;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ServiceOrderShape sh:property _:n3-839.
_:n3-840 sh:path schema:orderDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ServiceOrderShape sh:property _:n3-840.
_:n3-841 sh:path schema:orderStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-842 rdf:first schema:OrderProcessing;
    rdf:rest _:n3-843.
_:n3-843 rdf:first schema:OrderDelivered;
    rdf:rest rdf:nil.
_:n3-841 sh:in _:n3-842.
mshape:ServiceOrderShape sh:property _:n3-841.
_:n3-844 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ServiceOrderShape sh:property _:n3-844.
_:n3-845 sh:path mort:authorisedBy;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ServiceOrderShape sh:property _:n3-845.
_:n3-846 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ServiceOrderShape sh:property _:n3-846.
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
_:n3-847 sh:path rdf:type;
    sh:hasValue mort:LoanTransferNotice.
mshape:LoanTransferNoticeShape sh:property _:n3-847.
_:n3-848 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-848.
_:n3-849 sh:path dcterms:type;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-850 rdf:first mort:NoticeKind-ServicingTransferFromTransferor;
    rdf:rest _:n3-851.
_:n3-851 rdf:first mort:NoticeKind-ServicingTransferFromTransferee;
    rdf:rest _:n3-852.
_:n3-852 rdf:first mort:NoticeKind-OwnershipTransfer;
    rdf:rest rdf:nil.
_:n3-849 sh:in _:n3-850;
    sh:message "dcterms:type must be a concept from mort:NoticeKindScheme".
mshape:LoanTransferNoticeShape sh:property _:n3-849.
_:n3-853 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-853.
_:n3-854 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanTransferNoticeShape sh:property _:n3-854.
_:n3-855 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:LoanTransferNoticeShape sh:property _:n3-855.
_:n3-856 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanTransferNoticeShape sh:property _:n3-856.
_:n3-857 sh:path mort:transferEffectiveDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanTransferNoticeShape sh:property _:n3-857.
_:n3-858 sh:path mort:transferor;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:LoanTransferNoticeShape sh:property _:n3-858.
_:n3-859 sh:path mort:transferee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:OrganizationShape.
mshape:LoanTransferNoticeShape sh:property _:n3-859.
_:n3-860 sh:path mort:paymentProtectionEnds;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:LoanTransferNoticeShape sh:property _:n3-860.
_:n3-861 sh:path schema:telephone;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-861.
_:n3-862 sh:path schema:description;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LoanTransferNoticeShape sh:property _:n3-862.
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
_:n3-863 sh:path rdf:type;
    sh:hasValue mort:SettlementStatement.
mshape:SettlementStatementShape sh:property _:n3-863.
_:n3-864 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SettlementStatementShape sh:property _:n3-864.
_:n3-865 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SettlementStatementShape sh:property _:n3-865.
_:n3-866 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SettlementStatementShape sh:property _:n3-866.
_:n3-867 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:SettlementStatementShape sh:property _:n3-867.
_:n3-868 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:SettlementStatementShape sh:property _:n3-868.
_:n3-869 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:SettlementStatementShape sh:property _:n3-869.
_:n3-870 sh:path mort:closingDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:SettlementStatementShape sh:property _:n3-870.
_:n3-871 sh:path mort:disbursementDate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:SettlementStatementShape sh:property _:n3-871.
_:n3-872 sh:path mort:purchasePrice;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:SettlementStatementShape sh:property _:n3-872.
_:n3-873 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:SettlementStatementShape sh:property _:n3-873.
_:n3-874 sh:path mort:lineItem;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:LineItemShape.
mshape:SettlementStatementShape sh:property _:n3-874.
_:n3-875 sh:path mort:cashToClose;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:SettlementStatementShape sh:property _:n3-875.
_:n3-876 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:SettlementStatementShape sh:property _:n3-876.
`,
  "small-business-loan": `@prefix sh: <http://www.w3.org/ns/shacl#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schema: <https://schema.org/>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix cred: <https://www.w3.org/2018/credentials#>.
@prefix sec: <https://w3id.org/security#>.
@prefix fibo-fbc-dae-dbt: <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/>.
@prefix fibo-loan-ln-ln: <https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/>.
@prefix mort: <https://solid-mortgage-vocab.vercel.app/mort#>.
@prefix mshape: <https://solid-mortgage-vocab.vercel.app/shapes#>.

mshape:TaxComplianceCredentialShape a sh:NodeShape;
    sh:targetClass mort:TaxComplianceCredential;
    sh:closed true.
_:n3-877 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:TaxComplianceCredentialShape sh:ignoredProperties _:n3-877.
_:n3-878 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:TaxComplianceCredentialShape sh:property _:n3-878.
_:n3-879 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:TaxComplianceCredentialShape sh:property _:n3-879.
_:n3-880 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:TaxComplianceCredentialShape sh:property _:n3-880.
_:n3-881 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:TaxComplianceCredentialShape sh:property _:n3-881.
_:n3-882 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TaxComplianceCredentialShape sh:property _:n3-882.
_:n3-883 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:TaxComplianceSubjectShape.
mshape:TaxComplianceCredentialShape sh:property _:n3-883.
_:n3-884 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:TaxComplianceCredentialShape sh:property _:n3-884.
mshape:TaxComplianceSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-885 sh:path rdf:type;
    sh:hasValue schema:Organization.
mshape:TaxComplianceSubjectShape sh:property _:n3-885.
_:n3-886 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TaxComplianceSubjectShape sh:property _:n3-886.
_:n3-887 sh:path mort:taxIdLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$".
mshape:TaxComplianceSubjectShape sh:property _:n3-887.
_:n3-888 sh:path mort:taxComplianceStatus;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-889 rdf:first mort:TaxComplianceStatus-Compliant;
    rdf:rest _:n3-890.
_:n3-890 rdf:first mort:TaxComplianceStatus-NotCompliant;
    rdf:rest rdf:nil.
_:n3-888 sh:in _:n3-889.
mshape:TaxComplianceSubjectShape sh:property _:n3-888.
_:n3-891 sh:path mort:filingsCurrentThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:TaxComplianceSubjectShape sh:property _:n3-891.
_:n3-892 sh:path mort:annualTurnoverBand;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-893 rdf:first mort:TurnoverBand-Under500k;
    rdf:rest _:n3-894.
_:n3-894 rdf:first mort:TurnoverBand-500kTo1M;
    rdf:rest _:n3-895.
_:n3-895 rdf:first mort:TurnoverBand-1MTo5M;
    rdf:rest _:n3-896.
_:n3-896 rdf:first mort:TurnoverBand-Over5M;
    rdf:rest rdf:nil.
_:n3-892 sh:in _:n3-893.
mshape:TaxComplianceSubjectShape sh:property _:n3-892.
mshape:CashFlowRecordShape a sh:NodeShape;
    sh:targetClass mort:CashFlowRecord;
    sh:closed true.
_:n3-897 sh:path rdf:type;
    sh:hasValue mort:CashFlowRecord.
mshape:CashFlowRecordShape sh:property _:n3-897.
_:n3-898 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CashFlowRecordShape sh:property _:n3-898.
_:n3-899 sh:path dcterms:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:message "the account holder's WebID".
mshape:CashFlowRecordShape sh:property _:n3-899.
_:n3-900 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:message "the bank's WebID".
mshape:CashFlowRecordShape sh:property _:n3-900.
_:n3-901 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CashFlowRecordShape sh:property _:n3-901.
_:n3-902 sh:path mort:accountLast4;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^[0-9]{4}$".
mshape:CashFlowRecordShape sh:property _:n3-902.
_:n3-903 sh:path mort:monthlyCashFlow;
    sh:minCount 1;
    sh:maxCount 36;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonthlyCashFlowShape.
mshape:CashFlowRecordShape sh:property _:n3-903.
mshape:MonthlyCashFlowShape a sh:NodeShape;
    sh:closed true.
_:n3-904 sh:path rdf:type;
    sh:hasValue mort:MonthlyCashFlow.
mshape:MonthlyCashFlowShape sh:property _:n3-904.
_:n3-905 sh:path mort:periodStart;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:MonthlyCashFlowShape sh:property _:n3-905.
_:n3-906 sh:path mort:inflowUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:MonthlyCashFlowShape sh:property _:n3-906.
_:n3-907 sh:path mort:outflowUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:MonthlyCashFlowShape sh:property _:n3-907.
_:n3-908 sh:path mort:debtServiceUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:MonthlyCashFlowShape sh:property _:n3-908.
_:n3-909 sh:path mort:closingBalanceUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal.
mshape:MonthlyCashFlowShape sh:property _:n3-909.
mshape:BusinessLoanTermsShape a sh:NodeShape;
    sh:targetClass mort:BusinessLoanTerms;
    sh:closed true.
_:n3-910 sh:path rdf:type;
    sh:hasValue mort:BusinessLoanTerms.
mshape:BusinessLoanTermsShape sh:property _:n3-910.
_:n3-911 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:BusinessLoanTermsShape sh:property _:n3-911.
_:n3-912 sh:path mort:loanNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:BusinessLoanTermsShape sh:property _:n3-912.
_:n3-913 sh:path fibo-fbc-dae-dbt:hasBorrower;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:BusinessLoanTermsShape sh:property _:n3-913.
_:n3-914 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:BusinessLoanTermsShape sh:property _:n3-914.
_:n3-915 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:BusinessLoanTermsShape sh:property _:n3-915.
_:n3-916 sh:path fibo-loan-ln-ln:hasPrincipalAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:BusinessLoanTermsShape sh:property _:n3-916.
_:n3-917 sh:path schema:interestRate;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0;
    sh:maxInclusive 25.0;
    sh:message "interestRate is the note rate in percent (e.g. 8.25)".
mshape:BusinessLoanTermsShape sh:property _:n3-917.
_:n3-918 sh:path mort:loanTermMonths;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 6;
    sh:maxInclusive 300.
mshape:BusinessLoanTermsShape sh:property _:n3-918.
_:n3-919 sh:path mort:monthlyPrincipalAndInterest;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:BusinessLoanTermsShape sh:property _:n3-919.
_:n3-920 sh:path mort:covenant;
    sh:minCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:FinancialCovenantShape.
mshape:BusinessLoanTermsShape sh:property _:n3-920.
mshape:FinancialCovenantShape a sh:NodeShape;
    sh:closed true.
_:n3-921 sh:path rdf:type;
    sh:hasValue mort:FinancialCovenant.
mshape:FinancialCovenantShape sh:property _:n3-921.
_:n3-922 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:FinancialCovenantShape sh:property _:n3-922.
_:n3-923 sh:path mort:covenantMetric;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-924 rdf:first mort:CovenantMetric-DebtServiceCoverage;
    rdf:rest _:n3-925.
_:n3-925 rdf:first mort:CovenantMetric-MinimumAverageBalance;
    rdf:rest rdf:nil.
_:n3-923 sh:in _:n3-924.
mshape:FinancialCovenantShape sh:property _:n3-923.
_:n3-926 sh:path mort:covenantThreshold;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 0.0.
mshape:FinancialCovenantShape sh:property _:n3-926.
mshape:CashFlowAssessmentShape a sh:NodeShape;
    sh:targetClass mort:CashFlowAssessment;
    sh:closed true.
_:n3-927 sh:path rdf:type;
    sh:hasValue mort:CashFlowAssessment.
mshape:CashFlowAssessmentShape sh:property _:n3-927.
_:n3-928 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:CashFlowAssessmentShape sh:property _:n3-928.
_:n3-929 sh:path dcterms:subject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:message "the borrower's WebID".
mshape:CashFlowAssessmentShape sh:property _:n3-929.
_:n3-930 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:CashFlowAssessmentShape sh:property _:n3-930.
_:n3-931 sh:path mort:checkedAt;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:CashFlowAssessmentShape sh:property _:n3-931.
_:n3-932 sh:path dcterms:source;
    sh:minCount 1;
    sh:nodeKind sh:IRI;
    sh:message "the pod resources the measures were taken from".
mshape:CashFlowAssessmentShape sh:property _:n3-932.
_:n3-933 sh:path mort:debtServiceCoverageRatio;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal.
mshape:CashFlowAssessmentShape sh:property _:n3-933.
_:n3-934 sh:path mort:averageBalanceUsd;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal.
mshape:CashFlowAssessmentShape sh:property _:n3-934.
_:n3-935 sh:path mort:covenantsMet;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:boolean.
mshape:CashFlowAssessmentShape sh:property _:n3-935.
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
_:n3-936 sh:path rdf:type;
    sh:hasValue schema:SingleFamilyResidence.
mshape:SubjectPropertyShape sh:property _:n3-936.
_:n3-937 sh:path rdf:type;
    sh:hasValue fibo-fnd-plc-rp:RealEstate.
mshape:SubjectPropertyShape sh:property _:n3-937.
_:n3-938 sh:path schema:address;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PostalAddressShape.
mshape:SubjectPropertyShape sh:property _:n3-938.
_:n3-939 sh:path schema:yearBuilt;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 1600;
    sh:maxInclusive 2100.
mshape:SubjectPropertyShape sh:property _:n3-939.
_:n3-940 sh:path schema:floorSize;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:FloorSizeShape.
mshape:SubjectPropertyShape sh:property _:n3-940.
_:n3-941 sh:path schema:numberOfBedrooms;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 50.
mshape:SubjectPropertyShape sh:property _:n3-941.
_:n3-942 sh:path schema:numberOfBathroomsTotal;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 0;
    sh:maxInclusive 50.
mshape:SubjectPropertyShape sh:property _:n3-942.
_:n3-943 sh:path mort:constructionType;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-943.
_:n3-944 sh:path mort:roofType;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-944.
_:n3-945 sh:path mort:parcelNumber;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-945.
_:n3-946 sh:path mort:legalDescription;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:SubjectPropertyShape sh:property _:n3-946.
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
_:n3-947 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:NamedPartyShape sh:ignoredProperties _:n3-947.
_:n3-948 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:NamedPartyShape sh:property _:n3-948.
mshape:LineItemShape a sh:NodeShape;
    sh:closed true.
_:n3-949 sh:path rdf:type;
    sh:hasValue schema:MonetaryAmount.
mshape:LineItemShape sh:property _:n3-949.
_:n3-950 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:LineItemShape sh:property _:n3-950.
_:n3-951 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal.
mshape:LineItemShape sh:property _:n3-951.
_:n3-952 sh:path schema:currency;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-953 rdf:first "USD";
    rdf:rest rdf:nil.
_:n3-952 sh:in _:n3-953.
mshape:LineItemShape sh:property _:n3-952.
mshape:FloorSizeShape a sh:NodeShape;
    sh:closed true.
_:n3-954 sh:path rdf:type;
    sh:hasValue schema:QuantitativeValue.
mshape:FloorSizeShape sh:property _:n3-954.
_:n3-955 sh:path schema:value;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:decimal;
    sh:minInclusive 1.0.
mshape:FloorSizeShape sh:property _:n3-955.
_:n3-956 sh:path schema:unitCode;
    sh:minCount 1;
    sh:maxCount 1.
_:n3-957 rdf:first "FTK";
    rdf:rest rdf:nil.
_:n3-956 sh:in _:n3-957.
mshape:FloorSizeShape sh:property _:n3-956.
mshape:ScoreDisclosureShape a sh:NodeShape;
    sh:closed true.
_:n3-958 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:ScoreDisclosureShape sh:ignoredProperties _:n3-958.
_:n3-959 sh:path mort:creditScoreValue;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:integer;
    sh:minInclusive 300;
    sh:maxInclusive 850.
mshape:ScoreDisclosureShape sh:property _:n3-959.
_:n3-960 sh:path mort:scoreModel;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-961 rdf:first mort:ScoreModel-FICO8;
    rdf:rest _:n3-962.
_:n3-962 rdf:first mort:ScoreModel-ClassicFICO;
    rdf:rest _:n3-963.
_:n3-963 rdf:first mort:ScoreModel-VantageScore4;
    rdf:rest rdf:nil.
_:n3-960 sh:in _:n3-961.
mshape:ScoreDisclosureShape sh:property _:n3-960.
_:n3-964 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ScoreDisclosureShape sh:property _:n3-964.
_:n3-965 sh:path dcterms:created;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:ScoreDisclosureShape sh:property _:n3-965.
_:n3-966 sh:path mort:keyFactor;
    sh:maxCount 5;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:ScoreDisclosureShape sh:property _:n3-966.
mshape:ConstraintShape a sh:NodeShape;
    sh:closed true.
_:n3-967 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:ConstraintShape sh:ignoredProperties _:n3-967.
_:n3-968 sh:path odrl:leftOperand;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-969 rdf:first odrl:purpose;
    rdf:rest _:n3-970.
_:n3-970 rdf:first odrl:dateTime;
    rdf:rest _:n3-971.
_:n3-971 rdf:first odrl:event;
    rdf:rest _:n3-972.
_:n3-972 rdf:first odrl:timeInterval;
    rdf:rest rdf:nil.
_:n3-968 sh:in _:n3-969.
mshape:ConstraintShape sh:property _:n3-968.
_:n3-973 sh:path odrl:operator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-974 rdf:first odrl:eq;
    rdf:rest _:n3-975.
_:n3-975 rdf:first odrl:lt;
    rdf:rest _:n3-976.
_:n3-976 rdf:first odrl:lteq;
    rdf:rest rdf:nil.
_:n3-973 sh:in _:n3-974.
mshape:ConstraintShape sh:property _:n3-973.
_:n3-977 sh:path odrl:rightOperand;
    sh:minCount 1;
    sh:maxCount 1.
mshape:ConstraintShape sh:property _:n3-977.
mshape:PermissionShape a sh:NodeShape;
    sh:closed true.
_:n3-978 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:PermissionShape sh:ignoredProperties _:n3-978.
_:n3-979 sh:path odrl:target;
    sh:minCount 1;
    sh:nodeKind sh:IRI.
mshape:PermissionShape sh:property _:n3-979.
_:n3-980 sh:path odrl:action;
    sh:minCount 1;
    sh:maxCount 3;
    sh:nodeKind sh:IRI.
_:n3-981 rdf:first odrl:read;
    rdf:rest _:n3-982.
_:n3-982 rdf:first odrl:append;
    rdf:rest _:n3-983.
_:n3-983 rdf:first odrl:write;
    rdf:rest rdf:nil.
_:n3-980 sh:in _:n3-981.
mshape:PermissionShape sh:property _:n3-980.
_:n3-984 sh:path odrl:assignee;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:PermissionShape sh:property _:n3-984.
_:n3-985 sh:path odrl:constraint;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:ConstraintShape.
mshape:PermissionShape sh:property _:n3-985.
mshape:AgentShape a sh:NodeShape;
    sh:closed true.
_:n3-986 sh:path rdf:type;
    sh:minCount 1.
_:n3-987 rdf:first schema:Person;
    rdf:rest _:n3-988.
_:n3-988 rdf:first schema:Organization;
    rdf:rest _:n3-989.
_:n3-989 rdf:first foaf:Agent;
    rdf:rest rdf:nil.
_:n3-986 sh:in _:n3-987.
mshape:AgentShape sh:property _:n3-986.
_:n3-990 sh:path schema:name;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AgentShape sh:property _:n3-990.
_:n3-991 sh:path ldp:inbox;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-991.
_:n3-992 sh:path pim:storage;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-992.
_:n3-993 sh:path sec:verificationMethod;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-993.
_:n3-994 sh:path sec:assertionMethod;
    sh:nodeKind sh:IRI.
mshape:AgentShape sh:property _:n3-994.
_:n3-995 sh:path mort:titleVesting;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:AgentShape sh:property _:n3-995.
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
_:n3-996 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:TitleClearCredentialShape sh:ignoredProperties _:n3-996.
_:n3-997 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:TitleClearCredentialShape sh:property _:n3-997.
_:n3-998 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:TitleClearCredentialShape sh:property _:n3-998.
_:n3-999 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:TitleClearCredentialShape sh:property _:n3-999.
_:n3-1000 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:TitleClearCredentialShape sh:property _:n3-1000.
_:n3-1001 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleClearCredentialShape sh:property _:n3-1001.
_:n3-1002 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:TitleClearSubjectShape.
mshape:TitleClearCredentialShape sh:property _:n3-1002.
_:n3-1003 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleClearCredentialShape sh:property _:n3-1003.
_:n3-1004 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:TitleClearCredentialShape sh:property _:n3-1004.
mshape:TitleClearSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-1005 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:TitleClearSubjectShape sh:ignoredProperties _:n3-1005.
_:n3-1006 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:TitleClearSubjectShape sh:property _:n3-1006.
_:n3-1007 sh:path mort:titleStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-1008 rdf:first mort:TitleStatus-Clear;
    rdf:rest _:n3-1009.
_:n3-1009 rdf:first mort:TitleStatus-Clouded;
    rdf:rest rdf:nil.
_:n3-1007 sh:in _:n3-1008;
    sh:message "titleStatus must be a concept from mort:TitleStatusScheme".
mshape:TitleClearSubjectShape sh:property _:n3-1007.
_:n3-1010 sh:path mort:searchedThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date;
    sh:message "searchedThrough is the effective xsd:date through which public records were searched".
mshape:TitleClearSubjectShape sh:property _:n3-1010.
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
_:n3-1011 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:TitleCommitmentCredentialShape sh:ignoredProperties _:n3-1011.
_:n3-1012 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:TitleCommitmentCredentialShape sh:property _:n3-1012.
_:n3-1013 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-1013.
_:n3-1014 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:TitleCommitmentCredentialShape sh:property _:n3-1014.
_:n3-1015 sh:path cred:validUntil;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:TitleCommitmentCredentialShape sh:property _:n3-1015.
_:n3-1016 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-1016.
_:n3-1017 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:TitleCommitmentSubjectShape.
mshape:TitleCommitmentCredentialShape sh:property _:n3-1017.
_:n3-1018 sh:path cred:evidence;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-1018.
_:n3-1019 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:TitleCommitmentCredentialShape sh:property _:n3-1019.
mshape:TitleCommitmentSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-1020 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:TitleCommitmentSubjectShape sh:ignoredProperties _:n3-1020.
_:n3-1021 sh:path schema:identifier;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-1021.
_:n3-1022 sh:path mort:subjectProperty;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:PropertyShape.
mshape:TitleCommitmentSubjectShape sh:property _:n3-1022.
_:n3-1023 sh:path mort:searchedThrough;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:date.
mshape:TitleCommitmentSubjectShape sh:property _:n3-1023.
_:n3-1024 sh:path mort:vestedOwner;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-1024.
_:n3-1025 sh:path mort:proposedInsured;
    sh:minCount 1;
    sh:maxCount 2;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-1025.
_:n3-1026 sh:path mort:ownerPolicyAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:TitleCommitmentSubjectShape sh:property _:n3-1026.
_:n3-1027 sh:path mort:loanPolicyAmount;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:TitleCommitmentSubjectShape sh:property _:n3-1027.
_:n3-1028 sh:path mort:titleRequirement;
    sh:minCount 1;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-1028.
_:n3-1029 sh:path mort:titleException;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:TitleCommitmentSubjectShape sh:property _:n3-1029.
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
_:n3-1030 sh:path rdf:type;
    sh:hasValue fibo-loan-ln-app:UnderwritingDecision.
mshape:UnderwritingDecisionShape sh:property _:n3-1030.
_:n3-1031 sh:path fibo-fnd-rel-rel:evaluates;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:UnderwritingDecisionShape sh:property _:n3-1031.
_:n3-1032 sh:path mort:decisionStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-1033 rdf:first mort:DecisionStatus-Approved;
    rdf:rest _:n3-1034.
_:n3-1034 rdf:first mort:DecisionStatus-ApprovedWithConditions;
    rdf:rest _:n3-1035.
_:n3-1035 rdf:first mort:DecisionStatus-Denied;
    rdf:rest _:n3-1036.
_:n3-1036 rdf:first mort:DecisionStatus-Suspended;
    rdf:rest rdf:nil.
_:n3-1032 sh:in _:n3-1033;
    sh:message "decisionStatus must be a concept from mort:DecisionStatusScheme".
mshape:UnderwritingDecisionShape sh:property _:n3-1032.
_:n3-1037 sh:path mort:underwritingCondition;
    sh:datatype xsd:string;
    sh:minLength 1.
mshape:UnderwritingDecisionShape sh:property _:n3-1037.
_:n3-1038 sh:path fibo-loan-ln-app:hasApprovedAmount;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI;
    sh:node mshape:MonetaryAmountShape.
mshape:UnderwritingDecisionShape sh:property _:n3-1038.
_:n3-1039 sh:path dcterms:type;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-1040 rdf:first fibo-loan-ln-app:UnderwritingDecision-Approve;
    rdf:rest _:n3-1041.
_:n3-1041 rdf:first fibo-loan-ln-app:UnderwritingDecision-Deny;
    rdf:rest _:n3-1042.
_:n3-1042 rdf:first fibo-loan-ln-app:UnderwritingDecision-Eligible;
    rdf:rest _:n3-1043.
_:n3-1043 rdf:first fibo-loan-ln-app:UnderwritingDecision-Ineligible;
    rdf:rest _:n3-1044.
_:n3-1044 rdf:first fibo-loan-ln-app:UnderwritingDecision-Refer;
    rdf:rest _:n3-1045.
_:n3-1045 rdf:first fibo-loan-ln-app:UnderwritingDecision-UnableToDetermine;
    rdf:rest rdf:nil.
_:n3-1039 sh:in _:n3-1040;
    sh:message "the AUS recommendation must be a FIBO UnderwritingDecision named individual".
mshape:UnderwritingDecisionShape sh:property _:n3-1039.
_:n3-1046 sh:path dcterms:issued;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:UnderwritingDecisionShape sh:property _:n3-1046.
_:n3-1047 sh:path dcterms:creator;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:UnderwritingDecisionShape sh:property _:n3-1047.
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
_:n3-1048 rdf:first sec:proof;
    rdf:rest rdf:nil.
mshape:ZkOperandAnchorShape sh:ignoredProperties _:n3-1048.
_:n3-1049 sh:path rdf:type;
    sh:hasValue cred:VerifiableCredential.
mshape:ZkOperandAnchorShape sh:property _:n3-1049.
_:n3-1050 sh:path cred:issuer;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
mshape:ZkOperandAnchorShape sh:property _:n3-1050.
_:n3-1051 sh:path cred:validFrom;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:dateTime;
    sh:lessThan cred:validUntil.
mshape:ZkOperandAnchorShape sh:property _:n3-1051.
_:n3-1052 sh:path cred:validUntil;
    sh:maxCount 1;
    sh:datatype xsd:dateTime.
mshape:ZkOperandAnchorShape sh:property _:n3-1052.
_:n3-1053 sh:path cred:credentialStatus;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:BlankNodeOrIRI.
mshape:ZkOperandAnchorShape sh:property _:n3-1053.
_:n3-1054 sh:path cred:credentialSubject;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI;
    sh:node mshape:ZkOperandAnchorSubjectShape;
    sh:message "credentialSubject must be the holder WebID the verifier matches against the DPoP-bound session".
mshape:ZkOperandAnchorShape sh:property _:n3-1054.
_:n3-1055 sh:path cred:credentialSchema;
    sh:nodeKind sh:IRI.
mshape:ZkOperandAnchorShape sh:property _:n3-1055.
mshape:ZkOperandAnchorSubjectShape a sh:NodeShape;
    sh:closed true.
_:n3-1056 rdf:first rdf:type;
    rdf:rest rdf:nil.
mshape:ZkOperandAnchorSubjectShape sh:ignoredProperties _:n3-1056.
_:n3-1057 sh:path mort:field;
    sh:minCount 1;
    sh:maxCount 1;
    sh:nodeKind sh:IRI.
_:n3-1058 rdf:first mort:monthlyGrossIncomeUsd;
    rdf:rest _:n3-1059.
_:n3-1059 rdf:first mort:totalMonthlyDebtUsd;
    rdf:rest _:n3-1060.
_:n3-1060 rdf:first mort:creditScoreValue;
    rdf:rest _:n3-1061.
_:n3-1061 rdf:first mort:cashFlowScoreValue;
    rdf:rest _:n3-1062.
_:n3-1062 rdf:first mort:nsf90Count;
    rdf:rest _:n3-1063.
_:n3-1063 rdf:first mort:ownershipPercentageBps;
    rdf:rest _:n3-1064.
_:n3-1064 rdf:first mort:beneficialOwnershipArrayCommitment;
    rdf:rest rdf:nil.
_:n3-1057 sh:in _:n3-1058;
    sh:message "field must be one of decision 0005's ZK scaled-unit field IRIs, or a business KYB ownership field".
mshape:ZkOperandAnchorSubjectShape sh:property _:n3-1057.
_:n3-1065 sh:path mort:operandEnc;
    sh:minCount 1;
    sh:maxCount 1;
    sh:datatype xsd:string;
    sh:pattern "^0x[0-9a-f]{1,64}$";
    sh:message "operandEnc must be a 0x-prefixed lowercase hex field element".
mshape:ZkOperandAnchorSubjectShape sh:property _:n3-1065.
`,
} as const;

/** Document keys of the bundled SHACL shapes. */
export type ShapesDocumentKey = keyof typeof SHAPES_TURTLE;

/** Every bundled shapes document, in one Turtle-parseable list. */
export const ALL_SHAPES_DOCUMENTS: readonly string[] = Object.values(SHAPES_TURTLE);

/** File stem of the 57 bundled shapes documents. */
export const SHAPES_DOCUMENT_KEYS = Object.keys(SHAPES_TURTLE) as readonly ShapesDocumentKey[];
