// AUTHORED-BY Claude Opus 5.5
/**
 * Every demo the welcome page lists, in page order (flows.md §1 and §9: the mortgage first, then
 * one year in one family's pods, then the business and lending demos). This file is the only
 * place a demo is described: the cards, the watch pages, the chapter lists and the transcripts
 * all read it, so adding a demo or switching one to `live` is a data edit here.
 *
 * Chapters and transcripts are the narration in docs/rebuild/video-scripts.md (one chapter per
 * `## Title {#id}` scene). Only live demos carry their transcript; a coming demo lists its
 * chapter titles so its card can say what it will cover.
 *
 * Media lives at the site root under `/video/<id>/`, assembled from video/dist by
 * tools/build-site.mjs. Until a recording exists the player shows "Video coming soon".
 */
import type { AppSlug } from "@mortgage/demo-kit/registry";

export type Sector = "Finance" | "Insurance" | "Government" | "Healthcare";

/** `live`: the tour can be run and the video is (or will be) published. `coming`: announced only. */
export type DemoStatus = "live" | "coming";

export interface DemoChapter {
  /** The scene id from video-scripts.md; also the chapters.vtt cue id and the transcript anchor. */
  id: string;
  title: string;
  /**
   * Start time in seconds. Optional: when absent, the player reads the start from the
   * chapters.vtt cue with the same id (or the same position).
   */
  start?: number;
  /** Narration, one paragraph per clip. Empty for a demo that is not live yet. */
  transcript: readonly string[];
}

export interface DemoMedia {
  /** H.264 MP4 with narration. */
  video: string;
  /** WebVTT captions (English). */
  captions: string;
  /** WebVTT chapter cues, one per chapter, cue ids equal to chapter ids. */
  chapters: string;
  /** Poster frame shown before playback. */
  poster: string;
}

/**
 * Where "Try it yourself" starts the guided tour: `appUrl(app, path, { tour: demo, step })`, the
 * app and route of the tour's first step.
 */
export interface DemoTour {
  demo: string;
  app: AppSlug;
  path: string;
  step: string;
}

export interface Demo {
  /** URL segment (`/welcome/watch/<id>`) and video folder (`/video/<id>/`). */
  id: string;
  /** Card title. */
  title: string;
  /** The video's own title (video-scripts.md front matter). */
  videoTitle: string;
  /** One sentence for the card. */
  sentence: string;
  sectors: readonly Sector[];
  /** Video length in seconds (the script's target until the recording exists). */
  durationSeconds: number;
  status: DemoStatus;
  media: DemoMedia;
  tour?: DemoTour;
  chapters: readonly DemoChapter[];
}

/** The four files a demo's recording publishes under `/video/<id>/`. */
export function mediaFor(id: string): DemoMedia {
  const base = `/video/${id}/`;
  return {
    video: `${base}video.mp4`,
    captions: `${base}captions.vtt`,
    chapters: `${base}chapters.vtt`,
    poster: `${base}poster.jpg`,
  };
}

