// AUTHORED-BY Claude Opus 5.5
/**
 * Organisation-to-organisation exchanges of the lending story. As in the mortgage
 * (`../mortgage/messages.ts`), a delivery is an `as:Announce` appended to the recipient's inbox
 * that points at a resource in the sender's own pod, which the sender opens to that recipient
 * alone. None of it passes through Maya's pod, and each delivery leaves an "org-to-org" Lens note.
 *
 * - A lender asks Quillon for Maya's score (`ScoreInquiry`), citing her authorisation; Quillon
 *   reads the authorisation in her pod (the one record her grant lets it read), checks it names
 *   that lender and the credit-check purpose, and answers with a report (`ScoreDelivery`).
 * - Finchly reports repayments to Quillon (`RepaymentFurnishing`).
 * - Swiftline confirms the payout to Finchly (`PayoutConfirmation`).
 */

import {
  buildCreditReport,
  buildInboxMessage,
  ConsentReceipt,
  CreditReport,
  DPV,
  type MessageKindIri,
  MORT,
} from "@mortgage/data-model";
import type { OrgSlug, PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { readMessage, shareInOwnPod } from "../mortgage/messages.js";
import {
  at,
  podUrl,
  postResource,
  putResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { CREDIT, LOAN, MAYA } from "./facts.js";
import { AUTHORISATIONS, mayaUrl } from "./grants.js";

export interface LendingDelivery {
  readonly from: Exclude<PodOwner, "alex" | "maya">;
  readonly to: Exclude<PodOwner, "alex" | "maya">;
  readonly kind: MessageKindIri;
  readonly summary: string;
  readonly objects?: readonly string[];
  readonly time: string;
  readonly inReplyTo?: string;
}

/** Append a delivery to the recipient's inbox. Returns the message URL the server assigned. */
export async function send(world: World, delivery: LendingDelivery): Promise<string> {
  const slug = delivery.kind.slice(delivery.kind.lastIndexOf("-") + 1).toLowerCase();
  const url = await postResource(
    world.fetchAs(delivery.from),
    podUrl(world, delivery.to, "inbox/"),
    slug,
    (iri) =>
      buildInboxMessage({
        actor: webid(world, delivery.from),
        iri,
        loanNumber: LOAN.loanNumber,
        messageKind: delivery.kind,
        published: at(world, delivery.time),
        summary: delivery.summary,
        ...(delivery.inReplyTo === undefined ? {} : { inReplyTo: delivery.inReplyTo }),
        ...(delivery.objects === undefined ? {} : { objects: delivery.objects }),
      }),
  );
  world.note({
    kind: "org-to-org",
    org: delivery.from as OrgSlug,
    refs: [url, ...(delivery.objects ?? [])],
    text: delivery.summary,
  });
  return url;
}

export type ScoringLender = "fintech-lender" | "bank";

const AUTHORISATION_OF: Readonly<Record<ScoringLender, keyof typeof AUTHORISATIONS>> =
  Object.freeze({ bank: "A1", "fintech-lender": "L1" });

export function reportUrl(world: Pick<World, "podOrigin">, lender: ScoringLender): string {
  return podUrl(world, "bureau", `reports/maya-${lender}`);
}

/** Why Quillon refused an inquiry. */
export class InquiryRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InquiryRefused";
  }
}

/**
 * Quillon answers a score inquiry from its inbox. It reads Maya's authorisation at source (a 403
 * here means she never gave one, or withdrew the grant) and answers only a lender the
 * authorisation names, for the credit-check purpose.
 */
export async function bureauAnswers(
  world: World,
  messageUrl: string,
  time: string,
): Promise<string> {
  const message = await readMessage(world, "bureau", messageUrl);
  if (message.messageKind !== MORT.MessageKind_ScoreInquiry) {
    throw new InquiryRefused(`${messageUrl} is not a score inquiry`);
  }
  const lender = (["fintech-lender", "bank"] as const).find(
    (candidate) => webid(world, candidate) === message.actorIri,
  );
  if (lender === undefined) throw new InquiryRefused("the inquiry is from no lender Quillon knows");
  const authorisation = mayaUrl(world, AUTHORISATIONS[AUTHORISATION_OF[lender]]);
  if (![...message.objectIris].includes(authorisation)) {
    throw new InquiryRefused("the inquiry cites no authorisation");
  }
  const fetcher = world.fetchAs("bureau");
  const receipt = new ConsentReceipt(
    authorisation,
    await readDataset(fetcher, authorisation),
    DataFactory,
  );
  if (
    receipt.purposeIri !== DPV.CreditChecking ||
    receipt.consentStatus !== DPV.ConsentGiven ||
    receipt.dataControllerIri !== webid(world, lender) ||
    receipt.dataSubjectIri !== webid(world, MAYA)
  ) {
    throw new InquiryRefused("the authorisation does not cover this inquiry");
  }
  const report = await putResource(
    fetcher,
    buildCreditReport({
      authorisedBy: authorisation,
      borrower: webid(world, MAYA),
      creator: webid(world, "bureau"),
      iri: reportUrl(world, lender),
      issued: at(world, time),
      loanNumber: LOAN.loanNumber,
      permissiblePurpose:
        "A credit transaction initiated by the consumer (FCRA section 604(a)(3)(A))",
      reportNumber: `Q-${lender === "bank" ? "A" : "F"}-2048`,
      scores: [
        {
          created: at(world, time),
          keyFactors: [...CREDIT.keyFactors],
          score: CREDIT.creditScoreValue,
          scoreModel: MORT.ScoreModel_FICO8,
          source: "Quillon",
        },
      ],
      totalMonthlyDebtUsd: CREDIT.totalMonthlyDebtUsd,
    }),
  );
  await shareInOwnPod(world, "bureau", `reports/maya-${lender}`, [lender]);
  await send(world, {
    from: "bureau",
    inReplyTo: messageUrl,
    kind: MORT.MessageKind_ScoreDelivery,
    objects: [report],
    summary: `Credit score for loan ${LOAN.loanNumber}, released to the lender Maya authorised`,
    time,
    to: lender,
  });
  return report;
}

/**
 * A lender asks Quillon for Maya's score and reads the answer. The bureau's half runs in line, as
 * the mortgage runs its bureau's answer in line, so the tour is deterministic.
 */
export async function inquireScore(
  world: World,
  lender: ScoringLender,
  times: readonly [string, string],
): Promise<CreditReport> {
  const fetcher = world.fetchAs(lender);
  const existing = reportUrl(world, lender);
  // Quillon knows whether it already answered; the lender may read the report only once shared.
  if ((await statusOf(world.fetchAs("bureau"), existing)) !== 200) {
    const inquiry = await send(world, {
      from: lender,
      kind: MORT.MessageKind_ScoreInquiry,
      objects: [mayaUrl(world, AUTHORISATIONS[AUTHORISATION_OF[lender]])],
      summary: `Score inquiry for loan ${LOAN.loanNumber}, with Maya's authorisation`,
      time: times[0],
      to: "bureau",
    });
    await bureauAnswers(world, inquiry, times[1]);
  }
  return new CreditReport(existing, await readDataset(fetcher, existing), DataFactory);
}
