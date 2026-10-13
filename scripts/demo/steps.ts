/**
 * The guided click-through: one entry per page the visitor lands on, in journey order
 * (the five SPEC §2 scenes, the same order `e2e/journey.spec.ts` drives). The overlay
 * (`overlay/overlay.js`) renders the current step, highlights its button, and can press
 * it for the visitor ("Do it for me"). Every step is a real click in a real app — the
 * overlay never fakes an outcome.
 */
export interface GuidedStep {
  readonly id: string;
  /** Scene heading shown above the step title. */
  readonly scene: string;
  readonly title: string;
  /** What is happening and why it matters (plain language, 1–3 sentences). */
  readonly body: string;
  /** The page this step happens on (gateway path). */
  readonly path: string;
  /** The button the visitor should press, by its visible name. */
  readonly action?: { readonly label: string; readonly selector?: string };
  /** The step is complete once this selector matches… */
  readonly doneSelector?: string;
  /** …or this text appears on the page. */
  readonly doneText?: string;
  /** What to look for in the pod activity panel afterwards. */
  readonly watch?: string;
}

export const GUIDED_STEPS: readonly GuidedStep[] = [
  {
    id: "welcome",
    scene: "Welcome",
    title: "Alex is buying a home",
    body: "You are Alex Rivera. Your mortgage data lives in your own Solid pod, and each organisation's app reads or writes it only as you allow. This tour moves through five scenes across seven apps, and signs you in to each one automatically with a demo account.",
    path: "/",
    watch:
      "Open the pod activity panel (bottom left) to see every read, write and access-rule change as it happens.",
  },
  {
    id: "vault",
    scene: "Scene 1 · Fill the vault",
    title: "Your Data Vault",
    body: "The vault is your view of your pod. The profile below is read live from it, not from a database the vault owns.",
    path: "/wallet",
    doneSelector: "[data-vault-ready]",
    watch: "The activity panel shows the vault reading your profile from the pod.",
  },
  {
    id: "vault-credentials",
    scene: "Scene 1 · Fill the vault",
    title: "Verified once, reused everywhere",
    body: "Each card is a signed verifiable credential stored in your pod, re-verified every time it is opened. Four are already there; the assets verification is still missing.",
    path: "/wallet/credentials",
    watch: "Each credential read is followed by reads of its issuer document and status list.",
  },
  {
    id: "issue-assets",
    scene: "Scene 1 · Fill the vault",
    title: "Get your assets verified",
    body: "The account-data aggregator checks your bank balance and signs a credential straight into your pod. Any lender can reuse it later, so you never upload a bank statement again.",
    path: "/verifications/assets",
    action: { label: "Issue credential" },
    doneSelector: '[data-panel-outcome="ok"]',
    watch: "Look for the write of the bank assets credential, made by Verification Services.",
  },
  {
    id: "vault-assets",
    scene: "Scene 1 · Fill the vault",
    title: "The new credential is in your vault",
    body: "Assets now shows as valid. The aggregator wrote it into your pod; the vault simply reads it.",
    path: "/wallet/credentials",
  },
  {
    id: "prequal",
    scene: "Scene 2 · Shop without undressing",
    title: "Prove you qualify, without showing your numbers",
    body: "Your browser builds zero-knowledge proofs that your income is at least $7,000 a month and your credit score at least 620, then sends them to two competing lenders. Neither lender learns the actual figures, and no credit pull happens.",
    path: "/wallet/prequal",
    action: { label: "Prove income ≥ threshold and score ≥ 620", selector: "[data-prequal-run]" },
    doneSelector: '[data-prequal-lender="lender-53"] [data-prequal-outcome]',
    watch:
      "Only the two operand anchors and credentials are read from your pod; the proofs go to the lenders, the values never do.",
  },
  {
    id: "lender-53",
    scene: "Scene 2 · Shop without undressing",
    title: "The competing lender's side",
    body: "This is the second lender's app. It received a proof and returned a rate quote, without ever seeing your income or score.",
    path: "/lender-53",
  },
  {
    id: "application",
    scene: "Scene 3 · One-click application",
    title: "Apply with what is already in your pod",
    body: "The lender prefills the loan application from your pod and your credentials, then writes its Loan Estimate back into your pod so you keep a copy.",
    path: "/lender-boa/application",
    action: { label: "Submit application (demo)" },
    doneSelector: "[data-loan-estimate]",
    watch: "Reads of your profile and credentials, then a write of the Loan Estimate.",
  },
  {
    id: "underwriting",
    scene: "Scene 3 · One-click application",
    title: "Automated underwriting decides from your data",
    body: "The underwriting service reads the loan file and credentials you granted, checks every signature, and records its decision in your pod.",
    path: "/gse/underwriting",
    action: { label: "Run automated underwriting" },
    doneSelector: "[data-aus-result]",
    watch: "The underwriting service's own identity reads the loan file and writes the decision.",
  },
  {
    id: "appraisal",
    scene: "Scene 3 · One-click application",
    title: "Property services: the appraisal",
    body: "The appraisal arrives as a signed credential in your pod, so the lender and underwriter verify it instead of re-ordering it.",
    path: "/property/appraisal",
    doneSelector: "[data-appraised-value]",
  },
  {
    id: "title",
    scene: "Scene 3 · One-click application",
    title: "Property services: title",
    body: "The title search result is another reusable credential in your pod.",
    path: "/property/title",
    doneSelector: "[data-title-status]",
  },
  {
    id: "freshness",
    scene: "Scene 4 · Nothing goes stale",
    title: "Is the employment check still fresh?",
    body: "Lenders must re-verify employment shortly before closing. The lender checks the credential's validity window in your pod and finds it is about to expire.",
    path: "/lender-boa/freshness",
    action: { label: "Run freshness check" },
    doneSelector: "[data-freshness-result]",
  },
  {
    id: "reissue",
    scene: "Scene 4 · Nothing goes stale",
    title: "One-click re-issue instead of a phone call",
    body: "The employment verifier re-issues the credential through the access you already granted, and revokes the old one on its status list.",
    path: "/verifications/employment",
    action: { label: "Re-issue (freshness)" },
    doneSelector: '[data-panel-outcome="ok"]',
    watch: "A new employment credential is written and the old one's status list entry is updated.",
  },
  {
    id: "esign",
    scene: "Scene 5 · Close and stay in control",
    title: "Sign the closing package",
    body: "The digital closing platform writes the closing record into your pod, so you hold the authoritative copy of your loan.",
    path: "/closing",
    action: { label: "eSign closing package" },
    doneText: "ClosingRecord written to Alex's pod",
    watch: "A write of the closing record and new access rules on it.",
  },
  {
    id: "grant-servicer",
    scene: "Scene 5 · Close and stay in control",
    title: "Give the new servicer access",
    body: "Your loan is being serviced by a new company. Approving it adds the servicer to the access rules on your closing record and writes a consent receipt.",
    path: "/closing",
    action: { label: "Approve servicer access" },
    doneText: "Servicer read access granted",
    watch: "An access-rule change granting the loan servicer Read.",
  },
  {
    id: "revoke-lender",
    scene: "Scene 5 · Close and stay in control",
    title: "Take the lender's access away",
    body: "The origination lender no longer needs your data. Revoking removes it from the access rules, and the change is receipted.",
    path: "/closing",
    action: { label: "Revoke lender access" },
    doneText: "Lender read access revoked",
    watch: "An access-rule change removing the primary lender.",
  },
  {
    id: "receipts",
    scene: "Scene 5 · Close and stay in control",
    title: "Every change is receipted",
    body: "The consent-receipt ledger in your pod records each grant and revocation, so you can always see who had access and when.",
    path: "/closing",
    action: { label: "Read consent-receipt ledger" },
    doneSelector: "[data-receipt-card]",
  },
  {
    id: "vault-grants",
    scene: "Scene 5 · Close and stay in control",
    title: "Manage access from your vault",
    body: "The vault lists every organisation that could reach your mortgage folder. Grant the underwriting service read access: the vault writes a new access rule into your pod and a consent receipt. You could revoke it here just as easily.",
    path: "/wallet/grants",
    action: { label: "Grant access", selector: '[data-grant-action="grant-gse"]' },
    doneSelector: '[data-grant-party="gse"][data-grant-state="granted"]',
    watch: "An access-rule change on the mortgage folder, made by you in the browser.",
  },
  {
    id: "vault-ledger",
    scene: "Scene 5 · Close and stay in control",
    title: "Your own record of who had access",
    body: "The vault's ledger reads every consent receipt from your pod: the vault's grant you just made, as well as the closing platform's grant and revocation.",
    path: "/wallet/ledger",
  },
  {
    id: "done",
    scene: "That's the journey",
    title: "Now explore on your own",
    body: "Every app keeps working outside the tour. Open the app launcher to try any of them directly, or restart the tour from the demo controls.",
    path: "/apps",
  },
];
