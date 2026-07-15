/**
 * The five scene chapters (SPEC §2) as pure data, mirroring the presenter script in
 * docs/sales/master-narrative.md §4. Editorial limits are machine-enforced by
 * test/chapters.test.ts (showcase-patterns §1): word budgets per lead and step, a
 * "what just happened underneath" panel on scenes 1/2/4, and a try-this-live deep link
 * on every step.
 *
 * Lives under `app/` so `scripts/check-insignia.mjs` scans this copy (R2/R3).
 */
import type { DemoAppSlug } from "./services";

/** Hard editorial budgets — reads in well under a minute per step. */
export const MAX_LEAD_WORDS = 40;
export const MAX_STEP_WORDS = 65;

export function countWords(text: string): number {
  return text.split(/\s+/u).filter((word) => word.length > 0).length;
}

export interface TryLive {
  app: DemoAppSlug;
  label: string;
}

export interface ChapterStep {
  title: string;
  body: string;
  tryLive: TryLive;
}

export interface Chapter {
  slug: string;
  scene: 1 | 2 | 3 | 4 | 5;
  title: string;
  /** The regulation or industry anchor the scene dramatizes (SPEC §2). */
  anchor: string;
  lead: string;
  steps: ChapterStep[];
  /** Plain-English "what just happened underneath" — required for scenes 1, 2, and 4. */
  underneath?: string[];
}

/** Scenes that must carry the "what just happened underneath" panel (the VC/ZK beats). */
export const UNDERNEATH_REQUIRED_SCENES: ReadonlyArray<Chapter["scene"]> = [1, 2, 4];

