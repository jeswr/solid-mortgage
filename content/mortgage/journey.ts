// AUTHORED-BY Claude Fable 5.2
/**
 * The pod effects of the 24 tour steps (design.md section b.5), as plain functions over a
 * `World`. The apps call the same functions the headless journey test calls: an app supplies the
 * button and the screen, this file supplies what the button does to the pods.
 *
 * Each step is one or more beats. A beat happens on one simulated day and names who acts. Where
 * an organisation reacts to something in its inbox while the visitor is looking at another app,
 * the reaction is an agent function (`agents`), called here in order.
 *
 * Nothing here decides access. Every read and write goes through `world.fetchAs(owner)`, and the
 * pod server allows or refuses it from the ACL documents the wallet wrote.
 */

import {
  AgentProfile,
  buildClosingDisclosure,
  buildClosingRecord,
  buildConsentReceipt,
  buildCredentialPointer,
  buildCreditReport,
  buildCreditScoreNotice,
  buildDeliveredDocument,
  buildEscrowAccountStatement,
  buildLoanApplication,
  buildLoanEstimate,
  buildLoanTransferNotice,
  buildPaymentMandate,
  buildRecordedInstrument,
  buildRecordingReceipt,
  buildServiceOrder,
  buildSettlementStatement,
  buildUnderwritingDecision,
  ConsentReceipt,
  ContactDetails,
  DPV,
  EmploymentIncomeCredential,
  FIBO,
  MORT,
  type MortgageResourceKind,
  PurchaseAgreement,
  RESOURCE_TARGET_CLASSES,
  RecordedInstrument,
  SCHEMA,
  SubjectProperty,
} from "@mortgage/data-model";
import {
  addBusinessDays,
  businessDaysBetween,
  earliestConsummationAfterClosingDisclosure,
  loanEstimateDeadline,
} from "@mortgage/demo-kit/calendar";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { deriveStatusIndex, mintCapturedOperandAnchor, validityOn } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import {
  ACCOUNTS,
  APPRAISAL,
  BORROWER,
  CREDIT,
  DAY,
  EMPLOYMENT,
  ESCROW,
  INSURANCE,
  LOAN,
  PROPERTY,
  SELLER_NAME,
  TITLE_FILE,
} from "./facts.js";
import {
  applyExpiries,
  approveRequest,
  type GrantCode,
  grantRecords,
  policyUrl,
  requestAccess,
  revokeGrant,
} from "./grants.js";
import {
  checkAtSource,
  digestOf,
  type Issuer,
  issueToPod,
  recordIssuance,
  sign,
  statusListOf,
} from "./issuers.js";
import { deliver, readMessage, shareInOwnPod } from "./messages.js";
import {
  openPrequalification,
  type PrequalifyingLender,
  presentThresholdProofs,
  verifyPresentation,
} from "./prequalification.js";
import { identityCredentialUrl } from "./seed.js";
import {
  at,
  dateOf,
  PodRequestError,
  podUrl,
  put,
  putResource,
  readDataset,
  readText,
  statusOf,
  type World,
  webid,
} from "./world.js";

const alexUrl = (world: World, path: string) => podUrl(world, "alex", path);
const loanFile = (world: World, path: string) =>
  podUrl(world, "lender", `loans/${LOAN.loanNumber}/${path}`);
const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;

/** The loan terms every disclosure repeats. */
const TERMS = {
  aprPercent: LOAN.aprPercent,
  cashToCloseUsd: LOAN.cashToCloseUsd,
  closingCostsUsd: LOAN.closingCostsUsd,
  estimatedTotalMonthlyPaymentUsd: LOAN.estimatedTotalMonthlyPaymentUsd,
  interestRatePercent: LOAN.interestRatePercent,
  loanTermMonths: LOAN.loanTermMonths,
  monthlyPrincipalAndInterestUsd: LOAN.monthlyPrincipalAndInterestUsd,
  principalUsd: LOAN.principalUsd,
  propertyAddress: PROPERTY.address,
} as const;

/** Where each credential in Alex's pod lives, who issues it and what shape it has. */
export const CREDENTIALS = Object.freeze({
  assets: { issuer: "bank", kind: "asset-credential", path: "credentials/assets" },
  "credit-summary": {
    issuer: "bureau",
    kind: "credit-score-credential",
    path: "credentials/credit-summary",
  },
  "employment-income": {
    issuer: "payroll",
    kind: "employment-income-credential",
    path: "credentials/employment-income",
  },
  "evidence-of-insurance": {
    issuer: "insurer",
    kind: "evidence-of-insurance-credential",
    path: "insurance/evidence-of-insurance",
  },
  identity: { issuer: "bank", kind: "identity-credential", path: "identity/identity-credential" },
  "title-commitment": {
    issuer: "title",
    kind: "title-commitment-credential",
    path: "mortgage/closing/title-commitment",
  },
} as const satisfies Record<string, { issuer: Issuer; kind: MortgageResourceKind; path: string }>);

export type CredentialName = keyof typeof CREDENTIALS;

/** A pointer the reader keeps in its own store after checking a credential at source. */
async function keepPointer(
  world: World,
  reader: Exclude<PodOwner, "alex">,
  iri: string,
  name: CredentialName,
  time: string,
): Promise<void> {
  const entry = CREDENTIALS[name];
  const url = alexUrl(world, entry.path);
  const check = await checkAtSource(world, reader, url, entry.kind, [entry.issuer], time);
  if (!check.result.verified || check.result.credential === undefined) {
    throw new Error(
      `${name} failed its check at source: ${check.result.errors.map((error) => error.code).join(", ")}`,
    );
  }
  await putResource(
    world.fetchAs(reader),
    buildCredentialPointer({
      asOf: new Date(check.result.credential.validFrom ?? at(world, time)),
      checkedAt: at(world, time),
      credentialType: RESOURCE_TARGET_CLASSES[entry.kind],
      iri,
      issuer: webid(world, entry.issuer),
      loanNumber: LOAN.loanNumber,
      sha256: digestOf(check.body),
      signatureVerified: true,
      statusChecked: true,
      url,
    }),
  );
  world.note({
    kind: "verified",
    org: reader,
    refs: [url, iri],
    text: `Signature, issuer key and revocation status checked at source. A pointer and a digest are kept, not a copy.`,
  });
}

// --- Chapter 1: get ready ----------------------------------------------------------------------

/** One issuer asks for its slot, Alex approves, and the signed credential is written to the pod. */
async function shareCredential(
  world: World,
  grant: GrantCode,
  name: "employment-income" | "assets" | "credit-summary",
  claims: Parameters<typeof sign>[1]["claims"],
  hiddenField?: string,
): Promise<void> {
  const entry = CREDENTIALS[name];
  const request = await requestAccess(world, grant, "09:10");
  await approveRequest(world, request, "09:12");
  const credential = await issueToPod(world, {
    claims,
    credentialId: alexUrl(world, entry.path),
    issuer: entry.issuer,
    kind: entry.kind,
    record: name,
    subject: webid(world, "alex"),
    time: "09:15",
    // Credit documents may be at most four months old on the note date.
    validDays: 120,
  });
  if (hiddenField === undefined) return;
  // The same issuer signs the encoding of the hidden value, so a later proof can be checked
  // against the issuer without showing the value.
  const anchorId = alexUrl(world, `${entry.path}-anchor`);
  const anchor = await mintCapturedOperandAnchor({
    anchorId,
    credential,
    field: hiddenField,
    issuer: webid(world, entry.issuer),
    key: await world.keyFor(entry.issuer),
    status: (await statusListOf(world, entry.issuer)).entry(deriveStatusIndex(anchorId)),
    subject: webid(world, "alex"),
    validity: validityOn(world.calendar, world.day, { time: "09:15", validDays: 120 }),
  });
  await put(
    world.fetchAs(entry.issuer),
    anchorId,
    anchor.credential.body,
    anchor.credential.contentType,
  );
  await recordIssuance(world, entry.issuer, `${name}-anchor`, anchor.credential, "09:15");
}

