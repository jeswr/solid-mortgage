/**
 * The guided click-through: one entry per page the visitor lands on, in journey order
 * (the five SPEC §2 stages, named as in `docs/glossary.md` §3). The overlay
 * (`overlay/overlay.js`) renders the current step, highlights its button, and can press
 * it for the visitor ("Do it for me"). Every step is a real click in a real app: the
 * overlay never fakes an outcome.
 *
 * Copy rules: `docs/glossary.md` §1. Titles under eight words; bodies one or two short
 * sentences that describe the action, not an outcome the page has not shown yet.
 */
export interface GuidedStep {
  readonly id: string;
  /** Stage heading shown above the step title. */
  readonly scene: string;
  readonly title: string;
  /** What happens on this page (plain language, one or two short sentences). */
  readonly body: string;
  /** The page this step happens on (gateway path). */
  readonly path: string;
  /**
   * The button the visitor should press. `selector` is tried first; `label` (its visible
   * name) is the fallback match.
   */
  readonly action?: { readonly label: string; readonly selector?: string };
  /** The step is complete once this selector matches… */
  readonly doneSelector?: string;
  /** …or this text appears on the page. */
  readonly doneText?: string;
  /** What to look for in the pod activity panel afterwards (shown under "Details"). */
  readonly watch?: string;
}

const VERIFY = "1 · Verify income, assets and credit";
const PREQUALIFY = "2 · Prequalify without disclosing income or credit score";
const APPLY = "3 · Apply with data from the pod";
const REVERIFY = "4 · Re-verify employment before closing";
const CLOSE = "5 · Close the loan and transfer servicing";

