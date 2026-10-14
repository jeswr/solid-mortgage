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
  /**
   * Shown once a step without an action finds its `doneSelector`, so the guide confirms the
   * specific state (for example "Asset verification found.") rather than a page load.
   */
  readonly doneMessage?: string;
  /** Links shown on the card (a step with links usually has no `action`). */
  readonly links?: readonly GuidedLink[];
  /** What to look for in the pod activity panel afterwards (shown under "Details"). */
  readonly watch?: string;
}

export interface GuidedLink {
  readonly label: string;
  /** A gateway path ("/apps") or an absolute https URL (opened in a new tab). */
  readonly href: string;
  readonly primary?: boolean;
}

/**
 * Where "Discuss a pilot" points. Keep in step with `copContactUrl` in apps/tour/app/site.ts.
 */
export const PILOT_CONTACT_URL = "https://edma-microsite.vercel.app/";

const VERIFY = "1 · Verify income, assets and credit";
const PREQUALIFY = "2 · Check prequalification criteria";
const APPLY = "3 · Apply with data from the pod";
const REVERIFY = "4 · Check the employment credential";
const CLOSE = "5 · Close the loan and transfer servicing";

export const GUIDED_STEPS: readonly GuidedStep[] = [
  {
    id: "welcome",
    scene: "Welcome",
    title: "Alex is buying a home",
    body: "Alex's mortgage data is in a Solid pod: a personal data store Alex controls. Alex sets who may read it. Local requests run as Alex; separate organisation permissions are not enforced here.",
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
    body: "A credential is a signed verification record. Check each record's issuer, signature and dates. Look for the asset verification: the next step issues it.",
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
    body: "Open Credentials to check the saved asset verification. Data Vault reads the credential that the provider saved; it did not create it.",
    path: "/wallet/credentials",
    doneSelector: '[data-credential-kind="assets"] [data-credential-status="valid"]',
    doneMessage: "Asset verification found.",
  },
  {
    id: "assistant-shop",
    scene: PREQUALIFY,
    title: "Ask the assistant for rate quotes",
    body: "Allow the selected sources. The assistant proves that income is at least $7,000 a month and the credit score is 620 or higher (demo thresholds). Exact figures are not sent directly to the lenders.",
    path: "/wallet/assistant",
    action: { label: "Allow selected sources", selector: "[data-consent-allow]" },
    doneSelector: "[data-agent-quotes]",
    watch: "The assistant reads only Alex's income and credit-score credentials from the pod.",
  },
  {
    id: "assistant-shop-apply",
    scene: PREQUALIFY,
    title: "Compare two illustrative quotes",
    body: "Each lender says whether Alex meets its prequalification criteria and shows an illustrative quote, not an offer. Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before choosing a loan.",
    path: "/wallet/assistant",
    action: { label: "Continue with primary lender", selector: '[data-agent-reply="apply"]' },
    doneSelector: "[data-agent-done]",
  },
  {
    id: "lender-53",
    scene: PREQUALIFY,
    title: "The second lender's view",
    body: "The second lender checks a new proof derived from the same credentials. This page shows its prequalification criteria.",
    path: "/lender-53",
  },
  {
    id: "assistant-apply",
    scene: APPLY,
    title: "Prefill the application",
    body: "The lender's assistant asks which sources it may read. Allow the selected sources, and it prefills the application from Alex's pod. Demo rent receipts are optional.",
    path: "/lender-boa/assistant",
    action: { label: "Allow selected sources", selector: "[data-consent-allow]" },
    doneSelector: "[data-agent-review]",
    watch: "The lender reads Alex's profile and each credential from the pod.",
  },
  {
    id: "assistant-submit",
    scene: APPLY,
    title: "Review and submit",
    body: "Review the demo application, then submit it. The lender saves the application and shows illustrative loan terms.",
    path: "/lender-boa/assistant",
    action: { label: "Submit application", selector: '[data-agent-reply="submit"]' },
    doneSelector: "[data-agent-done]",
    watch: "The lender saves the application and a simulated underwriting decision record.",
  },
  {
    id: "pipeline-review",
    scene: APPLY,
    title: "The loan officer's view",
    body: "The pipeline reads Alex's loan file from the pod; nobody uploads documents. It shows the AUS recommendation, the underwriter decision and the closing status separately.",
    path: "/lender-boa/pipeline",
    doneSelector: "[data-pipeline-file]",
    watch: "The lender reads the application from Alex's pod to build this list.",
  },
  {
    id: "vault-grants",
    scene: APPLY,
    title: "Give the AUS access",
    body: "Before underwriting, Alex gives the automated underwriting system (AUS) read access to the loan file. Data Vault saves the permission and a consent receipt. Local requests run as Alex; separate organisation permissions are not enforced here.",
    path: "/wallet/grants",
    action: { label: "Grant access", selector: '[data-grant-action="grant-gse"]' },
    doneSelector: '[data-grant-party="gse"][data-grant-state="granted"]',
    watch: "Alex changes the permission list on the mortgage folder from the browser.",
  },
  {
    id: "underwriting",
    scene: APPLY,
    title: "Run automated underwriting",
    body: "The AUS checks each credential and the loan file, then returns an AUS recommendation. The lender's underwriter makes the credit decision.",
    path: "/gse/underwriting",
    action: { label: "Run AUS", selector: "[data-aus-console] > button" },
    doneSelector: "[data-aus-result]",
    watch: "Watch the AUS app request the loan file. Local requests run as Alex.",
  },
  {
    id: "appraisal",
    scene: APPLY,
    title: "Appraisal preview",
    body: "Preview the simulated appraisal. Select 'Issue demo credential' to save it.",
    path: "/property/appraisal",
    doneSelector: "[data-appraised-value]",
  },
  {
    id: "title",
    scene: APPLY,
    title: "Title search preview",
    body: "Preview the simulated title search result. Select 'Issue demo credential' to save it. It is not a title commitment or policy.",
    path: "/property/title",
    doneSelector: "[data-title-status]",
  },
  {
    id: "freshness",
    scene: REVERIFY,
    title: "Check the employment credential",
    body: "Check its signature, status and validity period. This demo does not reconfirm employment with an employer.",
    path: "/lender-boa/freshness",
    action: { label: "Check credential validity", selector: "[data-freshness-panel] > button" },
    doneSelector: "[data-freshness-result]",
  },
  {
    id: "reissue",
    scene: REVERIFY,
    title: "Issue a replacement demo credential",
    body: "The employment verification provider issues a replacement with the same simulated data and new dates. It revokes the previous credential on its status list. This is not employment re-verification.",
    path: "/verifications/employment",
    action: { label: "Issue replacement credential" },
    doneSelector: '[data-panel-outcome="ok"]',
    watch: "Verification Services saves the replacement credential and updates the status list.",
  },
  {
    id: "clear-to-close",
    scene: REVERIFY,
    title: "Mark the loan clear to close",
    body: "The underwriter marks the employment condition satisfied: a simulated decision. The lender then sets the closing status to clear to close and saves it in Alex's pod.",
    path: "/lender-boa/pipeline",
    action: { label: "Mark clear to close", selector: '[data-pipeline-action="clear-to-close"]' },
    doneSelector: '[data-pipeline-stage="clear-to-close"]',
    watch: "The lender saves the updated underwriting decision record.",
  },
  {
    id: "esign",
    scene: CLOSE,
    title: "Simulate closing",
    body: "Review the sample loan summary, then simulate signing. The eClosing platform saves a demo closing record and an eNote reference in Alex's pod. eNote custody is simulated.",
    path: "/closing",
    action: { label: "Simulate signing" },
    doneText: "Simulated signing complete",
    watch: "The closing platform saves the closing record and sets its permissions.",
  },
  {
    id: "grant-servicer",
    scene: CLOSE,
    title: "Grant the servicer access",
    body: "Servicing-transfer notices are simulated. Separately, Alex gives the new servicer read access to the closing record, with a consent receipt. Local requests run as Alex; separate organisation permissions are not enforced here.",
    path: "/closing",
    action: { label: "Grant servicer access" },
    doneText: "Servicer read access granted",
    watch: "The permission list on the closing record adds the servicer.",
  },
  {
    id: "revoke-lender",
    scene: CLOSE,
    title: "Remove lender access to the closing record",
    body: "Alex removes the lender's permission to read the closing record. Copies the lender already holds are not affected.",
    path: "/closing",
    action: { label: "Remove lender access to closing record" },
    doneText: "Lender access to closing record removed",
    watch: "The permission list on the closing record removes the primary lender.",
  },
  {
    id: "vault-ledger",
    scene: CLOSE,
    title: "Alex's access history",
    body: "Data Vault reads each consent receipt from the pod: the AUS access, the servicer access and the removed lender access.",
    path: "/wallet/ledger",
    doneSelector: "[data-ledger-list]",
  },
  {
    id: "done",
    scene: "End of the tour",
    title: "Discuss a mortgage-data pilot",
    body: "Join the EDMA Solid Community of Practice to test verification reuse, permissioned access and audit records with your organisation.",
    path: "/",
    links: [
      { label: "Discuss a pilot", href: PILOT_CONTACT_URL, primary: true },
      { label: "Explore the apps", href: "/apps" },
    ],
  },
];