export const welcome = async (world: World): Promise<void> => {
  // The wallet's home screen: Alex lists the drawers of the pod.
  await readDataset(world.fetchAs("alex"), alexUrl(world, ""));
};

export const shareEmployment = (world: World): Promise<void> =>
  shareCredential(
    world,
    "G1",
    "employment-income",
    {
      employer: { name: EMPLOYMENT.employerName },
      jobTitle: EMPLOYMENT.jobTitle,
      kind: "employment-income-credential",
      monthlyGrossIncomeUsd: EMPLOYMENT.monthlyGrossIncomeUsd,
      startDate: EMPLOYMENT.startDate,
    },
    MORT.monthlyGrossIncomeUsd,
  );

export const shareAssets = (world: World): Promise<void> =>
  shareCredential(world, "G2", "assets", {
    accounts: ACCOUNTS.map((account) => ({
      accountLast4: account.accountLast4,
      amountUsd: account.balanceUsd,
      provider: { name: account.providerName },
    })),
    kind: "asset-credential",
  });

export const shareCreditSummary = (world: World): Promise<void> =>
  shareCredential(
    world,
    "G3",
    "credit-summary",
    {
      creditScoreValue: CREDIT.consumerSummaryScore,
      kind: "credit-score-credential",
      totalMonthlyDebtUsd: CREDIT.totalMonthlyDebtUsd,
    },
    MORT.creditScoreValue,
  );

// --- Chapter 2: shop ---------------------------------------------------------------------------

const PREQUALIFYING_LENDERS: readonly PrequalifyingLender[] = ["lender-b", "lender"];

/** Step 5. Both lenders have a challenge open; Alex proves to each; each lender's agent checks. */
export const proveToLenders = async (world: World): Promise<void> => {
  for (const lender of PREQUALIFYING_LENDERS) await openPrequalification(world, lender);
  for (const lender of PREQUALIFYING_LENDERS) {
    const presentation = await presentThresholdProofs(world, lender);
    const outcome = await verifyPresentation(world, lender, presentation);
    if (!outcome.qualified) throw new Error(`${lender}: ${outcome.errors.join("; ")}`);
  }
};

/** Step 6. Copperfield looks at what it holds: its inbox and its own result. Nothing of Alex's. */
export const lenderBReceived = async (world: World): Promise<void> => {
  const fetcher = world.fetchAs("lender-b");
  await readDataset(fetcher, podUrl(world, "lender-b", "inbox/"));
  await readDataset(fetcher, podUrl(world, "lender-b", "quotes/prequalification"));
};

// --- Chapter 3: apply --------------------------------------------------------------------------

export const CREDIT_AUTHORISATION = "consents/g4-credit-report-authorisation";

/** Step 7. Juniper asks; Alex approves the grant and signs the credit-report authorisation. */
export const approveApplicationAccess = async (world: World): Promise<void> => {
  const request = await requestAccess(world, "G4", "10:00");
  await approveRequest(world, request, "10:02");
  // The authorisation is a record of its own: the lender has a permissible purpose because
  // Alex asked for credit. The grant makes this one record readable by the bureau.
  await putResource(
    world.fetchAs("alex"),
    buildConsentReceipt({
      consentStatus: DPV.ConsentGiven,
      dataController: webid(world, "lender"),
      dataSubject: webid(world, "alex"),
      iri: alexUrl(world, CREDIT_AUTHORISATION),
      issued: at(world, "10:02"),
      policy: policyUrl(world, "G4"),
      purpose: DPV.CreditChecking,
      target: webid(world, "bureau"),
    }),
  );
};

/** The six pieces of information that make an application under Regulation Z. */
export const SIX_ITEMS = Object.freeze([
  { item: "Name", source: "profile/card" },
  { item: "Income", source: "credentials/employment-income" },
  {
    item: "Social Security number",
    source: "typed by Alex into Juniper's form; the pod holds only the last four digits",
  },
  { item: "Property address", source: "property/subject-property" },
  { item: "Estimated value of the property", source: "property/purchase-agreement" },
  { item: "Loan amount sought", source: "chosen by Alex in the form" },
] as const);

/** Step 8. Juniper fills the form from the pod, checks each credential at source and files it. */
export const submitApplication = async (world: World): Promise<void> => {
  const lender = world.fetchAs("lender");
  const profileUrl = alexUrl(world, "profile/card");
  const profile = new AgentProfile(profileUrl, await readDataset(lender, profileUrl), DataFactory);
  const contactUrl = alexUrl(world, "profile/contact");
  const contact = new ContactDetails(
    contactUrl,
    await readDataset(lender, contactUrl),
    DataFactory,
  );
  const propertyUrl = alexUrl(world, "property/subject-property");
  const property = new SubjectProperty(
    propertyUrl,
    await readDataset(lender, propertyUrl),
    DataFactory,
  );
  const agreementUrl = alexUrl(world, "property/purchase-agreement");
  const agreement = new PurchaseAgreement(
    agreementUrl,
    await readDataset(lender, agreementUrl),
    DataFactory,
  );
  if (profile.agent.name !== BORROWER.name || contact.emails.size === 0) {
    throw new Error("the profile does not identify the applicant");
  }
  for (const name of ["identity", "employment-income", "assets", "credit-summary"] as const) {
    await keepPointer(world, "lender", loanFile(world, `pointers/${name}`), name, "10:20");
  }
  const application = (iri: string) =>
    buildLoanApplication({
      amortizationType: FIBO.AmortizationType_fixedRate,
      created: at(world, "10:30"),
      iri,
      loanPurpose: FIBO.MortgageLoanPurpose_RealPropertyPurchase,
      loanTermMonths: LOAN.loanTermMonths,
      occupancy: FIBO.PropertyUsage_primaryResidence,
      property: { address: property.address },
      requestedAmountUsd: agreement.purchasePriceUsd - LOAN.downPaymentUsd,
      submittedBy: webid(world, "alex"),
    });
  await putResource(lender, application(loanFile(world, "application")));
  // The applicant's copy goes into the drawer Juniper may write to.
  await putResource(lender, application(alexUrl(world, "mortgage/juniper/application")));
  const applied = world.calendar.date(world.day);
  world.note({
    kind: "clock",
    org: "lender",
    text: `All six items received on ${applied}: this is the application date. The Loan Estimate must be delivered or mailed by ${loanEstimateDeadline(applied)}, the third business day.`,
  });
};

