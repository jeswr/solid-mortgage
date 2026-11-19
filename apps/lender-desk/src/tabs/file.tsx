// AUTHORED-BY Claude Opus 5.5
/**
 * The loan file's reading tabs: Summary, 1003, AUS, Appraisal, Title, Insurance, Disclosures,
 * Closing. Each reads what it shows from a pod: Juniper's own records, what a partner shared
 * with Juniper in its own pod, or Alex's pod under grant G4 (refused once G4 is withdrawn).
 */
import { CREDENTIALS } from "@mortgage/content/mortgage/journey";
import {
  AppraisalCredential,
  ClosingDisclosure,
  EvidenceOfInsuranceCredential,
  InboxMessage,
  LoanEstimate,
  RecordedInstrument,
  TitleCommitmentCredential,
} from "@mortgage/data-model";
import { appUrl } from "@mortgage/demo-kit/urls";
import { podUrl } from "@mortgage/pod-runtime";
import { SHARED, useLoanFile, useRead } from "../file.tsx";
import { isOk, type Loaded, list, load, oks } from "../pod.ts";
import { Chip, day, Facts, Mono, NotLoaded, Panel, stateChip } from "../ui.tsx";
import { milestones, podPath, usd } from "../view.ts";
import { issuerName } from "./names.ts";