export const GUIDED_STEPS: readonly GuidedStep[] = [
  {
    id: "welcome",
    scene: "Welcome",
    title: "Alex is buying a home",
    body: "Alex's mortgage data is in a Solid pod: a personal data store Alex controls. Organisations read from it only with Alex's permission.",
    path: "/",
    watch:
      "The tour signs in to seven demo apps for you. Open Pod activity to see each read, write and permission change.",
  },
  {
    id: "vault",
    scene: VERIFY,
    title: "Alex's Data Vault",
    body: "Data Vault is Alex's app for the pod. It reads Alex's profile from the pod, not from its own database.",
    path: "/wallet",
    doneSelector: "[data-vault-ready]",
    watch: "Data Vault reads Alex's profile from the pod.",
  },
  {
    id: "vault-credentials",
    scene: VERIFY,
    title: "Alex's verification records",
    body: "Each record is a verifiable credential: a signed verification report that any party can check. Alex has no asset verification yet.",
    path: "/wallet/credentials",
    doneSelector: "[data-credential-list]",
    watch: "Each credential read is followed by reads of its issuer profile and status list.",
  },
  {
    id: "issue-assets",
    scene: VERIFY,
    title: "Verify Alex's assets",
    body: "The asset verification provider checks Alex's simulated bank balances. It saves a signed asset credential in Alex's pod.",
    path: "/verifications/assets",
    action: { label: "Issue credential" },
    doneSelector: '[data-panel-outcome="ok"]',
    watch: "Verification Services saves the asset verification credential.",
  },
  {
    id: "vault-assets",
    scene: VERIFY,
    title: "Check the new credential",
    body: "Data Vault now reads the asset credential that the provider saved. Data Vault did not create it.",
    path: "/wallet/credentials",
    doneSelector: "[data-credential-list]",
  },
  {
    id: "assistant-shop",
    scene: PREQUALIFY,
    title: "Ask the assistant for rate quotes",
    body: "Allow access, and the assistant proves that income is at least $7,000 a month and the credit score is 620 or higher. Lenders get the proofs, not the figures.",
    path: "/wallet/assistant",
    action: { label: "Allow selected sources", selector: "[data-consent-allow]" },
    doneSelector: "[data-agent-quotes]",
    watch: "The assistant reads only Alex's income and credit-score credentials from the pod.",
  },
  {
    id: "assistant-shop-apply",
    scene: PREQUALIFY,
    title: "Compare two illustrative quotes",
    body: "Each lender says whether Alex meets its prequalification criteria. A quote is not an offer or a Loan Estimate. Ask the assistant to apply with the primary lender.",
    path: "/wallet/assistant",
    action: { label: "Continue with primary lender", selector: '[data-agent-reply="apply"]' },
    doneSelector: "[data-agent-done]",
  },
  {
    id: "lender-53",
    scene: PREQUALIFY,
    title: "The second lender's view",
    body: "The second lender publishes its prequalification criteria and checks proofs. It never receives Alex's income or credit score.",
    path: "/lender-53",
  },
  {
    id: "assistant-apply",
    scene: APPLY,
    title: "Prefill the application",
    body: "The lender's assistant asks which sources it may read. Allow it, and it prefills the application from Alex's pod and simulated inbox.",
    path: "/lender-boa/assistant",
    action: { label: "Allow selected sources", selector: "[data-consent-allow]" },
    doneSelector: "[data-agent-review]",
    watch: "The lender reads Alex's profile and each credential from the pod.",
  },
  {
    id: "assistant-submit",
    scene: APPLY,
    title: "Review and submit",
    body: "Check what the assistant will send, then approve it. The lender saves the application in Alex's pod and issues a Loan Estimate.",
    path: "/lender-boa/assistant",
    action: { label: "Submit application", selector: '[data-agent-reply="submit"]' },
    doneSelector: "[data-agent-done]",
    watch: "The lender saves the loan application and an underwriting decision record.",
  },
  {
    id: "pipeline-review",
    scene: APPLY,
    title: "The loan officer's view",
    body: "The lender's pipeline reads Alex's loan file from the pod, with Alex's permission. Nobody uploads documents.",
    path: "/lender-boa/pipeline",
    doneSelector: "[data-pipeline-file]",
    watch: "The lender reads the application from Alex's pod to build this list.",
  },
  {
    id: "vault-grants",
    scene: APPLY,
    title: "Give the AUS access",
    body: "Before underwriting, Alex gives the automated underwriting system (AUS) read access to the loan file. Data Vault saves the permission and a consent receipt.",
    path: "/wallet/grants",
    action: { label: "Grant access", selector: '[data-grant-action="grant-gse"]' },
    doneSelector: '[data-grant-party="gse"][data-grant-state="granted"]',
    watch: "Alex changes the permission list on the mortgage folder from the browser.",
  },
  {
    id: "underwriting",
    scene: APPLY,
    title: "Run automated underwriting",
    body: "The AUS checks each credential and the loan file, then returns a recommendation. The lender's underwriter makes the credit decision.",
    path: "/gse/underwriting",
    action: { label: "Run AUS", selector: "[data-aus-console] > button" },
    doneSelector: "[data-aus-result]",
    watch: "The AUS reads the loan file with its own identity and saves its findings.",
  },
  {
    id: "appraisal",
    scene: APPLY,
    title: "Appraisal preview",
    body: "An appraisal can be saved as a signed credential in Alex's pod. In this local demo, the page shows a simulated preview and issues no credential.",
    path: "/property/appraisal",
    doneSelector: "[data-appraised-value]",
  },
  {
    id: "title",
    scene: APPLY,
    title: "Title search preview",
    body: "The title search result works the same way. The page shows a simulated preview. It is not a title commitment.",
    path: "/property/title",
    doneSelector: "[data-title-status]",
  },
  {
    id: "freshness",
    scene: REVERIFY,
    title: "Check employment before closing",
    body: "The lender must re-verify employment shortly before closing. It checks the dates on Alex's employment credential in the pod.",
    path: "/lender-boa/freshness",
    action: { label: "Check credential validity", selector: "[data-freshness-panel] > button" },
    doneSelector: "[data-freshness-result]",
  },
  {
    id: "reissue",
    scene: REVERIFY,
    title: "Re-issue the employment credential",
    body: "The employment verification provider issues a new credential with the same simulated data and a new validity period. It revokes the old credential on its status list.",
    path: "/verifications/employment",
    action: { label: "Re-issue credential" },
    doneSelector: '[data-panel-outcome="ok"]',
    watch: "Verification Services saves a new employment credential and updates the status list.",
  },
  {
    id: "clear-to-close",
    scene: REVERIFY,
    title: "Mark the loan clear to close",
    body: "The underwriter confirms the employment condition is satisfied. The lender marks the loan clear to close and saves the status in Alex's pod.",
    path: "/lender-boa/pipeline",
    action: { label: "Mark clear to close", selector: '[data-pipeline-action="clear-to-close"]' },
    doneSelector: '[data-pipeline-stage="clear-to-close"]',
    watch: "The lender saves the updated underwriting decision record.",
  },
  {
    id: "esign",
    scene: CLOSE,
    title: "eSign the closing documents",
    body: "The eClosing platform saves a closing record and an eNote reference in Alex's pod. Signing and eNote custody are simulated.",
    path: "/closing",
    action: { label: "eSign closing documents" },
    doneText: "Closing record saved in Alex's pod",
    watch: "The closing platform saves the closing record and sets its permissions.",
  },
  {
    id: "grant-servicer",
    scene: CLOSE,
    title: "Grant the servicer access",
    body: "Servicing-transfer notices are simulated. Separately, Alex gives the new servicer read access to the closing record, with a consent receipt.",
    path: "/closing",
    action: { label: "Grant servicer access" },
    doneText: "Servicer read access granted",
    watch: "The permission list on the closing record adds the servicer.",
  },
  {
    id: "revoke-lender",
    scene: CLOSE,
    title: "Revoke the lender's access",
    body: "Alex removes the lender's permission to read the closing record. Copies the lender already holds are not affected.",
    path: "/closing",
    action: { label: "Revoke lender access" },
    doneText: "Lender read access revoked",
    watch: "The permission list on the closing record removes the primary lender.",
  },
  {
    id: "vault-ledger",
    scene: CLOSE,
    title: "Alex's access history",
    body: "Data Vault reads each consent receipt from the pod: the AUS access, the servicer grant and the lender revocation.",
    path: "/wallet/ledger",
    doneSelector: "[data-ledger-list]",
  },
  {
    id: "done",
    scene: "End of the tour",
    title: "Explore on your own",
    body: "Each app works outside the tour. Open one from the app launcher, or restart the tour from the overview.",
    path: "/apps",
  },
];