/** What the agents do when a message lands in their inbox. Each acts only as its organisation. */
export const agents = {
  /** Quillon checks the borrower's authorisation in the pod, then releases the report to Juniper. */
  async bureauFulfilCreditOrder(world: World, messageUrl: string): Promise<string> {
    const bureau = world.fetchAs("bureau");
    const message = await readMessage(world, "bureau", messageUrl);
    const authorisationUrl = alexUrl(world, CREDIT_AUTHORISATION);
    if (!message.objectIris.has(authorisationUrl)) {
      throw new Error("the order names no authorisation from the consumer");
    }
    const authorisation = new ConsentReceipt(
      authorisationUrl,
      await readDataset(bureau, authorisationUrl),
      DataFactory,
    );
    if (
      authorisation.consentStatus !== DPV.ConsentGiven ||
      authorisation.dataControllerIri !== message.actorIri ||
      authorisation.purposeIri !== DPV.CreditChecking
    ) {
      throw new Error("the authorisation does not cover a credit report for this lender");
    }
    const report = await putResource(
      bureau,
      buildCreditReport({
        authorisedBy: authorisationUrl,
        borrower: webid(world, "alex"),
        creator: webid(world, "bureau"),
        iri: podUrl(world, "bureau", `orders/${LOAN.loanNumber}/report`),
        issued: at(world, "11:05"),
        loanNumber: LOAN.loanNumber,
        permissiblePurpose:
          "Credit transaction initiated by the consumer (Fair Credit Reporting Act, section 604(a)(3)(A))",
        reportNumber: "QCB-TM-20417",
        scores: CREDIT.triMerge.map((entry) => ({
          created: at(world, "11:05"),
          score: entry.score,
          scoreModel: MORT.ScoreModel_ClassicFICO,
          source: entry.source,
        })),
        totalMonthlyDebtUsd: CREDIT.totalMonthlyDebtUsd,
      }),
    );
    await shareInOwnPod(world, "bureau", `orders/${LOAN.loanNumber}/`, ["lender"]);
    return deliver(world, {
      from: "bureau",
      inReplyTo: messageUrl,
      kind: MORT.MessageKind_CreditReportDelivery,
      objects: [report],
      summary: "Tri-merge credit report for loan JHL-1001, released to Juniper Home Loans",
      time: "11:06",
      to: "lender",
    });
  },

  /** Castellan reads the three credentials at source, by reference, and returns its findings. */
  async ausRunCasefile(world: World, messageUrl: string): Promise<string> {
    const aus = world.fetchAs("aus");
    const message = await readMessage(world, "aus", messageUrl);
    const casefile = `casefiles/${LOAN.loanNumber}/`;
    for (const name of ["employment-income", "assets", "credit-summary"] as const) {
      if (!message.objectIris.has(alexUrl(world, CREDENTIALS[name].path))) {
        throw new Error(`the casefile does not reference ${name}`);
      }
      await keepPointer(
        world,
        "aus",
        podUrl(world, "aus", `${casefile}source-checks/${name}`),
        name,
        "11:20",
      );
    }
    const applicationUrl = loanFile(world, "application");
    await readDataset(aus, applicationUrl);
    const findings = await putResource(
      aus,
      buildDeliveredDocument({
        about: applicationUrl,
        creator: webid(world, "aus"),
        description: [
          "Recommendation: Approve/Eligible. This is a recommendation; the lender's underwriter decides.",
          "Income, assets and credit summary were each read at source and their signatures checked.",
          "Conditions: appraisal supporting the value; title commitment; evidence of homeowner's insurance;",
          "verification of employment no more than 10 business days before the note date.",
        ].join(" "),
        identifier: "CHF-2026-88104",
        iri: podUrl(world, "aus", `${casefile}findings`),
        issued: at(world, "11:25"),
        loanNumber: LOAN.loanNumber,
        name: "Underwriting findings",
      }),
    );
    await shareInOwnPod(world, "aus", casefile, ["lender"]);
    return deliver(world, {
      from: "aus",
      inReplyTo: messageUrl,
      kind: MORT.MessageKind_FindingsDelivery,
      objects: [findings],
      summary: "Underwriting findings for casefile JHL-1001: Approve/Eligible, with conditions",
      time: "11:26",
      to: "lender",
    });
  },

  /** A service provider that needs part of Alex's data asks Alex for exactly that part. */
  async requestFromOrder(
    world: World,
    owner: "appraisal" | "title",
    messageUrl: string,
  ): Promise<string> {
    await readMessage(world, owner, messageUrl);
    return requestAccess(world, owner === "appraisal" ? "G5" : "G6", "09:40");
  },

  /** Juniper, as creditor, gives the applicant a copy of the appraisal. */
  async lenderReceiveAppraisal(world: World, messageUrl: string): Promise<void> {
    const lender = world.fetchAs("lender");
    const message = await readMessage(world, "lender", messageUrl);
    const [reportUrl] = [...message.objectIris];
    if (reportUrl === undefined) throw new Error("the delivery names no report");
    const check = await checkAtSource(
      world,
      "lender",
      reportUrl,
      "appraisal-credential",
      ["appraisal"],
      "15:10",
    );
    if (!check.result.verified) throw new Error("the appraisal did not verify");
    world.note({
      kind: "verified",
      org: "lender-desk",
      refs: [reportUrl],
      text: "Appraisal report checked: signed by Plumbline Valuation, not revoked.",
    });
    await put(lender, alexUrl(world, "mortgage/juniper/appraisal"), check.body, "text/turtle");
    await putResource(lender, serviceOrder(world, "appraisal", SCHEMA.OrderDelivered));
  },

  /** Ledgerly answers a refresh request from its own payroll record: a new credential, the old one revoked. */
  async payrollRefresh(world: World, messageUrl: string): Promise<string> {
    const message = await readMessage(world, "payroll", messageUrl);
    const entry = CREDENTIALS["employment-income"];
    const credentialId = alexUrl(world, entry.path);
    if (message.actorIri !== webid(world, "lender") || !message.objectIris.has(credentialId)) {
      throw new Error("only Juniper may ask for a refresh of this verification");
    }
    const list = await statusListOf(world, "payroll");
    const newIndex = deriveStatusIndex(`${credentialId}#refresh-day-${world.day}`);
    const refreshed = await sign(world, {
      claims: {
        employer: { name: EMPLOYMENT.employerName },
        jobTitle: EMPLOYMENT.jobTitle,
        kind: "employment-income-credential",
        monthlyGrossIncomeUsd: EMPLOYMENT.monthlyGrossIncomeUsd,
        startDate: EMPLOYMENT.startDate,
      },
      credentialId,
      issuer: "payroll",
      kind: entry.kind,
      statusIndex: newIndex,
      subject: webid(world, "alex"),
      time: "09:30",
      validDays: 120,
    });
    await put(world.fetchAs("payroll"), credentialId, refreshed.body, refreshed.contentType);
    await list.revoke(deriveStatusIndex(credentialId), { now: at(world, "09:31") });
    await recordIssuance(
      world,
      "payroll",
      `employment-income-refresh-day-${world.day}`,
      refreshed,
      "09:30",
    );
    return deliver(world, {
      from: "payroll",
      inReplyTo: messageUrl,
      kind: MORT.MessageKind_RefreshDelivery,
      objects: [credentialId],
      summary:
        "Employment re-verified today from the payroll record. The earlier verification is revoked",
      time: "09:32",
      to: "lender",
    });
  },

  /** The county records the two instruments. The register is public: no pod of Alex's is involved. */
  async countyRecord(world: World, messageUrl: string): Promise<string> {
    const county = world.fetchAs("county");
    await readMessage(world, "county", messageUrl);
    const instruments = [
      {
        grantees: [BORROWER.name],
        grantors: [SELLER_NAME],
        name: "Warranty deed",
        reference: "2026-0048113",
      },
      {
        grantees: ["Juniper Home Loans"],
        grantors: [BORROWER.name],
        name: "Mortgage",
        reference: "2026-0048114",
      },
    ];
    const recorded: string[] = [];
    for (const instrument of instruments) {
      recorded.push(
        await putResource(
          county,
          buildRecordedInstrument({
            creator: webid(world, "county"),
            grantees: instrument.grantees,
            grantors: instrument.grantors,
            iri: podUrl(world, "county", `records/${instrument.reference}`),
            name: instrument.name,
            parcelNumber: PROPERTY.parcelNumber,
            recordedAt: at(world, "15:40"),
            recordingReference: instrument.reference,
          }),
        ),
      );
    }
    world.note({
      kind: "no-solid",
      org: "county",
      refs: recorded,
      text: "The land register is public by law. The deed and the mortgage are recorded in the county's own system, readable by anyone. Nothing was read from Alex's pod.",
    });
    return deliver(world, {
      from: "county",
      inReplyTo: messageUrl,
      kind: MORT.MessageKind_RecordingConfirmation,
      objects: recorded,
      summary: "Recorded: warranty deed 2026-0048113 and mortgage 2026-0048114",
      time: "15:41",
      to: "title",
    });
  },

  /** Castellan accepts delivery of the closed loan and confirms the purchase. */
  async ausPurchaseLoan(world: World, messageUrl: string): Promise<string> {
    const aus = world.fetchAs("aus");
    const message = await readMessage(world, "aus", messageUrl);
    for (const object of message.objectIris) await readDataset(aus, object);
    const confirmation = await putResource(
      aus,
      buildDeliveredDocument({
        creator: webid(world, "aus"),
        description: `Castellan Housing Finance purchased loan ${LOAN.loanNumber} (${usd(LOAN.principalUsd)}) from Juniper Home Loans. Juniper continues to service it until further notice.`,
        identifier: "CHF-PUR-2026-31177",
        iri: podUrl(world, "aus", `deliveries/${LOAN.loanNumber}`),
        issued: at(world, "14:00"),
        loanNumber: LOAN.loanNumber,
        name: "Purchase confirmation",
      }),
    );
    await shareInOwnPod(world, "aus", `deliveries/${LOAN.loanNumber}`, ["lender"]);
    return deliver(world, {
      from: "aus",
      inReplyTo: messageUrl,
      kind: MORT.MessageKind_PurchaseConfirmation,
      objects: [confirmation],
      summary: "Castellan purchased loan JHL-1001",
      time: "14:01",
      to: "lender",
    });
  },

  /** The wallet applies expiry: grants whose end has been reached lose their ACL entries. */
  walletApplyExpiries: (world: World): Promise<string[]> => applyExpiries(world),
} as const;

