import dataFactory from "@rdfjs/data-model";
import type { DatasetCore, Term } from "@rdfjs/types";
import { Parser, Store } from "n3";
import type { Validator } from "shacl-engine";
import { MORT } from "./vocab/mort.js";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

/**
 * sh:targetClass of each resource shape, keyed by its shapes document. Kept in
 * lock-step with shapes/*.ttl by a test. Used by validate()'s `expect` option:
 * SHACL validation is target-driven, so a document containing NO node of the
 * expected class would otherwise conform vacuously - dangerous for untrusted
 * pod RDF.
 */
export const RESOURCE_TARGET_CLASSES = {
  "borrower-profile": "https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/Borrower",
  "employment-income-credential": MORT.EmploymentIncomeCredential,
  "asset-credential": MORT.AssetCredential,
  "credit-score-credential": MORT.CreditScoreCredential,
  "appraisal-credential": MORT.AppraisalCredential,
  "title-clear-credential": MORT.TitleClearCredential,
  "loan-application":
    "https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/LoanApplication",
  "underwriting-decision":
    "https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/UnderwritingDecision",
  "closing-record":
    "https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/Mortgages/Mortgage",
  "consent-receipt": "https://w3id.org/dpv#ConsentReceipt",
  "zk-operand-anchor": MORT.ZkOperandAnchor,
  // Static rebuild (decision 0017).
  "access-request": "http://www.w3.org/ns/odrl/2/Request",
  "agent-profile": "http://xmlns.com/foaf/0.1/PersonalProfileDocument",
  "closing-disclosure": MORT.ClosingDisclosure,
  "contact-details": "https://schema.org/ContactPoint",
  "credential-pointer": MORT.CredentialPointer,
  "credit-report": MORT.CreditReport,
  document: "https://schema.org/DigitalDocument",
  "escrow-statement": MORT.EscrowAccountStatement,
  "evidence-of-insurance-credential": MORT.EvidenceOfInsuranceCredential,
  "identity-credential": MORT.IdentityCredential,
  "inbox-message": "https://www.w3.org/ns/activitystreams#Announce",
  "loan-estimate": MORT.LoanEstimate,
  "odrl-policy": "http://www.w3.org/ns/odrl/2/Agreement",
  "payment-mandate": MORT.PaymentMandate,
  "purchase-agreement": MORT.PurchaseAgreement,
  "recorded-instrument": MORT.RecordedInstrument,
  "recording-receipt": MORT.RecordingReceipt,
  "score-notice": MORT.CreditScoreNotice,
  "service-order": "https://schema.org/Order",
  "servicing-notice": MORT.LoanTransferNotice,
  "settlement-statement": MORT.SettlementStatement,
  "subject-property": "https://schema.org/SingleFamilyResidence",
  "title-commitment-credential": MORT.TitleCommitmentCredential,
  // Business KYB (demo 3, flows.md section 3).
  "beneficial-ownership-credential": MORT.BeneficialOwnershipCredential,
  "cdd-decision-record": MORT.CddDecisionRecord,
  "officer-authorisation-credential": MORT.OfficerAuthorisationCredential,
  "organisational-identity-credential": MORT.OrganisationalIdentityCredential,
  // Moving-house demo (flows.md section 2).
  "address-record": "http://www.w3.org/ns/locn#Address",
  "data-product": "https://ekgf.github.io/dprod/DataProduct",
  // Small-dollar lending (flows.md section 4).
  "adverse-action-notice": MORT.AdverseActionNotice,
  "cash-flow-credential": MORT.CashFlowCredential,
  "closed-end-disclosure": MORT.ClosedEndCreditDisclosure,
  "payout-instruction": MORT.PayoutInstruction,
  "repayment-history-credential": MORT.RepaymentHistoryCredential,
  // Medication handover (flows.md section 5): FHIR R5 resources in RDF.
  "medication-statement": "http://hl7.org/fhir/MedicationStatement",
  "medication-request": "http://hl7.org/fhir/MedicationRequest",
  "medication-dispense": "http://hl7.org/fhir/MedicationDispense",
  "allergy-intolerance": "http://hl7.org/fhir/AllergyIntolerance",
  "provenance-record": "http://hl7.org/fhir/Provenance",
  "discharge-summary": "http://hl7.org/fhir/Composition",
  "encounter-record": "http://hl7.org/fhir/Encounter",
} as const;

/** The mortgage resource kinds validate() can be told to expect. */
export type MortgageResourceKind = keyof typeof RESOURCE_TARGET_CLASSES;

/** One SHACL validation result, flattened to plain strings for callers. */
export interface ShaclViolation {
  /** Human-readable message (sh:message where the shape provides one). */
  readonly message: string;
  /** IRI or blank-node label of the failing focus node. */
  readonly focusNode?: string;
  /** Predicate IRIs of the failing property path, in step order. */
  readonly path: readonly string[];
  /** The offending value, when the constraint reports one. */
  readonly value?: string;
  /** IRI of the SHACL constraint component that failed. */
  readonly constraintComponent?: string;
}

