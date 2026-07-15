/**
 * IRI constants for the vc-kit credential graphs. Every namespace is a real,
 * dereferenceable vocabulary (W3C cred/sec/status, schema.org, FIBO, DCMI) or
 * the project vocab hosted at solid-mortgage-vocab.vercel.app (decision 0010) -
 * never a minted placeholder domain.
 */

import { type MortgageResourceKind, RESOURCE_TARGET_CLASSES } from "@mortgage/data-model";

export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

/** W3C Verifiable Credentials 2.0 vocabulary. */
export const CRED = "https://www.w3.org/2018/credentials#";
export const VC_CREDENTIAL = `${CRED}VerifiableCredential`;
export const VC_ISSUER = `${CRED}issuer`;
export const VC_VALID_FROM = `${CRED}validFrom`;
export const VC_VALID_UNTIL = `${CRED}validUntil`;
export const VC_CREDENTIAL_SUBJECT = `${CRED}credentialSubject`;
export const VC_CREDENTIAL_STATUS = `${CRED}credentialStatus`;
export const VC_CREDENTIAL_SCHEMA = `${CRED}credentialSchema`;
export const VC_EVIDENCE = `${CRED}evidence`;

/** W3C Data Integrity / security vocabulary (proof nodes). */
export const SEC = "https://w3id.org/security#";
export const SEC_PROOF = `${SEC}proof`;
export const SEC_DATA_INTEGRITY_PROOF = `${SEC}DataIntegrityProof`;
export const SEC_CRYPTOSUITE = `${SEC}cryptosuite`;
export const SEC_VERIFICATION_METHOD = `${SEC}verificationMethod`;
export const SEC_PROOF_PURPOSE = `${SEC}proofPurpose`;
export const SEC_PROOF_VALUE = `${SEC}proofValue`;
export const SEC_ASSERTION_METHOD = `${SEC}assertionMethod`;

/** Data Integrity proof `created` timestamps use dcterms:created. */
export const DC_CREATED = "http://purl.org/dc/terms/created";
export const DCTERMS_ISSUED = "http://purl.org/dc/terms/issued";

/** W3C Bitstring Status List vocabulary. */
export const STATUS = "https://www.w3.org/ns/credentials/status#";
export const STATUS_BITSTRING_ENTRY = `${STATUS}BitstringStatusListEntry`;
export const STATUS_PURPOSE = `${STATUS}statusPurpose`;
export const STATUS_LIST_INDEX = `${STATUS}statusListIndex`;
export const STATUS_LIST_CREDENTIAL = `${STATUS}statusListCredential`;

/** schema.org terms used by the sm-19 subject shapes. */
export const SCHEMA = "https://schema.org/";
export const SCHEMA_ORGANIZATION = `${SCHEMA}Organization`;
export const SCHEMA_POSTAL_ADDRESS = `${SCHEMA}PostalAddress`;
export const SCHEMA_DEPOSIT_ACCOUNT = `${SCHEMA}DepositAccount`;
export const SCHEMA_MONETARY_AMOUNT = `${SCHEMA}MonetaryAmount`;
export const SCHEMA_NAME = `${SCHEMA}name`;
export const SCHEMA_WORKS_FOR = `${SCHEMA}worksFor`;
export const SCHEMA_JOB_TITLE = `${SCHEMA}jobTitle`;
export const SCHEMA_START_DATE = `${SCHEMA}startDate`;
export const SCHEMA_OWNS = `${SCHEMA}owns`;
export const SCHEMA_PROVIDER = `${SCHEMA}provider`;
export const SCHEMA_AMOUNT = `${SCHEMA}amount`;
export const SCHEMA_VALUE = `${SCHEMA}value`;
export const SCHEMA_CURRENCY = `${SCHEMA}currency`;
export const SCHEMA_ADDRESS = `${SCHEMA}address`;
export const SCHEMA_STREET_ADDRESS = `${SCHEMA}streetAddress`;
export const SCHEMA_ADDRESS_LOCALITY = `${SCHEMA}addressLocality`;
export const SCHEMA_ADDRESS_REGION = `${SCHEMA}addressRegion`;
export const SCHEMA_POSTAL_CODE = `${SCHEMA}postalCode`;

/** FIBO terms used by the appraisal / title / property shapes. */
export const FIBO_REAL_ESTATE =
  "https://spec.edmcouncil.org/fibo/ontology/FND/Places/RealProperty/RealEstate";
export const FIBO_APPRAISAL =
  "https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/Appraisal";
export const FIBO_APPRAISER =
  "https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/Appraiser";
export const FIBO_APPRAISED_VALUE =
  "https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/AppraisedValue";
export const FIBO_HAS_ESTIMATED_VALUE =
  "https://spec.edmcouncil.org/fibo/ontology/FND/Arrangements/Assessments/hasEstimatedValue";
export const FIBO_EVALUATES =
  "https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/evaluates";
export const FIBO_IS_GENERATED_BY =
  "https://spec.edmcouncil.org/fibo/ontology/FND/Relations/Relations/isGeneratedBy";

/** XSD datatypes. */
export const XSD = "http://www.w3.org/2001/XMLSchema#";
export const XSD_DATE = `${XSD}date`;
export const XSD_DATE_TIME = `${XSD}dateTime`;
export const XSD_DECIMAL = `${XSD}decimal`;

/** Published SHACL shapes namespace (decision 0010; credentialSchema targets). */
export const MSHAPE = "https://solid-mortgage-vocab.vercel.app/shapes#";

const SHAPE_LOCAL_NAMES: Readonly<Record<CredentialKind, string>> = {
  "employment-income-credential": "EmploymentIncomeCredentialShape",
  "asset-credential": "AssetCredentialShape",
  "credit-score-credential": "CreditScoreCredentialShape",
  "appraisal-credential": "AppraisalCredentialShape",
  "title-clear-credential": "TitleClearCredentialShape",
  "zk-operand-anchor": "ZkOperandAnchorShape",
};

/** The data-model resource kinds that are Verifiable Credentials (issuable here). */
export type CredentialKind =
  | "employment-income-credential"
  | "asset-credential"
  | "credit-score-credential"
  | "appraisal-credential"
  | "title-clear-credential"
  | "zk-operand-anchor";

/** `cred:credentialSchema` IRI per credential kind (decision 0004). */
export function credentialSchemaIri(kind: CredentialKind): string {
  return `${MSHAPE}${SHAPE_LOCAL_NAMES[kind]}`;
}

/** The `sh:targetClass` (mort class) of a credential kind. */
export function targetClassOf(kind: CredentialKind): string {
  return RESOURCE_TARGET_CLASSES[kind];
}

/** Narrow a data-model resource kind to a credential kind, or `undefined`. */
export function asCredentialKind(kind: MortgageResourceKind): CredentialKind | undefined {
  return kind in SHAPE_LOCAL_NAMES ? (kind as CredentialKind) : undefined;
}

/** The credential kind whose target class appears in `types`, or `undefined`. */
export function credentialKindOfTypes(types: readonly string[]): CredentialKind | undefined {
  const kinds = Object.keys(SHAPE_LOCAL_NAMES) as readonly CredentialKind[];
  return kinds.find((kind) => types.includes(RESOURCE_TARGET_CLASSES[kind]));
}