function serviceOrder(
  world: World,
  service: "appraisal" | "title" | "credit-report",
  status: string,
) {
  const detail = {
    appraisal: {
      kind: MORT.ServiceKind_Appraisal,
      number: APPRAISAL.orderNumber,
      seller: "appraisal",
    },
    "credit-report": {
      kind: MORT.ServiceKind_CreditReport,
      number: "JHL-1001-CR",
      seller: "bureau",
    },
    title: { kind: MORT.ServiceKind_Title, number: TITLE_FILE.commitmentNumber, seller: "title" },
  } as const;
  const entry = detail[service];
  return buildServiceOrder({
    customer: webid(world, "lender"),
    iri: loanFile(world, `orders/${service}`),
    loanNumber: LOAN.loanNumber,
    orderDate: dateOf(world, service === "credit-report" ? DAY.application : DAY.orders),
    orderNumber: entry.number,
    orderStatus: status,
    seller: webid(world, entry.seller),
    serviceKind: entry.kind,
    ...(service === "credit-report" ? { authorisedBy: alexUrl(world, CREDIT_AUTHORISATION) } : {}),
  });
}

/** Step 9. The loan officer pulls credit and runs automated underwriting. */
export const pullCreditAndRunAus = async (world: World): Promise<void> => {
  const lender = world.fetchAs("lender");
  // Credit: an order between two organisations. The report never passes through the pod.
  const order = await putResource(
    lender,
    serviceOrder(world, "credit-report", SCHEMA.OrderProcessing),
  );
  await shareInOwnPod(world, "lender", `loans/${LOAN.loanNumber}/orders/credit-report`, ["bureau"]);
  const orderMessage = await deliver(world, {
    from: "lender",
    kind: MORT.MessageKind_CreditReportOrder,
    objects: [order, alexUrl(world, CREDIT_AUTHORISATION)],
    summary: "Order for a tri-merge credit report, with the consumer's authorisation",
    time: "11:00",
    to: "bureau",
  });
  const delivery = await agents.bureauFulfilCreditOrder(world, orderMessage);
  const [reportUrl] = [...(await readMessage(world, "lender", delivery)).objectIris];
  if (reportUrl === undefined) throw new Error("the bureau delivered no report");
  await readDataset(lender, reportUrl);
  await putResource(lender, serviceOrder(world, "credit-report", SCHEMA.OrderDelivered));
  // The scores the lender used, disclosed to the applicant: this does land in the pod.
  await putResource(
    lender,
    buildCreditScoreNotice({
      borrower: webid(world, "alex"),
      creator: webid(world, "lender"),
      description:
        "Notice to the Home Loan Applicant. Juniper Home Loans obtained these credit scores in connection with your application. The lender uses the middle of the three.",
      iri: alexUrl(world, "mortgage/juniper/score-notice"),
      issued: at(world, "11:10"),
      loanNumber: LOAN.loanNumber,
      name: "Credit score disclosure",
      scores: CREDIT.triMerge.map((entry) => ({
        created: at(world, "11:05"),
        keyFactors: [
          "Length of time accounts have been established",
          "Proportion of balances to credit limits on revolving accounts",
        ],
        score: entry.score,
        scoreModel: MORT.ScoreModel_ClassicFICO,
        source: entry.source,
      })),
    }),
  );
  // Underwriting: the lender submits; the service reads the three credentials itself.
  await shareInOwnPod(world, "lender", `loans/${LOAN.loanNumber}/application`, ["aus"]);
  const casefile = await deliver(world, {
    from: "lender",
    kind: MORT.MessageKind_CasefileSubmission,
    objects: [
      loanFile(world, "application"),
      ...(["employment-income", "assets", "credit-summary"] as const).map((name) =>
        alexUrl(world, CREDENTIALS[name].path),
      ),
    ],
    summary:
      "Casefile JHL-1001 submitted for automated underwriting, with three credentials by reference",
    time: "11:15",
    to: "aus",
  });
  const findings = await agents.ausRunCasefile(world, casefile);
  for (const object of (await readMessage(world, "lender", findings)).objectIris) {
    await readDataset(lender, object);
  }
};

/** Step 10. Castellan's console shows its own casefile: the source checks and the findings. */
export const ausSourceChecks = async (world: World): Promise<void> => {
  const aus = world.fetchAs("aus");
  const casefile = podUrl(world, "aus", `casefiles/${LOAN.loanNumber}/`);
  await readDataset(aus, `${casefile}source-checks/`);
  await readDataset(aus, `${casefile}findings`);
};

function loanEstimate(world: World, intent: boolean) {
  const issued = world.calendar.date(DAY.loanEstimate);
  return buildLoanEstimate({
    applicationDate: dateOf(world, DAY.application),
    borrower: webid(world, "alex"),
    creator: webid(world, "lender"),
    // If Alex does not say they intend to proceed within 10 business days, the estimate lapses.
    expires: new Date(`${addBusinessDays(issued, 10, "general")}T00:00:00Z`),
    iri: alexUrl(world, "mortgage/juniper/loan-estimate"),
    issued: world.calendar.clock(DAY.loanEstimate, "09:30"),
    loanNumber: LOAN.loanNumber,
    name: "Loan Estimate",
    ...TERMS,
    ...(intent ? { intentToProceedDate: dateOf(world, world.day) } : {}),
  });
}

/** Step 11, first beat. Juniper delivers the Loan Estimate to the pod. */
export const deliverLoanEstimate = async (world: World): Promise<void> => {
  await putResource(world.fetchAs("lender"), loanEstimate(world, false));
  const applied = world.calendar.date(DAY.application);
  const delivered = world.calendar.date(world.day);
  world.note({
    kind: "clock",
    org: "lender",
    text: `Loan Estimate delivered on business day ${businessDaysBetween(applied, delivered, "general")} of 3 after the application.`,
  });
};