const term = (iri: string | undefined) =>
  iri === undefined ? "—" : (iri.split(/[#/]/).pop() ?? iri).replace(/_/g, " ");

export function SummaryTab() {
  const file = useLoanFile();
  const application = file.application;
  const inbox = useRead(async () => {
    const members = await list(podUrl("lender", "inbox/"));
    if (!isOk(members)) return { members, messages: [] };
    const messages = await Promise.all(
      members.value
        .filter((url) => !url.endsWith("/"))
        .slice(-12)
        .map((url) => load(url, InboxMessage)),
    );
    return { members, messages };
  });
  return (
    <>
      <Panel title="Milestones">
        <ol className="milestones">
          {milestones(file.state).map((step) => (
            <li key={step.label} className={`ms ms-${step.stage}`}>
              <span className="ms-dot" aria-hidden="true" />
              {step.label}
              <span className="visually-hidden">
                {step.stage === "done" ? " (done)" : step.stage === "current" ? " (current)" : ""}
              </span>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel title="Loan" aside={stateChip(application)}>
        <NotLoaded loaded={application} what="application" />
        {isOk(application) && (
          <Facts
            rows={[
              ["Loan number", <Mono key="n">JHL-1001</Mono>],
              ["Borrower", issuerName(application.value.submittedByIri)],
              [
                "Property",
                `${application.value.subjectProperty.address.streetAddress}, ${application.value.subjectProperty.address.addressLocality}`,
              ],
              ["Amount", `${usd(application.value.requestedAmount.amountValue)} (illustrative)`],
              [
                "Term",
                `${application.value.loanTermMonths} months, ${term(application.value.amortizationType)}`,
              ],
              ["Application date", <Mono key="d">{day(application.value.created)}</Mono>],
            ]}
          />
        )}
      </Panel>
      <Panel title="Inbox (organisation to organisation)" aside={stateChip(inbox?.members)}>
        <NotLoaded loaded={inbox?.members} what="inbox" />
        {inbox !== undefined && inbox.messages.length > 0 && (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th scope="col">Received</th>
                  <th scope="col">From</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Summary</th>
                </tr>
              </thead>
              <tbody>
                {oks(inbox.messages).map((message) => (
                  <tr key={message.url}>
                    <td>
                      <Mono>{day(message.value.published)}</Mono>
                    </td>
                    <td>{issuerName(message.value.actorIri)}</td>
                    <td>
                      <Mono>{term(message.value.messageKind).replace("MessageKind-", "")}</Mono>
                    </td>
                    <td>{message.value.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {inbox !== undefined && isOk(inbox.members) && inbox.messages.length === 0 && (
          <p className="dim">Nothing received yet.</p>
        )}
      </Panel>
    </>
  );
}

export function UrlaTab() {
  const file = useLoanFile();
  const application = file.application;
  return (
    <>
      <Panel title="Uniform Residential Loan Application (snapshot)" aside={stateChip(application)}>
        <NotLoaded loaded={application} what="application" />
        {isOk(application) && (
          <Facts
            rows={[
              ["Loan purpose", term(application.value.loanPurpose)],
              ["Occupancy", term(application.value.occupancy)],
              ["Amortization", term(application.value.amortizationType)],
              ["Requested amount", usd(application.value.requestedAmount.amountValue)],
              ["Term", `${application.value.loanTermMonths} months`],
              [
                "Subject property",
                `${application.value.subjectProperty.address.streetAddress}, ${application.value.subjectProperty.address.addressLocality}, ${application.value.subjectProperty.address.addressRegion} ${application.value.subjectProperty.address.postalCode}`,
              ],
              ["Submitted by", <Mono key="s">{application.value.submittedByIri}</Mono>],
              ["Held at", <Mono key="h">{podPath(application.url)} (Juniper's pod)</Mono>],
            ]}
          />
        )}
      </Panel>
      <Panel title="Sources">
        <p className="dim">
          Income, assets, credit summary and identity came from Alex's pod, each checked at source.
          Juniper keeps a pointer and a digest, not a copy (see Verifications). The Social Security
          number was typed in the portal and is not stored in any pod.
        </p>
      </Panel>
    </>
  );
}

export function AusTab() {
  const file = useLoanFile();
  const findings = file.findings;
  return (
    <Panel title="Automated underwriting findings" aside={stateChip(findings)}>
      <NotLoaded loaded={findings} what="findings" />
      {isOk(findings) && (
        <>
          <Facts
            rows={[
              ["Casefile", <Mono key="c">{findings.value.identifier ?? "—"}</Mono>],
              ["From", issuerName(findings.value.creatorIri)],
              ["Returned", <Mono key="r">{day(findings.value.issued)}</Mono>],
              ["Held at", <Mono key="h">{podPath(findings.url)} (Castellan's pod)</Mono>],
            ]}
          />
          <p>{findings.value.description}</p>
        </>
      )}
      <p>
        <a href={appUrl("aus", "casefiles/JHL-1001/source-checks")}>
          Open Castellan's source checks
        </a>
      </p>
    </Panel>
  );
}

export function AppraisalTab() {
  const file = useLoanFile();
  const copy = useRead(() =>
    load(
      podUrl("alex", "mortgage/juniper/appraisal"),
      AppraisalCredential,
      podUrl("appraisal", "orders/PV-7731/appraisal"),
    ),
  );
  const order = file.orders.appraisal;
  return (
    <Panel title="Appraisal" aside={stateChip(order)}>
      <p className="dim">
        Ordered through Plumbline, the appraisal management company. The appraiser is assigned from
        its panel by rotation; Juniper's sales staff take no part.
      </p>
      <NotLoaded loaded={copy} what="appraisal report" />
      {isOk(copy) && (
        <Facts
          rows={[
            [
              "Appraised value",
              copy.value.credentialSubject.subjectProperty.appraisedValue === undefined
                ? "—"
                : usd(copy.value.credentialSubject.subjectProperty.appraisedValue.amountValue),
            ],
            ["Appraiser", copy.value.evidence.generatedBy.appraiserName],
            ["Licence", <Mono key="l">{copy.value.evidence.generatedBy.licenseId}</Mono>],
            ["Signed by", issuerName(copy.value.issuer)],
            ["Borrower's copy", <Mono key="b">{podPath(copy.url)} (Alex's pod)</Mono>],
          ]}
        />
      )}
    </Panel>
  );
}

export function TitleTab() {
  const file = useLoanFile();
  const commitment = useRead(() =>
    load(
      podUrl("title", "files/STE-2026-0417/commitment"),
      TitleCommitmentCredential,
      podUrl("alex", "mortgage/closing/title-commitment"),
    ),
  );
  return (
    <Panel title="Title commitment" aside={stateChip(file.orders.title)}>
      <NotLoaded loaded={commitment} what="title commitment" />
      {isOk(commitment) && (
        <>
          <Facts
            rows={[
              [
                "Commitment",
                <Mono key="c">{commitment.value.credentialSubject.commitmentNumber}</Mono>,
              ],
              [
                "Searched through",
                <Mono key="s">{day(commitment.value.credentialSubject.searchedThrough)}</Mono>,
              ],
              ["Vested owner", commitment.value.credentialSubject.vestedOwner],
              ["Loan policy", usd(commitment.value.credentialSubject.loanPolicyAmountUsd)],
              ["Held at", <Mono key="h">{podPath(commitment.url)} (Sextant's file)</Mono>],
            ]}
          />
          <h4>Schedule B-I requirements</h4>
          <ul>
            {[...commitment.value.credentialSubject.requirements].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h4>Schedule B-II exceptions</h4>
          <ul>
            {[...commitment.value.credentialSubject.exceptions].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

export function InsuranceTab() {
  const evidence = useRead(() =>
    load(podUrl("alex", CREDENTIALS["evidence-of-insurance"].path), EvidenceOfInsuranceCredential),
  );
  return (
    <Panel title="Evidence of insurance (read where it lies)" aside={stateChip(evidence)}>
      <NotLoaded loaded={evidence} what="evidence of insurance" />
      {isOk(evidence) && (
        <Facts
          rows={[
            ["Policy", <Mono key="p">{evidence.value.credentialSubject.policyNumber}</Mono>],
            ["Insurer", issuerName(evidence.value.issuer)],
            ["Dwelling", usd(evidence.value.credentialSubject.dwellingCoverageUsd)],
            ["Mortgagee clause", evidence.value.credentialSubject.mortgageeClause],
            [
              "Period",
              `${day(evidence.value.credentialSubject.policyStart)} to ${day(evidence.value.credentialSubject.policyEnd)}`,
            ],
          ]}
        />
      )}
    </Panel>
  );
}

export function DisclosuresTab() {
  const estimate = useRead(() =>
    load(podUrl("alex", "mortgage/juniper/loan-estimate"), LoanEstimate),
  );
  const closing = useRead(() =>
    load(podUrl("alex", "mortgage/juniper/closing-disclosure"), ClosingDisclosure),
  );
  return (
    <>
      <Panel title="Loan Estimate" aside={stateChip(estimate)}>
        <NotLoaded loaded={estimate} what="Loan Estimate" />
        {isOk(estimate) && (
          <Facts
            rows={[
              ["Delivered", <Mono key="d">{day(estimate.value.issued)}</Mono>],
              ["Application", <Mono key="a">{day(estimate.value.applicationDate)}</Mono>],
              [
                "Intent to proceed",
                estimate.value.intentToProceedDate === undefined ? (
                  <Chip key="i" tone="warn">
                    not yet
                  </Chip>
                ) : (
                  <Mono key="i">{day(estimate.value.intentToProceedDate)}</Mono>
                ),
              ],
              [
                "Rate / APR",
                `${estimate.value.interestRatePercent}% / ${estimate.value.aprPercent}%`,
              ],
              ["Cash to close", `${usd(estimate.value.cashToCloseUsd)} (illustrative)`],
            ]}
          />
        )}
      </Panel>
      <Panel title="Closing Disclosure" aside={stateChip(closing)}>
        <NotLoaded loaded={closing} what="Closing Disclosure" />
        {isOk(closing) && (
          <Facts
            rows={[
              ["Delivered", <Mono key="d">{day(closing.value.issued)}</Mono>],
              [
                "Received",
                closing.value.receivedDate === undefined ? (
                  <Chip key="r" tone="warn">
                    not yet
                  </Chip>
                ) : (
                  <Mono key="r">{day(closing.value.receivedDate)}</Mono>
                ),
              ],
              ["Closing", <Mono key="c">{day(closing.value.closingDate)}</Mono>],
            ]}
          />
        )}
      </Panel>
    </>
  );
}

function RecordRow({
  label,
  record,
}: {
  label: string;
  record: Loaded<RecordedInstrument> | undefined;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        {stateChip(record)}{" "}
        {isOk(record) && (
          <Mono>
            {record.value.recordingReference} · {day(record.value.recordedAt)}
          </Mono>
        )}
      </td>
    </tr>
  );
}

export function ClosingTab() {
  const file = useLoanFile();
  const deed = useRead(() => load(SHARED.deedRecord(), RecordedInstrument), []);
  return (
    <>
      <Panel title="Clear to close" aside={stateChip(file.decision)}>
        <p className="dim">
          Closing runs in Sextant's closing room. Juniper sends its closing instructions with the
          underwriting decision; the signing is simulated and says so.
        </p>
        <p>
          <a href={appUrl("title", "files/STE-2026-0417/closing")}>Open Sextant's closing room</a>
        </p>
      </Panel>
      <Panel title="County record (public register)">
        <p className="dim">The land register is public by law: no grant is needed to read it.</p>
        <table className="grid">
          <tbody>
            <RecordRow label="Warranty deed" record={deed} />
            <RecordRow label="Mortgage" record={file.mortgageRecord} />
          </tbody>
        </table>
      </Panel>
    </>
  );
}