export const chapters: Chapter[] = [
  {
    anchor:
      "The three issuer roles are the ones the GSEs already accept from digital verification suppliers.",
    lead: "Three verifiers issue Alex Rivera's employment, asset, and credit credentials straight into a Data Vault Alex controls. Issued once, reusable everywhere Alex chooses.",
    scene: 1,
    slug: "fill-the-vault",
    steps: [
      {
        body: "An issuer modelled on The Work Number — the employer-sourced verification role the GSEs already accept — signs an employment-and-income credential and delivers it to Alex's pod. Today that report lands only in a vendor database; here it lands in the borrower's own vault.",
        title: "Employment and income, attested",
        tryLive: { app: "verifications", label: "Open the issuer flows" },
      },
      {
        body: "A Finicity-modelled open-banking issuer attests Alex's asset balances the same way, and an Equifax-modelled bureau issues the credit-score credential. No statements are uploaded and re-uploaded; each attestation is signed once and stays under Alex's control.",
        title: "Assets and credit, from the source",
        tryLive: { app: "verifications", label: "Issue the remaining credentials" },
      },
      {
        body: "In the Data Vault the three credentials appear in Alex's credential store — access-controlled, revocable, ready to share with any party Alex chooses. A tri-merge credit report alone runs about $200 per pull today, billed again for every new party.",
        title: "Watch them arrive",
        tryLive: { app: "wallet", label: "Open the Data Vault" },
      },
    ],
    title: "Fill the vault",
    underneath: [
      "Each credential is a W3C Verifiable Credential 2.0 (JSON-LD), signed by its issuer and written into the pod's credentials container over the Solid protocol.",
      "Access control is Web Access Control on the pod: the issuer received a scoped write grant, and nobody can read a credential until Alex grants it.",
      "Credentials that participate in scene 2's proofs are dual-signed at issue time, so a zero-knowledge proof can later anchor to an issuer signature.",
    ],
  },
  {
    anchor: "Zero-knowledge proofs, deliberately scoped to pre-qualification only.",
    lead: "Alex shops two competing lenders and proves income of at least $7,000 a month and a credit score of at least 620 — without revealing a single underlying number. No credit pull happens.",
    scene: 2,
    slug: "shop-without-undressing",
    steps: [
      {
        body: "Alex presents one zero-knowledge proof to the origination portal modelled on Bank of America: monthly income is at least $7,000 and the credit score is at least 620. The lender learns “qualified” — nothing else. Pre-qualification today means handing full income and asset detail to every lender you shop.",
        title: "Prove the thresholds",
        tryLive: { app: "lender-boa", label: "Verify the proof at the primary lender" },
      },
      {
        body: "The thin pre-qual surface modelled on Fifth Third Bank verifies the same proof and returns its own illustrative quote. Two competing offers, and neither lender ever saw a number.",
        title: "Get a competing quote",
        tryLive: { app: "lender-53", label: "Get the competing quote" },
      },
      {
        body: "If Alex walks away, neither lender holds income or credit data to retain. Once Alex proceeds, the application honestly needs real figures — so the journey switches from proofs to granted access at that point, and says so on screen.",
        title: "Walk away clean",
        tryLive: { app: "wallet", label: "See what each party can access" },
      },
    ],
    title: "Shop without undressing",
    underneath: [
      "The proofs are Noir circuits verified with UltraHonk — integer threshold checks over the credential's scaled fields — proved live, in the visitor's own browser.",
      "A bare threshold proof would be forgeable, so every verification also checks an issuer-signed anchor credential before the lender accepts it. Some composed proofs are precomputed and labelled “proved offline · verified live”.",
      "Honesty panel, on every proving surface: the stack is research-grade, external audit pending. The claim is “the value is not disclosed and cannot be forged” — a low-entropy value like a credit score could still be enumerated by a determined verifier.",
    ],
  },
  {
    anchor: "TRID: the Loan Estimate must be delivered within 3 business days of application.",
    lead: "Alex picks a lender and grants scoped pod access. The application prefills from the pod, and the Loan Estimate lands back in it — inside the regulatory window, with a receipt.",
    scene: 3,
    slug: "one-click-application",
    steps: [
      {
        body: "From the Data Vault, Alex grants the chosen lender read access to named resources only — the profile and the three credentials, nothing more. Every grant writes a consent receipt to the ledger.",
        title: "Grant scoped access",
        tryLive: { app: "wallet", label: "Review the grant" },
      },
      {
        body: "The lender's standard application form (the URLA) prefills from pod data. No re-typing, no document re-upload — the experience the biggest digital lenders already sell, made portable to every lender in the market.",
        title: "The application prefills",
        tryLive: { app: "lender-boa", label: "Open the prefilled application" },
      },
      {
        body: "Within TRID's 3-business-day window, the Loan Estimate is delivered into Alex's pod. The borrower keeps the document itself — not just a login to someone else's portal.",
        title: "The Loan Estimate arrives",
        tryLive: { app: "wallet", label: "See the Loan Estimate in the pod" },
      },
    ],
    title: "One-click application",
  },
  {
    anchor:
      "Verbal verification of employment no more than 10 business days before the note date (Fannie Mae Selling Guide B3-3.1-04).",
    lead: "Thirty days later, the lender's pre-close freshness check finds the employment credential has lapsed. One click re-issues it through the grant Alex already gave.",
    scene: 4,
    slug: "nothing-goes-stale",
    steps: [
      {
        body: "The employment credential's validity window has passed — the demo seeds it back-dated, so no clock is faked. Today this rule means a phone call to an employer and re-collected paperwork days before closing.",
        title: "The freshness check trips",
        tryLive: { app: "lender-boa", label: "Run the pre-close freshness check" },
      },
      {
        body: "One click asks the issuer to re-attest through the consent that already exists. Seconds instead of days: freshness becomes a re-issue, not a re-collection.",
        title: "Re-issue through existing consent",
        tryLive: { app: "verifications", label: "Re-issue the employment credential" },
      },
      {
        body: "The automated underwriting service modelled on Freddie Mac re-runs over the granted, refreshed loan file. This is the beat the GSEs' own numbers price: up to 12 days saved by their data-validation programmes.",
        title: "Underwriting re-runs",
        tryLive: { app: "gse", label: "Re-run the AUS" },
      },
    ],
    title: "Nothing goes stale",
    underneath: [
      "The employment credential is seeded with validFrom 30 days in the past and validUntil 14 days after issue — the scene-4 lapse is real credential state, not a mocked clock.",
      "Freshness is handled by re-issue; the status-list rail is reserved for actual revocation. Two different failure modes, two different mechanisms.",
      "The re-issue flows through the existing pod-native grant and writes a fresh consent receipt to the ledger.",
    ],
  },
  {
    anchor:
      "TRID's 3-business-day Closing Disclosure rule, then RESPA's servicing-transfer notices.",
    lead: "The Closing Disclosure lands three days early, Alex eSigns, and servicing transfers — with every grant and every revocation receipted in a ledger the borrower can read.",
    scene: 5,
    slug: "close-and-stay-in-control",
    steps: [
      {
        body: "The Closing Disclosure arrives in the pod three business days before consummation, and Alex eSigns in an eClose ceremony modelled on Wolters Kluwer's eOriginal rail — real industry plumbing, simulated honestly.",
        title: "Close digitally",
        tryLive: { app: "closing", label: "Open the eClose ceremony" },
      },
      {
        body: "The loan's servicing moves to a Truist-modelled servicer. The new servicer requests access; Alex approves that grant and revokes the original lender in the same view.",
        title: "Servicing transfers — on Alex's terms",
        tryLive: { app: "closing", label: "Approve the servicing transfer" },
      },
      {
        body: "The final screen is the whole pitch in one view: every access granted and every revocation, receipted and enumerable — something no participant in today's process can show a borrower.",
        title: "Read the ledger",
        tryLive: { app: "wallet", label: "Read the consent-receipt ledger" },
      },
    ],
    title: "Close, and stay in control",
  },
];

export function chapterBySlug(slug: string): Chapter | undefined {
  return chapters.find((chapter) => chapter.slug === slug);
}