/** Step 11, second beat. Alex says "I intend to proceed" in Juniper's portal; Juniper records it. */
export const intendToProceed = async (world: World): Promise<void> => {
  await putResource(world.fetchAs("lender"), loanEstimate(world, true));
};

// --- Chapter 4: processing ---------------------------------------------------------------------

/** Step 12. Four orders. Two providers need part of Alex's data and ask Alex for that part. */
export const orderServices = async (world: World): Promise<void> => {
  const lender = world.fetchAs("lender");
  const requests: string[] = [];
  for (const service of ["appraisal", "title"] as const) {
    const order = await putResource(lender, serviceOrder(world, service, SCHEMA.OrderProcessing));
    await shareInOwnPod(world, "lender", `loans/${LOAN.loanNumber}/orders/${service}`, [service]);
    const message = await deliver(world, {
      from: "lender",
      kind: MORT.MessageKind_ServiceOrder,
      objects: [order],
      summary:
        service === "appraisal"
          ? "Appraisal ordered for 14 Larch Lane. The appraiser is assigned from the panel; Juniper's sales staff take no part"
          : "Title search, commitment and settlement ordered for 14 Larch Lane",
      time: "09:30",
      to: service,
    });
    requests.push(await agents.requestFromOrder(world, service, message));
  }
  world.note({
    kind: "no-solid",
    org: "lender-desk",
    text: "Flood zone determination ordered from a flood vendor. It needs the property address only: no pod request.",
  });
  world.note({
    kind: "no-solid",
    org: "lender-desk",
    text: "Tax transcripts requested from the IRS under Alex's signed Form 4506-C. The IRS answers the lender directly: no pod request.",
  });
  // Alex approves both requests in the wallet.
  for (const [index, request] of requests.entries()) {
    await approveRequest(world, request, index === 0 ? "12:00" : "12:01");
  }
};

/** Step 13. The appraiser reads the property and the contract, reports, and the copy reaches Alex. */
export const submitAppraisal = async (world: World): Promise<void> => {
  // G2 and G3 ran for seven days; the wallet has removed them by now.
  await agents.walletApplyExpiries(world);
  const appraiser = world.fetchAs("appraisal");
  const propertyUrl = alexUrl(world, "property/subject-property");
  const property = new SubjectProperty(
    propertyUrl,
    await readDataset(appraiser, propertyUrl),
    DataFactory,
  );
  await readDataset(appraiser, alexUrl(world, "property/purchase-agreement"));
  const reportUrl = podUrl(world, "appraisal", `orders/${APPRAISAL.orderNumber}/appraisal`);
  await issueToPod(world, {
    claims: {
      appraiser: { licenseId: APPRAISAL.appraiserLicenseId, name: APPRAISAL.appraiserName },
      kind: "appraisal-credential",
      property: { address: property.address, appraisedValueUsd: APPRAISAL.appraisedValueUsd },
      reportIssued: world.calendar.date(world.day),
    },
    credentialId: reportUrl,
    issuer: "appraisal",
    kind: "appraisal-credential",
    record: "appraisal",
    subject: webid(world, "alex"),
    time: "15:00",
    validDays: 120,
  });
  await shareInOwnPod(world, "appraisal", `orders/${APPRAISAL.orderNumber}/`, ["lender"]);
  const delivery = await deliver(world, {
    from: "appraisal",
    kind: MORT.MessageKind_AppraisalDelivery,
    objects: [reportUrl],
    summary: `Appraisal report for 14 Larch Lane delivered: ${usd(APPRAISAL.appraisedValueUsd)}`,
    time: "15:05",
    to: "lender",
  });
  await agents.lenderReceiveAppraisal(world, delivery);
  // The report is delivered, so Plumbline's access ends.
  await agents.walletApplyExpiries(world);
};

/** Step 14. The title agent reads the name and the contract, and issues the commitment. */
export const issueTitleCommitment = async (world: World): Promise<void> => {
  const title = world.fetchAs("title");
  const profileUrl = alexUrl(world, "profile/card");
  const profile = new AgentProfile(profileUrl, await readDataset(title, profileUrl), DataFactory);
  const agreementUrl = alexUrl(world, "property/purchase-agreement");
  const agreement = new PurchaseAgreement(
    agreementUrl,
    await readDataset(title, agreementUrl),
    DataFactory,
  );
  const commitment = await issueToPod(world, {
    claims: {
      commitmentNumber: TITLE_FILE.commitmentNumber,
      exceptions: TITLE_FILE.exceptions,
      kind: "title-commitment-credential",
      loanPolicyAmountUsd: LOAN.principalUsd,
      ownerPolicyAmountUsd: agreement.purchasePriceUsd,
      propertyAddress: agreement.subjectProperty.address,
      proposedInsured: [
        profile.agent.titleVesting ?? profile.agent.name,
        "Juniper Home Loans, its successors and/or assigns",
      ],
      requirements: TITLE_FILE.requirements,
      searchedThrough: world.calendar.date(world.day - 2),
      vestedOwner: agreement.sellerName,
    },
    credentialId: alexUrl(world, CREDENTIALS["title-commitment"].path),
    issuer: "title",
    kind: "title-commitment-credential",
    record: "title-commitment",
    subject: webid(world, "alex"),
    time: "14:00",
    validDays: 180,
  });
  // The lender is a proposed insured too: it gets the same signed commitment from Sextant's file.
  const file = `files/${TITLE_FILE.commitmentNumber}/`;
  const lenderCopy = podUrl(world, "title", `${file}commitment`);
  await put(title, lenderCopy, commitment.body, commitment.contentType);
  await shareInOwnPod(world, "title", file, ["lender"]);
  const delivery = await deliver(world, {
    from: "title",
    kind: MORT.MessageKind_CommitmentDelivery,
    objects: [lenderCopy],
    summary: "Title commitment STE-2026-0417 issued: three requirements, two exceptions",
    time: "14:05",
    to: "lender",
  });
  const lender = world.fetchAs("lender");
  for (const object of (await readMessage(world, "lender", delivery)).objectIris) {
    await readText(lender, object);
  }
  await putResource(lender, serviceOrder(world, "title", SCHEMA.OrderDelivered));
};

/** Step 15. Alex buys insurance from pod data; the lender reads the evidence where it lies. */
export const bindInsurance = async (world: World): Promise<void> => {
  const request = await requestAccess(world, "G7", "10:00");
  await approveRequest(world, request, "10:01");
  const insurer = world.fetchAs("insurer");
  const propertyUrl = alexUrl(world, "property/subject-property");
  const property = new SubjectProperty(
    propertyUrl,
    await readDataset(insurer, propertyUrl),
    DataFactory,
  );
  await readText(insurer, alexUrl(world, "mortgage/juniper/appraisal"));
  await issueToPod(world, {
    claims: {
      annualPremiumUsd: INSURANCE.annualPremiumUsd,
      deductibleUsd: INSURANCE.deductibleUsd,
      dwellingCoverageUsd: INSURANCE.dwellingCoverageUsd,
      kind: "evidence-of-insurance-credential",
      loanNumber: LOAN.loanNumber,
      mortgageeClause: INSURANCE.mortgageeClause,
      policyEnd: world.calendar.date(DAY.closing + 365),
      policyNumber: INSURANCE.policyNumber,
      policyStart: world.calendar.date(DAY.closing),
      propertyAddress: property.address,
    },
    credentialId: alexUrl(world, CREDENTIALS["evidence-of-insurance"].path),
    issuer: "insurer",
    kind: "evidence-of-insurance-credential",
    record: "evidence-of-insurance",
    subject: webid(world, "alex"),
    time: "10:20",
    validDays: 365 + (DAY.closing - world.day),
  });
  // Written once. The lender does not ask Alex or the insurer for a copy: it reads the pod.
  await keepPointer(
    world,
    "lender",
    loanFile(world, "pointers/evidence-of-insurance"),
    "evidence-of-insurance",
    "11:00",
  );
};

