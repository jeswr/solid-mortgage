// AUTHORED-BY Claude Opus 5.5
/**
 * The mortgage demo told before it is shown (`/welcome/story/mortgage`): what happens, in six
 * stages, then the same journey through each party's eyes. The facts are the ones the narration
 * states (video/mortgage/narration.md); organisation names come from content/orgs.ts.
 */

export interface StoryStage {
  title: string;
  text: string;
}

export interface Perspective {
  /** Who: a person or an organisation from content/orgs.ts. */
  name: string;
  /** Their part in the journey, in industry terms. */
  role: string;
  did: string;
  saw: string;
  neverSaw: string;
}

export const MORTGAGE_STAGES: readonly StoryStage[] = [
  {
    title: "Getting ready",
    text: "Payroll, bank and credit bureau each write one signed credential to Alex's pod.",
  },
  {
    title: "Shopping",
    text: "Two lenders pre-qualify Alex from a proof that answers yes or no, without seeing the figures.",
  },
  {
    title: "Applying",
    text: "Alex grants Juniper Home Loans access. The application fills itself in from the pod, and the Loan Estimate arrives there.",
  },
  {
    title: "Processing",
    text: "The appraiser, title company and insurer each read only what their job needs, and write their results back to the pod.",
  },
  {
    title: "Closing",
    text: "The Closing Disclosure and the signed documents go to the pod. The county records the deed in its public land records.",
  },
  {
    title: "After closing",
    text: "The loan is sold, a new servicer reads three things, and Alex withdraws the original lender's access.",
  },
];

export const MORTGAGE_PERSPECTIVES: readonly Perspective[] = [
  {
    name: "Alex Rivera",
    role: "Borrower, using the Cairn wallet",
    did: "Approved each request after seeing what it asked for, why and until when. Withdrew the original lender's access at the end.",
    saw: "Every read, write and grant on their own data, as it happened.",
    neverSaw:
      "A document to upload or a form to re-type. Every record stayed in Alex's pod as the single copy.",
  },
  {
    name: "Juniper Home Loans",
    role: "Lender: loan officer, processor, underwriter and closer",
    did: "Took the application, ordered the appraisal and title work, and issued the Loan Estimate and Closing Disclosure.",
    saw: "The records Alex granted, for this loan, until the loan was sold. It checked each credential's signature.",
    neverSaw: "Anything after Alex withdrew access. It keeps only the loan file the law requires.",
  },
  {
    name: "Copperfield Mortgage",
    role: "Competing lender, pre-qualification only",
    did: "Asked two questions: is income at least $7,000 a month, and is the credit score at least 620?",
    saw: "Two yes-or-no answers, and who vouches for them.",
    neverSaw: "Alex's income, credit score or any document.",
  },
  {
    name: "Castellan Housing Finance",
    role: "Investor: automated underwriting and loan purchase",
    did: "Ran automated underwriting, then bought the loan.",
    saw: "Three credentials, read at source, each signature checked.",
    neverSaw: "Copies passed along by the lender.",
  },
  {
    name: "Plumbline Valuation",
    role: "Appraisal management company and appraiser",
    did: "Valued the property, assigned independently of the lender's sales staff.",
    saw: "The property record and the purchase contract.",
    neverSaw: "Alex's income, savings or credit.",
  },
  {
    name: "Sextant Title & Escrow",
    role: "Title and settlement agent",
    did: "Wrote the title commitment to the pod and ran the signing.",
    saw: "A name and the purchase contract.",
    neverSaw: "Alex's finances.",
  },
  {
    name: "Wrenfield Mutual",
    role: "Homeowner's insurer",
    did: "Quoted, then wrote evidence of insurance once for the lender to read.",
    saw: "Property facts already in the pod.",
    neverSaw: "Alex's income or credit.",
  },
  {
    name: "Marigold Loan Servicing",
    role: "Servicer after the sale",
    did: "Took over collecting the payments.",
    saw: "Contact details, the insurance policy and a payment account.",
    neverSaw: "The underwriting file.",
  },
];