/** Result of validating a dataset against the bundled mortgage shapes. */
export interface ShaclReport {
  readonly conforms: boolean;
  readonly violations: readonly ShaclViolation[];
}

export interface ValidateOptions {
  /**
   * Base IRI used when `data` is a Turtle string - pass the pod resource URL
   * so relative IRIs resolve the way the server sees them.
   */
  readonly baseIRI?: string;
  /**
   * The resource kind this document is supposed to contain. When set, a
   * document with no node typed as that kind's target class FAILS instead of
   * conforming vacuously. ALWAYS set this when validating untrusted pod RDF,
   * and pass `focusNode` too whenever the root IRI is known.
   */
  readonly expect?: MortgageResourceKind;
  /**
   * IRI of the node that must BE the expected resource. Without it, `expect`
   * only proves that SOME node has the target type - a decoy node of the
   * right type beside an untyped root would still pass. Requires `expect`.
   */
  readonly focusNode?: string;
}

/** The engine, loaded on first use (see shacl-validator.ts). */
let validatorModule: Promise<typeof import("./shacl-validator.js")> | undefined;
const loadValidator = () => {
  validatorModule ??= import("./shacl-validator.js");
  validatorModule.catch(() => {
    validatorModule = undefined;
  });
  return validatorModule;
};

function termValue(candidate: unknown): string | undefined {
  if (!candidate || typeof candidate !== "object") return undefined;
  const direct = candidate as Term;
  if (typeof direct.termType === "string" && typeof direct.value === "string") {
    return direct.value;
  }
  const wrapped = (candidate as { term?: Term }).term;
  return wrapped && typeof wrapped.value === "string" ? wrapped.value : undefined;
}

function pathPredicates(path: unknown): readonly string[] {
  if (!Array.isArray(path)) return [];
  const predicates: string[] = [];
  for (const step of path) {
    const stepPredicates = (step as { predicates?: readonly Term[] }).predicates;
    if (!Array.isArray(stepPredicates)) continue;
    for (const predicate of stepPredicates) {
      const value = termValue(predicate);
      if (value !== undefined) predicates.push(value);
    }
  }
  return predicates;
}

/**
 * Validate pod data against the bundled mortgage SHACL shapes (the nine
 * resource shapes + the ZK operand anchor, decision 0005/0012).
 *
 * Every resource an app writes MUST conform before the write; treat pod RDF
 * as untrusted input and validate on read where the data crosses a trust
 * boundary. Accepts any RDF/JS DatasetCore (e.g. the dataset behind a
 * `@jeswr/fetch-rdf` result) or a Turtle string.
 */
export async function validate(
  data: DatasetCore | string,
  options: ValidateOptions = {},
): Promise<ShaclReport> {
  const dataset: DatasetCore =
    typeof data === "string"
      ? new Store(new Parser({ format: "text/turtle", baseIRI: options.baseIRI }).parse(data))
      : data;

  if (options.focusNode !== undefined && options.expect === undefined) {
    throw new RangeError("validate(): focusNode requires expect");
  }

  if (options.expect !== undefined) {
    const targetClass = RESOURCE_TARGET_CLASSES[options.expect];
    // Binding to the intended root closes the decoy bypass: once the root is
    // required to carry the target type, SHACL targeting validates it.
    const typed = dataset.match(
      options.focusNode === undefined ? null : dataFactory.namedNode(options.focusNode),
      dataFactory.namedNode(RDF_TYPE),
      dataFactory.namedNode(targetClass),
    );
    if (typed.size === 0) {
      const where =
        options.focusNode === undefined
          ? "expected at least one node"
          : `expected <${options.focusNode}> to be`;
      return {
        conforms: false,
        violations: [
          {
            message: `no ${options.expect} resource found: ${where} typed <${targetClass}> (SHACL targeting would conform vacuously)`,
            focusNode: options.focusNode,
            path: [RDF_TYPE],
          },
        ],
      };
    }
  }

  const { shapesValidator } = await loadValidator();
  const report = await shapesValidator().validate({ dataset });

  return {
    conforms: report.conforms,
    violations: flattenResults(report.results).map((result) => ({
      message:
        result.message.map((literal) => literal.value).join("; ") ||
        (termValue(result.constraintComponent) ?? "constraint violated"),
      focusNode: termValue(result.focusNode),
      path: pathPredicates(result.path),
      value: termValue(result.value),
      constraintComponent: termValue(result.constraintComponent),
    })),
  };
}

type EngineResult = Awaited<ReturnType<Validator["validate"]>>["results"][number];

/**
 * Flatten nested results depth-first. Parents stay in the list: a qualified
 * or sh:node violation is reported by its parent result, while its children
 * explain which inner constraint each value missed.
 */
function flattenResults(results: readonly EngineResult[]): readonly EngineResult[] {
  return results.flatMap((result) => [result, ...flattenResults(result.results)]);
}