/** Step 16. Employment is re-verified by re-issue, and the underwriter clears the loan to close. */
export const refreshEmploymentAndClear = async (world: World): Promise<void> => {
  const request = await deliver(world, {
    from: "lender",
    kind: MORT.MessageKind_RefreshRequest,
    objects: [alexUrl(world, CREDENTIALS["employment-income"].path)],
    summary: "Please re-verify employment for loan JHL-1001 before closing",
    time: "09:00",
    to: "payroll",
  });
  const delivery = await agents.payrollRefresh(world, request);
  await readMessage(world, "lender", delivery);
  await keepPointer(
    world,
    "lender",
    loanFile(world, "pointers/employment-income"),
    "employment-income",
    "09:45",
  );
  const url = alexUrl(world, CREDENTIALS["employment-income"].path);
  const refreshed = new EmploymentIncomeCredential(
    url,
    await readDataset(world.fetchAs("lender"), url),
    DataFactory,
  );
  const asOf = world.calendar.date(world.calendar.dayOf(refreshed.validFrom));
  const noteDate = world.calendar.date(DAY.closing);
  const gap = businessDaysBetween(asOf, noteDate, "general");
  if (gap < 0 || gap > 10)
    throw new Error(`employment as of ${asOf} is outside the 10-business-day window`);
  world.note({
    kind: "clock",
    org: "lender-desk",
    text: `Employment verified as of ${asOf}: ${gap} business days before the note date ${noteDate}. The limit is 10.`,
  });
  await putResource(
    world.fetchAs("lender"),
    buildUnderwritingDecision({
      approvedAmountUsd: LOAN.principalUsd,
      ausRecommendation: FIBO.UnderwritingDecision_Approve,
      creator: webid(world, "lender"),
      decisionStatus: MORT.DecisionStatus_Approved,
      evaluates: loanFile(world, "application"),
      iri: loanFile(world, "decision"),
      issued: at(world, "11:00"),
    }),
  );
};

// --- Chapter 5: closing ------------------------------------------------------------------------

function closingDisclosure(world: World, received: boolean) {
  return buildClosingDisclosure({
    borrower: webid(world, "alex"),
    closingDate: dateOf(world, DAY.closing),
    creator: webid(world, "lender"),
    disbursementDate: dateOf(world, DAY.closing),
    iri: alexUrl(world, "mortgage/juniper/closing-disclosure"),
    issued: world.calendar.clock(DAY.closingDisclosure, "09:00"),
    loanNumber: LOAN.loanNumber,
    name: "Closing Disclosure",
    ...TERMS,
    ...(received ? { receivedDate: dateOf(world, world.day) } : {}),
  });
}

/** Step 17, first beat. Juniper delivers the Closing Disclosure to the pod. */
export const deliverClosingDisclosure = async (world: World): Promise<void> => {
  await putResource(world.fetchAs("lender"), closingDisclosure(world, false));
};

/** Step 17, second beat. Alex confirms receipt in Juniper's portal; the waiting period is counted from it. */
export const acknowledgeClosingDisclosure = async (world: World): Promise<void> => {
  await putResource(world.fetchAs("lender"), closingDisclosure(world, true));
  const received = world.calendar.date(world.day);
  const earliest = earliestConsummationAfterClosingDisclosure(received);
  const closing = world.calendar.date(DAY.closing);
  if (closing < earliest) throw new Error(`closing on ${closing} is before ${earliest}`);
  world.note({
    kind: "clock",
    org: "lender",
    text: `Closing Disclosure received on ${received}. Three business days must pass: the earliest closing date is ${earliest}. Closing is set for ${closing}.`,
  });
};

/** Step 18. The settlement agent runs the signing and puts Alex's copies in the pod. */
export const signAtClosing = async (world: World): Promise<void> => {
  const lender = world.fetchAs("lender");
  const title = world.fetchAs("title");
  await shareInOwnPod(world, "lender", `loans/${LOAN.loanNumber}/decision`, ["title"]);
  const instructions = await deliver(world, {
    from: "lender",
    kind: MORT.MessageKind_ClosingInstructions,
    objects: [loanFile(world, "decision")],
    summary: "Closing instructions for loan JHL-1001. Funds are wired to Sextant's escrow account",
    time: "09:00",
    to: "title",
  });
  await readMessage(world, "title", instructions);
  const closing = "mortgage/closing/";
  const signed = [
    {
      description: `Promissory note for ${usd(LOAN.principalUsd)} at ${LOAN.interestRatePercent}% for ${LOAN.loanTermMonths} months, signed by Alex Rivera. Borrower's copy; the original note is held for the lender. Simulated signing: not a notarial act.`,
      name: "Promissory note (borrower's copy)",
      path: "signed/promissory-note",
    },
    {
      description:
        "Mortgage securing the note against 14 Larch Lane, signed by Alex Rivera. Borrower's copy; the original goes to the county for recording. Simulated signing: not a notarial act.",
      name: "Mortgage (borrower's copy)",
      path: "signed/mortgage",
    },
    {
      description: `Warranty deed from ${SELLER_NAME} to ${BORROWER.titleVesting}. Borrower's copy; the original goes to the county for recording. Simulated signing: not a notarial act.`,
      name: "Warranty deed (borrower's copy)",
      path: "signed/warranty-deed",
    },
  ];
  for (const document of signed) {
    await putResource(
      title,
      buildDeliveredDocument({
        creator: webid(world, "title"),
        description: document.description,
        identifier: TITLE_FILE.commitmentNumber,
        iri: alexUrl(world, `${closing}${document.path}`),
        issued: at(world, "14:30"),
        loanNumber: LOAN.loanNumber,
        name: document.name,
        propertyAddress: PROPERTY.address,
      }),
    );
  }
  await putResource(
    title,
    buildSettlementStatement({
      borrower: webid(world, "alex"),
      cashToCloseUsd: LOAN.cashToCloseUsd,
      closingDate: dateOf(world, world.day),
      creator: webid(world, "title"),
      disbursementDate: dateOf(world, world.day),
      fileNumber: TITLE_FILE.commitmentNumber,
      iri: alexUrl(world, `${closing}settlement-statement`),
      issued: at(world, "15:00"),
      lineItems: [
        { amountUsd: LOAN.purchasePriceUsd, name: "Contract sales price" },
        { amountUsd: LOAN.closingCostsUsd, name: "Closing costs" },
        { amountUsd: -LOAN.principalUsd, name: "Loan amount" },
        { amountUsd: -LOAN.earnestMoneyDepositUsd, name: "Earnest money deposit" },
      ],
      loanNumber: LOAN.loanNumber,
      name: "Settlement statement",
      principalUsd: LOAN.principalUsd,
      propertyAddress: PROPERTY.address,
      purchasePriceUsd: LOAN.purchasePriceUsd,
    }),
  );
  world.note({
    kind: "no-solid",
    org: "title",
    text: "Funding and disbursement: Juniper wires the loan funds, and Sextant pays off the seller's old mortgage, pays the fees and pays the seller from its escrow ledger. Money movement uses no pod.",
  });
  const confirmation = await deliver(world, {
    from: "title",
    inReplyTo: instructions,
    kind: MORT.MessageKind_ClosingConfirmation,
    summary: "Loan JHL-1001 closed and disbursed. A purchase loan has no right of rescission",
    time: "15:05",
    to: "lender",
  });
  await readMessage(world, "lender", confirmation);
  // The initial escrow account statement is given at settlement.
  await putResource(
    lender,
    buildEscrowAccountStatement({
      borrower: webid(world, "alex"),
      creator: webid(world, "lender"),
      iri: alexUrl(world, "mortgage/juniper/initial-escrow-statement"),
      issued: at(world, "15:10"),
      lineItems: [
        { amountUsd: ESCROW.annualPropertyTaxUsd, name: "Property taxes, per year" },
        { amountUsd: ESCROW.annualInsuranceUsd, name: "Homeowner's insurance, per year" },
      ],
      loanNumber: LOAN.loanNumber,
      monthlyEscrowPaymentUsd: LOAN.monthlyEscrowPaymentUsd,
      name: "Initial escrow account statement",
    }),
  );
  // Closing has happened, so Ledgerly's permission to re-issue ends.
  await agents.walletApplyExpiries(world);
};