export const DEMOS: readonly Demo[] = [
  {
    id: "mortgage",
    title: "Buying a home",
    videoTitle: "A mortgage on Solid: thirteen applications, one pod",
    sentence:
      "From first enquiry to first payment, twelve organisations ask the borrower's pod for what they need, and nobody uploads a document.",
    sectors: ["Finance", "Insurance"],
    durationSeconds: 290,
    status: "live",
    media: mediaFor("mortgage"),
    // Step 1 of content/mortgage/tour.ts: the Start button on this page (`tour-start`).
    tour: { demo: "mortgage", app: "welcome", path: "", step: "welcome" },
    chapters: [
      {
        id: "intro",
        title: "Thirteen applications, one pod",
        transcript: [
          "This is a mortgage, from the first enquiry to the first payment, rebuilt on Solid. Twelve organisations take part. All of them are fictional, and each has its own application.",
          "Today, each of those organisations collects its own copy of the borrower's documents. Here the borrower, Alex, keeps the data in a pod, and each organisation asks for the part it needs.",
          "The panel on the right is the Solid Lens. It shows every read, every write and every permission as it happens.",
        ],
      },
      {
        id: "ready",
        title: "Getting ready",
        transcript: [
          "Alex starts with the payroll provider their employer uses.",
          "It signs a statement of employment and income, and writes it to the pod as a verifiable credential.",
          "The bank does the same for savings.",
          "And the credit bureau, for a credit summary. Three issuers, one place, and each record can be checked later without calling the issuer.",
        ],
      },
      {
        id: "shop",
        title: "Shopping without handing over data",
        transcript: [
          "Now Alex shops around. Two lenders ask the same thing: is income at least seven thousand dollars a month, and is the credit score at least six hundred and twenty?",
          "The wallet answers with a proof. Each lender learns yes or no, and nothing else.",
          "This is everything the second lender holds: an answer, and who vouches for it.",
        ],
      },
      {
        id: "apply",
        title: "Applying",
        transcript: [
          "Alex's offer on a house is accepted, so it is time to apply. The lender asks for access, and the wallet shows what is being asked: which records, for what purpose, until when, and who else will see them.",
          "Approving creates a grant. You can see it appear in the Lens.",
          "The application fills itself in from the pod. Every field shows where it came from.",
          "Once the lender has six key items, US rules give it three business days to send a Loan Estimate.",
          "On the lender's side, the loan officer pulls a credit report and runs automated underwriting. The lender's own credit report does not come from the pod, and the Lens says so.",
          "The underwriting service reads three credentials at source, and checks each signature.",
          "The Loan Estimate arrives in the pod the next day, and Alex confirms they want to go ahead.",
        ],
      },
      {
        id: "processing",
        title: "Processing",
        transcript: [
          "The processor orders an appraisal, a title search, a flood check and tax transcripts.",
          "The appraiser is assigned independently of the lender's sales staff. They read the property record and the purchase contract.",
          "They never see Alex's income, savings or credit.",
          "The title company reads a name and a contract, and writes its commitment to the pod.",
          "The insurer quotes from property facts already in the pod, and writes evidence of insurance once, for the lender to read.",
          "A month on, the lender must check employment again, within ten business days of closing.",
          "That is a fresh credential from the payroll provider, not a phone call. The loan is clear to close.",
        ],
      },
      {
        id: "closing",
        title: "Closing",
        transcript: [
          "The Closing Disclosure lands in the pod. Three business days must pass before signing.",
          "At the title company, Alex signs. Signed copies go to the pod.",
          "The deed is recorded with the county. Solid plays no part here, because land records are public. The Lens says that too.",
        ],
      },
      {
        id: "after",
        title: "After closing",
        transcript: [
          "The lender sells the loan. That is between organisations, but the notice to Alex arrives in the pod.",
          "A new company will collect the payments. It asks for three things: contact details, the insurance policy, and a payment account.",
          "The original lender no longer needs Alex's live data.",
          "So Alex withdraws its access.",
          "When the lender tries to read the bank data again, the pod refuses. The lender keeps the loan file the law requires it to keep. What has ended is its access to Alex's data at source.",
        ],
      },
      {
        id: "ledger",
        title: "The whole journey",
        transcript: [
          "This is the whole journey on one page: every organisation, every record, every grant, and what each one never saw.",
          "Thirteen applications. Eight grants. No documents uploaded.",
          "Everything you saw ran in a browser, on open standards. Try it yourself from the welcome page, or join the EDMA Solid Community of Practice. We meet every week.",
        ],
      },
    ],
  },
  {
    id: "moving-house",
    title: "Moving house",
    videoTitle: "Moving house: tell everyone once",
    sentence:
      "One address in the pod, changed once: six organisations read it under standing grants, and the one that loses access sees the refusal.",
    sectors: ["Government"],
    durationSeconds: 180,
    status: "live",
    media: mediaFor("moving-house"),
    // Step 1 of content/moving-house/tour.ts: the address record in Alex's wallet.
    tour: { demo: "moving-house", app: "wallet", path: "moving", step: "address" },
    chapters: [
      {
        id: "intro",
        title: "One address",
        transcript: [
          "Alex has just bought a house. Now six organisations need the new address: the state, the county, the bank, the insurer, the employer's payroll, and the mortgage servicer.",
          "Usually that is six forms, and six copies of an address that slowly drift apart.",
          "In Alex's pod there is one address. It is described the way a data team would describe a data product: one owner, a stated purpose, and a list of consumers.",
        ],
      },
      {
        id: "change",
        title: "Change it once",
        transcript: [
          "Alex changes it once. The proof of address is already in the pod: the deed recorded at closing.",
          "Then Alex chooses who should know.",
          "Six standing grants, all to the same record, each for one purpose: keeping the address current.",
        ],
      },
      {
        id: "read",
        title: "Everyone reads the same record",
        transcript: [
          "The state's driver services reads the address and its evidence.",
          "It issues a new licence credential, and withdraws the old one.",
          "The county treasurer reads it, so tax bills go to the right house.",
          "The insurer reads it, and the car policy follows Alex to the new address.",
          "The bank, the payroll provider and the servicer read the same record. Six readers, one copy, no forms.",
        ],
      },
      {
        id: "revoke",
        title: "Taking one away",
        transcript: [
          "Alex is closing the old bank account, so the bank no longer needs to know.",
          "Its grant is withdrawn.",
          "A week later Alex corrects the unit number. Five organisations pick up the correction. The bank asks, and the pod refuses.",
          "The bank's copy is now out of date, and it knows it is. That is the difference between holding a copy and reading the source.",
        ],
      },
      {
        id: "ledger",
        title: "One record, six organisations",
        transcript: [
          "One record. Six organisations. Eleven reads. Every one of them is listed here with the grant that allowed it.",
          "This is the same pod that carried Alex's mortgage. To build the next sector with us, join the EDMA Solid Community of Practice.",
        ],
      },
    ],
  },
  {
    id: "medication-handover",
    title: "Medication handover",
    videoTitle: "One medication list, from ward to pharmacy to practice",
    sentence:
      "A hospital, a pharmacy and a family practice work from one medication list in the patient's pod, with provenance on every change.",
    sectors: ["Healthcare"],
    durationSeconds: 190,
    status: "coming",
    media: mediaFor("medication-handover"),
    chapters: [
      {
        id: "intro",
        title: "Leaving hospital",
        transcript: [],
      },
      {
        id: "discharge",
        title: "Written once",
        transcript: [],
      },
      {
        id: "grants",
        title: "Three grants, three scopes",
        transcript: [],
      },
      {
        id: "pharmacy",
        title: "The pharmacy",
        transcript: [],
      },
      {
        id: "practice",
        title: "The practice",
        transcript: [],
      },
      {
        id: "revoke",
        title: "Changing pharmacy",
        transcript: [],
      },
      {
        id: "ledger",
        title: "One list",
        transcript: [],
      },
    ],
  },
  {
    id: "motor-claim",
    title: "Motor claim",
    videoTitle: "A motor claim where everyone sees only their part",
    sentence:
      "The claimant holds the claim file; the insurer and the repairer each see only their part, and access ends with the job.",
    sectors: ["Insurance"],
    durationSeconds: 180,
    status: "coming",
    media: mediaFor("motor-claim"),
    chapters: [
      {
        id: "intro",
        title: "A bump in a car park",
        transcript: [],
      },
      {
        id: "insurer",
        title: "The insurer",
        transcript: [],
      },
      {
        id: "repairer",
        title: "The repairer",
        transcript: [],
      },
      {
        id: "revoke",
        title: "When the job ends, so does the access",
        transcript: [],
      },
    ],
  },
  {
    id: "business-kyb",
    title: "Business KYB with an LEI",
    videoTitle: "Know your business, once",
    sentence:
      "A business's identity, officers and owners are issued once as credentials; two banks rely on them, and a proof answers the 25% ownership test without the cap table.",
    sectors: ["Finance"],
    durationSeconds: 220,
    status: "live",
    media: mediaFor("business-kyb"),
    // Step 1 of content/business-kyb/tour.ts: Northwind's credentials drawer in the wallet.
    tour: { demo: "business-kyb", app: "wallet", path: "kyb", step: "vault" },
    chapters: [
      {
        id: "intro",
        title: "A business has a pod too",
        transcript: [
          "Northwind Logistics is a small freight company. It wants a bank account and a credit line. Both banks must know who the business is, and who owns it.",
          "Today that means sending the same formation documents and ownership chart to each bank, and sending them again when anything changes.",
          "Here, Northwind has a pod. It starts empty.",
        ],
      },
      {
        id: "issue",
        title: "Issued once",
        transcript: [
          "A registry issues the company's identity, with its legal entity identifier. The identifier in this demo is illustrative, and is not a real one.",
          "It states who may act for the company.",
          "And it records the four owners and their shares. The full ownership table now sits in Northwind's pod, and nowhere else.",
        ],
      },
      {
        id: "onboard",
        title: "Onboarding from the pod",
        transcript: [
          "The first bank asks to read the identity and the ownership record, for customer due diligence. Northwind's managing member approves.",
          "The bank runs the check the rule requires: every owner with a quarter or more, and the person in control. It reads signed data, checks each signature, and opens the account.",
        ],
      },
      {
        id: "prove",
        title: "Proving without disclosing",
        transcript: [
          "The second bank is only quoting for a credit line. It does not need the ownership table yet. It needs one answer: is there any owner above a quarter that we have not been told about?",
          "Northwind answers with a proof. The bank learns the answer, and not the shares.",
          "Once the bank decides to lend, the rule needs the real values. So the proof gives way to a grant.",
        ],
      },
      {
        id: "fresh",
        title: "Nothing goes stale",
        transcript: [
          "One owner sells his stake. The registry issues a new ownership record and withdraws the old one.",
          "Both banks read the new record through the grants they already have. Nobody starts onboarding again.",
        ],
      },
      {
        id: "control",
        title: "Control and audit",
        transcript: [
          "Northwind closes its account at the first bank and withdraws the grant. The bank's next read is refused. It keeps the due diligence record it must keep. It can no longer refresh it.",
          "For a supervisor, the ledger lists each due diligence obligation beside the grant and the reads that met it.",
          "One set of credentials, two banks, no document packs. If your organisation issues or relies on business identity, we would like you in the Community of Practice.",
        ],
      },
    ],
  },
  {
    id: "small-dollar-lending",
    title: "Small-dollar lending",
    videoTitle: "A small loan, the same afternoon",
    sentence:
      "Income, cash flow and a credit summary arrive as credentials; two lenders quote from a proof, and the chosen one reads under a 30-day grant.",
    sectors: ["Finance"],
    durationSeconds: 220,
    status: "live",
    media: mediaFor("small-dollar-lending"),
    // Step 1 of content/small-dollar-lending/tour.ts: Maya's empty pod, in her wallet.
    tour: { demo: "small-dollar-lending", app: "wallet", path: "lending", step: "vault" },
    chapters: [
      {
        id: "intro",
        title: "Two thousand dollars, this week",
        transcript: [
          "Maya's car has broken down, and she needs two thousand dollars to fix it. Her credit file is thin. Her income and her bank account tell a better story.",
          "Maya has a pod. It is empty.",
        ],
      },
      {
        id: "fill",
        title: "Filling it",
        transcript: [
          "An identity service checks who she is, once, and gives her a credential.",
          "Her employer's payroll provider states her income. This is the same application you saw in the mortgage demo, issuing to a different person.",
          "Her bank summarises her account: regular deposits, and no returned payments in ninety days.",
          "And the credit bureau adds its view: a score of six hundred and twelve, from a short history.",
        ],
      },
      {
        id: "shop",
        title: "Two quotes, nothing handed over",
        transcript: [
          "Maya asks two lenders for a quote. Each receives a proof that she clears its thresholds. Neither receives her name, her income or her transactions.",
        ],
      },
      {
        id: "decide",
        title: "One decision, two models",
        transcript: [
          "She picks one and applies. The lender is granted her identity, income and cash-flow records for thirty days, and the consent is recorded before the first read.",
          "The lender shows both ways of deciding. On the credit score alone, she is declined. With cash flow as well, she is approved.",
          "The loan disclosure is written to her pod. It is hers to keep.",
          "The bank that looked only at the score sends its decline, with reasons, to the same place.",
        ],
      },
      {
        id: "payout",
        title: "Paid out",
        transcript: [
          "A payment service sends the money to her card. It is granted one record, once: where to pay. It sees nothing else.",
        ],
      },
      {
        id: "repay",
        title: "Repaying, and leaving",
        transcript: [
          "Each payment made on time is added to a repayment credential in her pod, and reported to the bureau. The thin file gets thicker.",
          "When the loan is paid off, Maya withdraws the lender's access.",
          "The lender asks for her bank data again, and the pod refuses.",
          "Five issuers, two lenders, one payment service. The next time Maya applies for anything, the pod is already full.",
          "Try it from the welcome page, or join us at the EDMA Solid Community of Practice.",
        ],
      },
    ],
  },
  {
    id: "small-business-loan",
    title: "Small business loan",
    videoTitle: "A business loan from live data",
    sentence:
      "Twelve months of cash flow kept current in the business's pod by its bank, and covenant monitoring as a standing quarterly read.",
    sectors: ["Finance"],
    durationSeconds: 180,
    status: "coming",
    media: mediaFor("small-business-loan"),
    chapters: [
      {
        id: "intro",
        title: "Borrowing to grow",
        transcript: [],
      },
      {
        id: "source",
        title: "Data from the source",
        transcript: [],
      },
      {
        id: "apply",
        title: "The application",
        transcript: [],
      },
      {
        id: "monitor",
        title: "A standing grant",
        transcript: [],
      },
      {
        id: "revoke",
        title: "Repaid",
        transcript: [],
      },
    ],
  },
  {
    id: "reusable-kyc",
    title: "Reusable KYC",
    videoTitle: "Verified once, accepted twice",
    sentence:
      "One bank states what it verified; a card issuer reads that attestation once, under a one-time grant, with no documents uploaded.",
    sectors: ["Finance"],
    durationSeconds: 170,
    status: "coming",
    media: mediaFor("reusable-kyc"),
    chapters: [
      {
        id: "intro",
        title: "The same checks, again",
        transcript: [],
      },
      {
        id: "attest",
        title: "What the bank can say",
        transcript: [],
      },
      {
        id: "apply",
        title: "One read",
        transcript: [],
      },
      {
        id: "revoke",
        title: "Used once",
        transcript: [],
      },
      {
        id: "ledger",
        title: "Two kinds of withdrawal",
        transcript: [],
      },
    ],
  },
];

/** The demo with this id, if any. */
export function demoById(id: string): Demo | undefined {
  return DEMOS.find((demo) => demo.id === id);
}