/** Step 19. The settlement agent records the instruments; the receipt links the public record. */
export const recordWithCounty = async (world: World): Promise<void> => {
  const title = world.fetchAs("title");
  const submission = await deliver(world, {
    from: "title",
    kind: MORT.MessageKind_RecordingSubmission,
    summary: "eRecording submission: warranty deed and mortgage for parcel 010-204417-00",
    time: "15:30",
    to: "county",
  });
  const confirmation = await agents.countyRecord(world, submission);
  const recorded = [...(await readMessage(world, "title", confirmation)).objectIris].sort();
  const references: string[] = [];
  for (const url of recorded) {
    references.push(
      new RecordedInstrument(url, await readDataset(title, url), DataFactory).recordingReference,
    );
  }
  await putResource(
    title,
    buildRecordingReceipt({
      creator: webid(world, "title"),
      iri: alexUrl(world, "mortgage/closing/recording-receipt"),
      issued: at(world, "15:50"),
      name: "Recording receipt",
      propertyAddress: PROPERTY.address,
      recordedInstruments: recorded,
      recordingReferences: references,
    }),
  );
  await deliver(world, {
    from: "title",
    kind: MORT.MessageKind_RecordingConfirmation,
    objects: recorded,
    summary: "Deed and mortgage for loan JHL-1001 are recorded",
    time: "15:55",
    to: "lender",
  });
};

// --- Chapter 6: after closing ------------------------------------------------------------------

/** Step 20, first beat. Juniper delivers the closed loan to Castellan, and Alex is told of the sale. */
export const deliverLoan = async (world: World): Promise<void> => {
  const lender = world.fetchAs("lender");
  const mortgageRecord = podUrl(world, "county", "records/2026-0048114");
  const recorded = new RecordedInstrument(
    mortgageRecord,
    await readDataset(lender, mortgageRecord),
    DataFactory,
  );
  const record = await putResource(
    lender,
    buildClosingRecord({
      borrower: webid(world, "alex"),
      closingCostsUsd: LOAN.closingCostsUsd,
      closingDate: dateOf(world, DAY.closing),
      eNoteReference: "MIN 1009999-0000100142-7 (fictional registry number)",
      interestRatePercent: LOAN.interestRatePercent,
      iri: loanFile(world, "closing-record"),
      loanTermMonths: LOAN.loanTermMonths,
      principalUsd: LOAN.principalUsd,
      property: { address: PROPERTY.address },
      recordingReference: recorded.recordingReference,
      servicerName: "Juniper Home Loans",
    }),
  );
  await shareInOwnPod(world, "lender", `loans/${LOAN.loanNumber}/closing-record`, ["aus"]);
  const delivery = await deliver(world, {
    from: "lender",
    kind: MORT.MessageKind_LoanDelivery,
    objects: [record],
    summary: "Closed loan JHL-1001 delivered for purchase",
    time: "13:00",
    to: "aus",
  });
  const purchase = await agents.ausPurchaseLoan(world, delivery);
  for (const object of (await readMessage(world, "lender", purchase)).objectIris) {
    await readDataset(lender, object);
  }
  // The new owner must tell the borrower within 30 days. Juniper still services the loan and
  // has the drawer, so the owner's notice reaches Alex through it.
  await putResource(
    lender,
    buildLoanTransferNotice({
      borrower: webid(world, "alex"),
      creator: webid(world, "aus"),
      description:
        "Castellan Housing Finance now owns your loan. Nothing about your payments changes: Juniper Home Loans still services the loan. This notice is required within 30 days of the sale.",
      iri: alexUrl(world, "mortgage/juniper/sale-notice"),
      issued: at(world, "14:30"),
      loanNumber: LOAN.loanNumber,
      name: "Notice of sale of your mortgage loan",
      noticeKind: MORT.NoticeKind_OwnershipTransfer,
      telephone: "+1-202-555-0177",
      transfereeName: "Castellan Housing Finance",
      transferEffectiveDate: dateOf(world, world.day),
      transferorName: "Juniper Home Loans",
    }),
  );
  // Sextant issues the owner's policy once recording is confirmed, which ends its access.
  await putResource(
    world.fetchAs("title"),
    buildDeliveredDocument({
      creator: webid(world, "title"),
      description: `Owner's policy of title insurance for ${usd(LOAN.purchasePriceUsd)}, insuring ${BORROWER.titleVesting}, subject to the exceptions in Schedule B.`,
      identifier: `${TITLE_FILE.commitmentNumber}-OP`,
      iri: alexUrl(world, "mortgage/closing/owners-policy"),
      issued: at(world, "16:00"),
      name: "Owner's title insurance policy",
      propertyAddress: PROPERTY.address,
    }),
  );
  await agents.walletApplyExpiries(world);
};

/** Step 20, second beat (day 52). Juniper tells Alex that servicing will move, at least 15 days ahead. */
export const announceServicingTransfer = async (world: World): Promise<void> => {
  const effective = world.calendar.date(DAY.servicingTransfer);
  if (DAY.servicingTransfer - world.day < 15) {
    throw new Error("the transferor's notice must be sent at least 15 days before the transfer");
  }
  await putResource(
    world.fetchAs("lender"),
    buildLoanTransferNotice({
      borrower: webid(world, "alex"),
      creator: webid(world, "lender"),
      description: `From ${effective}, Marigold Loan Servicing will collect your payments. Juniper Home Loans stops accepting payments on that date. For 60 days after it, a payment sent to Juniper on time is not late.`,
      iri: alexUrl(world, "mortgage/juniper/servicing-transfer-notice"),
      issued: at(world, "09:00"),
      loanNumber: LOAN.loanNumber,
      name: "Notice of servicing transfer",
      noticeKind: MORT.NoticeKind_ServicingTransferFromTransferor,
      paymentProtectionEnds: dateOf(world, DAY.servicingTransfer + 60),
      telephone: "+1-614-555-0190",
      transfereeName: "Marigold Loan Servicing",
      transferEffectiveDate: dateOf(world, DAY.servicingTransfer),
      transferorName: "Juniper Home Loans",
    }),
  );
};

/** Step 21. The new servicer asks for three things; Alex approves and sets up autopay. */
export const connectServicer = async (world: World): Promise<void> => {
  await deliver(world, {
    from: "lender",
    kind: MORT.MessageKind_ServicingBoarding,
    summary:
      "Servicing of loan JHL-1001 transferred to Marigold Loan Servicing. The borrower's consent is not needed for this",
    time: "08:00",
    to: "servicer",
  });
  const request = await requestAccess(world, "G8", "10:00");
  await approveRequest(world, request, "10:02");
  await putResource(
    world.fetchAs("alex"),
    buildPaymentMandate({
      accountLast4: ACCOUNTS[0].accountLast4,
      amountUsd: LOAN.estimatedTotalMonthlyPaymentUsd,
      bankName: ACCOUNTS[0].providerName,
      creator: webid(world, "alex"),
      debitDayOfMonth: 1,
      iri: alexUrl(world, "banking/payment-mandate"),
      issued: at(world, "10:03"),
      loanNumber: LOAN.loanNumber,
      payee: webid(world, "servicer"),
    }),
  );
  const servicer = world.fetchAs("servicer");
  await readDataset(servicer, alexUrl(world, "profile/contact"));
  await readText(servicer, alexUrl(world, CREDENTIALS["evidence-of-insurance"].path));
  await readDataset(servicer, alexUrl(world, "banking/payment-mandate"));
  await putResource(
    servicer,
    buildLoanTransferNotice({
      borrower: webid(world, "alex"),
      creator: webid(world, "servicer"),
      description:
        "Marigold Loan Servicing now services your loan. Send payments to Marigold from today. For 60 days, a payment sent to Juniper Home Loans on time is not late and carries no late fee.",
      iri: alexUrl(world, "mortgage/servicing/transfer-notice"),
      issued: at(world, "10:10"),
      loanNumber: LOAN.loanNumber,
      name: "Welcome: notice of servicing transfer",
      noticeKind: MORT.NoticeKind_ServicingTransferFromTransferee,
      paymentProtectionEnds: dateOf(world, DAY.servicingTransfer + 60),
      telephone: "+1-614-555-0123",
      transfereeName: "Marigold Loan Servicing",
      transferEffectiveDate: dateOf(world, DAY.servicingTransfer),
      transferorName: "Juniper Home Loans",
    }),
  );
  await putResource(
    servicer,
    buildEscrowAccountStatement({
      borrower: webid(world, "alex"),
      creator: webid(world, "servicer"),
      iri: alexUrl(world, "mortgage/servicing/escrow-statement"),
      issued: at(world, "10:12"),
      lineItems: [
        { amountUsd: ESCROW.annualPropertyTaxUsd, name: "Property taxes, per year" },
        { amountUsd: ESCROW.annualInsuranceUsd, name: "Homeowner's insurance, per year" },
      ],
      loanNumber: LOAN.loanNumber,
      monthlyEscrowPaymentUsd: LOAN.monthlyEscrowPaymentUsd,
      name: "Escrow account as transferred",
    }),
  );
};

/** Step 22. Alex withdraws Juniper's grant. */
export const revokeJuniper = async (world: World): Promise<void> => {
  await revokeGrant(world, "G4", "09:00");
};

/** What step 23 found, for the screen and for the test. */
export interface DeniedRead {
  /** The status of reading Alex's asset credential again. */
  readonly assets: number;
  /** The status of reading Juniper's own loan file. */
  readonly ownFile: number;
}

/** Step 23. Juniper sends the same read as in step 8. The pod refuses; Juniper's own file is intact. */
export const readBankDataAgain = async (world: World): Promise<DeniedRead> => {
  const lender = world.fetchAs("lender");
  const assets = await statusOf(lender, alexUrl(world, CREDENTIALS.assets.path));
  const ownFile = await statusOf(lender, loanFile(world, "application"));
  if (assets !== 403)
    throw new PodRequestError("GET", alexUrl(world, CREDENTIALS.assets.path), assets);
  return { assets, ownFile };
};

/** Step 24. The journey ledger reads the grants on record, with their final states. */
export const readLedger = async (world: World): Promise<{ code: string; state: string }[]> =>
  (await grantRecords(world)).map((record) => ({ code: record.code, state: record.state }));

/** The seeded identity credential's URL, re-exported for the apps. */
export { identityCredentialUrl };

export interface Beat {
  /** The tour step this beat belongs to (`TourStep.id`). */
  readonly step: string;
  readonly day: number;
  /** A short name, unique in the journey. */
  readonly name: string;
  readonly run: (world: World) => Promise<unknown>;
}

/** The whole journey in order. `tour.ts` holds the copy; this holds what happens. */
export const JOURNEY: readonly Beat[] = Object.freeze([
  { day: DAY.credentials, name: "welcome", run: welcome, step: "welcome" },
  { day: DAY.credentials, name: "share-employment", run: shareEmployment, step: "payroll-share" },
  { day: DAY.credentials, name: "share-assets", run: shareAssets, step: "bank-share" },
  {
    day: DAY.credentials,
    name: "share-credit-summary",
    run: shareCreditSummary,
    step: "bureau-share",
  },
  { day: DAY.credentials, name: "prove-to-lenders", run: proveToLenders, step: "wallet-prove" },
  {
    day: DAY.credentials,
    name: "lender-b-received",
    run: lenderBReceived,
    step: "lender-b-received",
  },
  {
    day: DAY.application,
    name: "approve-application-access",
    run: approveApplicationAccess,
    step: "apply-consent",
  },
  {
    day: DAY.application,
    name: "submit-application",
    run: submitApplication,
    step: "apply-submit",
  },
  {
    day: DAY.application,
    name: "pull-credit-and-run-aus",
    run: pullCreditAndRunAus,
    step: "desk-credit-aus",
  },
  {
    day: DAY.application,
    name: "aus-source-checks",
    run: ausSourceChecks,
    step: "aus-source-checks",
  },
  {
    day: DAY.loanEstimate,
    name: "deliver-loan-estimate",
    run: deliverLoanEstimate,
    step: "intent-to-proceed",
  },
  {
    day: DAY.loanEstimate,
    name: "intend-to-proceed",
    run: intendToProceed,
    step: "intent-to-proceed",
  },
  { day: DAY.orders, name: "order-services", run: orderServices, step: "order-services" },
  { day: DAY.appraisal, name: "submit-appraisal", run: submitAppraisal, step: "appraisal-report" },
  {
    day: DAY.titleCommitment,
    name: "issue-title-commitment",
    run: issueTitleCommitment,
    step: "title-commitment",
  },
  { day: DAY.insurance, name: "bind-insurance", run: bindInsurance, step: "insurance-bind" },
  {
    day: DAY.clearToClose,
    name: "refresh-employment-and-clear",
    run: refreshEmploymentAndClear,
    step: "refresh-clear",
  },
  {
    day: DAY.closingDisclosure,
    name: "deliver-closing-disclosure",
    run: deliverClosingDisclosure,
    step: "cd-received",
  },
  {
    day: DAY.closingDisclosure,
    name: "acknowledge-closing-disclosure",
    run: acknowledgeClosingDisclosure,
    step: "cd-received",
  },
  { day: DAY.closing, name: "sign-at-closing", run: signAtClosing, step: "closing-sign" },
  { day: DAY.closing, name: "record-with-county", run: recordWithCounty, step: "county-record" },
  { day: DAY.sale, name: "deliver-loan", run: deliverLoan, step: "deliver-loan" },
  {
    day: DAY.transferNotice,
    name: "announce-servicing-transfer",
    run: announceServicingTransfer,
    step: "deliver-loan",
  },
  {
    day: DAY.servicingTransfer,
    name: "connect-servicer",
    run: connectServicer,
    step: "servicer-connect",
  },
  { day: DAY.revoke, name: "revoke-juniper", run: revokeJuniper, step: "revoke-juniper" },
  { day: DAY.revoke, name: "read-bank-data-again", run: readBankDataAgain, step: "denied-read" },
  { day: DAY.revoke, name: "read-ledger", run: readLedger, step: "ledger" },
]);
