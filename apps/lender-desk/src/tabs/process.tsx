// AUTHORED-BY Claude Opus 5.5
/**
 * The tabs that carry tour actions: Credit (step 9), Verifications (steps 12 and 23),
 * Conditions (step 16) and Post-closing (step 20). Each button calls the journey function the
 * content README names; each panel shows what the pods returned.
 */
import { DAY } from "@mortgage/content/mortgage/facts";
import {
  announceServicingTransfer,
  type DeniedRead,
  deliverLoan,
  orderServices,
  pullCreditAndRunAus,
  readBankDataAgain,
  refreshEmploymentAndClear,
} from "@mortgage/content/mortgage/journey";
import { PodRequestError } from "@mortgage/content/mortgage/world";
import { CreditScoreNotice, LoanTransferNotice, SCHEMA } from "@mortgage/data-model";
import { podUrl } from "@mortgage/pod-runtime";
import { useState } from "react";
import { runOn } from "../demo.ts";
import { useDesk, whoLabel } from "../desk.tsx";
import { useLoanFile, useRead } from "../file.tsx";
import { isOk, type Loaded, load, oks } from "../pod.ts";
import { ActionBar, Chip, day, Facts, Mono, NotLoaded, Panel, stateChip } from "../ui.tsx";
import {
  canDeliverLoan,
  canOrderServices,
  canPullCredit,
  canReadAgain,
  canRefreshAndClear,
  employmentFreshness,
  lastSegment,
  podPath,
  shortDigest,
  usd,
} from "../view.ts";
import { issuerName } from "./names.ts";

/** Step 9. Juniper's own tri-merge pull, and the casefile submission to Castellan. */
export function CreditTab() {
  const file = useLoanFile();
  const { role } = useDesk();
  const notice = useRead(() =>
    load(podUrl("alex", "mortgage/juniper/score-notice"), CreditScoreNotice),
  );
  const report = file.creditReport;
  return (
    <>
      <Panel
        title="Tri-merge credit report"
        aside={<Chip tone="info">bureau to lender · not through the pod</Chip>}
      >
        <NotLoaded loaded={report} what="credit report" />
        {isOk(report) && (
          <>
            <Facts
              rows={[
                ["Report", <Mono key="r">{report.value.reportNumber}</Mono>],
                ["Held at", <Mono key="u">{podPath(report.url)} (Quillon's pod)</Mono>],
                ["Permissible purpose", report.value.permissiblePurpose],
                [
                  "Consumer's authorisation",
                  <Mono key="a">{podPath(report.value.authorisedByIri)} (Alex's pod)</Mono>,
                ],
                [
                  "Monthly debt",
                  report.value.totalMonthlyDebtUsd === undefined
                    ? "—"
                    : usd(report.value.totalMonthlyDebtUsd),
                ],
              ]}
            />
            <div className="table-wrap">
              <table className="grid">
                <caption>Scores used (the lender uses the middle one)</caption>
                <thead>
                  <tr>
                    <th scope="col">Repository</th>
                    <th scope="col">Model</th>
                    <th scope="col" className="num">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.value.scores.map((score) => (
                    <tr key={score.source}>
                      <td>{score.source}</td>
                      <td>
                        <Mono>{lastSegment(score.scoreModel).split("#").pop()}</Mono>
                      </td>
                      <td className="num">
                        <Mono>{score.score}</Mono>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
      <Panel title="Score disclosure in Alex's pod" aside={stateChip(notice)}>
        <NotLoaded loaded={notice} what="score notice" />
        {isOk(notice) && (
          <p>
            <Mono>{podPath(notice.url)}</Mono> · {notice.value.name} · written{" "}
            {day(notice.value.issued)}. The FCRA notice and the scores Juniper used.
          </p>
        )}
      </Panel>
      <ActionBar
        tour="desk-credit-aus"
        label="Pull credit and run underwriting"
        who={whoLabel(role)}
        gate={canPullCredit(file.state)}
        run={async () => {
          await runOn(DAY.application, pullCreditAndRunAus);
          return "Report received from Quillon, score notice written to Alex's pod, findings received from Castellan.";
        }}
        onDone={file.reload}
      />
    </>
  );
}

const ORDER_LABEL = {
  appraisal: "Appraisal (through Plumbline, the AMC)",
  "credit-report": "Tri-merge credit report",
  title: "Title search, commitment and settlement",
} as const;

/** The pointers Juniper keeps: URL, digest, issuer, as-of. Not copies of the credentials. */
function Pointers() {
  const file = useLoanFile();
  const { calendar } = useDesk();
  const noteDate = calendar.date(DAY.closing);
  return (
    <Panel title="Credential pointers (Juniper's own records)" aside={stateChip(file.pointerList)}>
      <NotLoaded loaded={file.pointerList} what="pointers" />
      {file.pointers.length > 0 && (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th scope="col">Credential</th>
                <th scope="col">Issuer</th>
                <th scope="col">As of</th>
                <th scope="col">Checked</th>
                <th scope="col">SHA-256</th>
                <th scope="col">Signature · status</th>
              </tr>
            </thead>
            <tbody>
              {file.pointers.map((pointer) =>
                isOk(pointer) ? (
                  <tr key={pointer.url}>
                    <td>
                      <Mono>{podPath(pointer.value.url)}</Mono>
                    </td>
                    <td>{issuerName(pointer.value.issuerIri)}</td>
                    <td>
                      <Mono>{day(pointer.value.asOf)}</Mono>
                      {lastSegment(pointer.url) === "employment-income" && (
                        <div className="dim">
                          {
                            employmentFreshness(
                              pointer.value.asOf.toISOString().slice(0, 10),
                              noteDate,
                            ).text
                          }
                        </div>
                      )}
                    </td>
                    <td>
                      <Mono>{day(pointer.value.checkedAt)}</Mono>
                    </td>
                    <td>
                      <Mono>{shortDigest(pointer.value.sha256)}</Mono>
                    </td>
                    <td>
                      <Chip tone={pointer.value.signatureVerified ? "ok" : "warn"}>
                        {pointer.value.signatureVerified ? "verified" : "unchecked"}
                      </Chip>{" "}
                      <Chip tone={pointer.value.statusChecked ? "ok" : "warn"}>
                        {pointer.value.statusChecked ? "not revoked" : "status unchecked"}
                      </Chip>
                    </td>
                  </tr>
                ) : (
                  <tr key={pointer.url}>
                    <td colSpan={6}>
                      <NotLoaded loaded={pointer} what={lastSegment(pointer.url)} />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Orders() {
  const file = useLoanFile();
  return (
    <Panel title="Orders">
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Order</th>
              <th scope="col">Ordered</th>
              <th scope="col">Status</th>
              <th scope="col">Borrower data</th>
            </tr>
          </thead>
          <tbody>
            {(["credit-report", "appraisal", "title"] as const).map((service) => {
              const order = file.orders[service];
              return (
                <tr key={service}>
                  <td>{ORDER_LABEL[service]}</td>
                  <td>
                    <Mono>{isOk(order) ? order.value.orderNumber : "—"}</Mono>
                  </td>
                  <td>
                    <Mono>{isOk(order) ? day(order.value.orderDate) : "—"}</Mono>
                  </td>
                  <td>
                    {isOk(order) ? (
                      order.value.orderStatus === SCHEMA.OrderDelivered ? (
                        <Chip tone="ok">delivered</Chip>
                      ) : (
                        <Chip tone="warn">processing</Chip>
                      )
                    ) : (
                      <Chip tone="idle">not ordered</Chip>
                    )}
                  </td>
                  <td className="dim">
                    {service === "credit-report"
                      ? "Alex's authorisation only"
                      : service === "appraisal"
                        ? "Asks Alex: property, contract (G5)"
                        : "Asks Alex: name, contract (G6)"}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td>Flood zone determination</td>
              <td>—</td>
              <td>—</td>
              <td>
                <Chip tone="idle">
                  {file.state.appraisalOrder === "none" ? "not ordered" : "ordered"}
                </Chip>
              </td>
              <td className="dim">Address only: no pod request</td>
            </tr>
            <tr>
              <td>IRS tax transcripts (Form 4506-C)</td>
              <td>—</td>
              <td>—</td>
              <td>
                <Chip tone="idle">
                  {file.state.appraisalOrder === "none" ? "not ordered" : "ordered"}
                </Chip>
              </td>
              <td className="dim">IRS answers Juniper: no pod request</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const CAVEAT =
  "Juniper still holds the loan file it is required to keep. What has ended is its access to Alex's data at source.";

type Outcome = { kind: "denied"; read: DeniedRead } | { kind: "allowed"; status: number };

/** Step 23. The same read as on application day, now against a withdrawn grant. */
function ReadAgain() {
  const file = useLoanFile();
  const { role } = useDesk();
  const [outcome, setOutcome] = useState<Outcome>();
  const assetsPath = "/credentials/assets";
  return (
    <Panel
      title="Read bank data again"
      aside={<Chip tone="info">GET {assetsPath} on Alex's pod</Chip>}
    >
      <p className="dim">
        Sends Juniper's read of Alex's asset credential at source, the read the application used.
      </p>
      <ActionBar
        tour="desk-read-again"
        label="Read bank data again"
        who={whoLabel(role)}
        gate={canReadAgain(file.state)}
        run={async () => {
          setOutcome(undefined);
          try {
            const read = await runOn(DAY.revoke, readBankDataAgain);
            setOutcome({ kind: "denied", read });
            return "The pod refused the read.";
          } catch (error) {
            if (error instanceof PodRequestError && error.status < 400) {
              setOutcome({ kind: "allowed", status: error.status });
              return `The pod allowed the read (${error.status}): Alex's grant G4 is still in force.`;
            }
            throw error;
          }
        }}
      />
      {outcome?.kind === "denied" && (
        <div className="denied" data-testid="denied-result">
          <p className="denied-line">
            <Chip tone="bad">{outcome.read.assets} Forbidden</Chip> <Mono>GET {assetsPath}</Mono> ·
            Alex's pod refused Juniper. Grant G4 was withdrawn.
          </p>
          <p className="caveat">{CAVEAT}</p>
          <div className="table-wrap">
            <table className="grid">
              <caption>Records Juniper keeps in its own pod (read just now)</caption>
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Where</th>
                  <th scope="col">Read</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Loan application (snapshot)</td>
                  <td>
                    <Mono>/loans/JHL-1001/application</Mono>
                  </td>
                  <td>
                    <Chip tone={outcome.read.ownFile === 200 ? "ok" : "bad"}>
                      {outcome.read.ownFile}
                    </Chip>
                  </td>
                </tr>
                {oks(file.pointers).map((pointer) => (
                  <tr key={pointer.url}>
                    <td>Pointer: {lastSegment(pointer.url)}</td>
                    <td>
                      <Mono>{podPath(pointer.url)}</Mono>
                    </td>
                    <td>
                      <Chip tone="ok">kept</Chip>
                    </td>
                  </tr>
                ))}
                {isOk(file.decision) && (
                  <tr>
                    <td>Underwriting decision</td>
                    <td>
                      <Mono>{podPath(file.decision.url)}</Mono>
                    </td>
                    <td>
                      <Chip tone="ok">kept</Chip>
                    </td>
                  </tr>
                )}
                {isOk(file.closingRecord) && (
                  <tr>
                    <td>Closing record</td>
                    <td>
                      <Mono>{podPath(file.closingRecord.url)}</Mono>
                    </td>
                    <td>
                      <Chip tone="ok">kept</Chip>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {outcome?.kind === "allowed" && (
        <p className="action-ok" role="status">
          <Chip tone="ok">{outcome.status}</Chip> Allowed by grant G4. Withdraw it in Alex's wallet
          to see the refusal.
        </p>
      )}
    </Panel>
  );
}

/** Steps 12 and 23. */
export function VerificationsTab() {
  const file = useLoanFile();
  const { role } = useDesk();
  return (
    <>
      <Pointers />
      <Orders />
      <ActionBar
        tour="desk-order-services"
        label="Order services"
        who={whoLabel(role)}
        gate={canOrderServices(file.state)}
        run={async () => {
          await runOn(DAY.orders, orderServices);
          return "Appraisal and title ordered; each provider asked Alex for its part and Alex approved. Flood and transcripts ordered outside the pod.";
        }}
        onDone={file.reload}
      />
      <ReadAgain />
    </>
  );
}

/** Step 16. */
export function ConditionsTab() {
  const file = useLoanFile();
  const { role, calendar } = useDesk();
  const employment = file.pointers.find(
    (pointer) => isOk(pointer) && lastSegment(pointer.url) === "employment-income",
  );
  const noteDate = calendar.date(DAY.closing);
  const freshness = isOk(employment)
    ? employmentFreshness(employment.value.asOf.toISOString().slice(0, 10), noteDate)
    : undefined;
  const decision = file.decision;
  const conditions = [
    {
      done: file.state.appraisalOrder === "delivered",
      label: "Appraisal supports the value",
    },
    { done: file.state.titleOrder === "delivered", label: "Title commitment received" },
    {
      done: file.pointers.some(
        (pointer) => isOk(pointer) && lastSegment(pointer.url) === "evidence-of-insurance",
      ),
      label: "Evidence of homeowner's insurance, Juniper as mortgagee",
    },
    {
      done: freshness?.withinLimit ?? false,
      label: "Employment verified no more than 10 business days before the note date",
    },
  ];
  return (
    <>
      <Panel title="Conditions from the findings">
        <ol className="conditions">
          {conditions.map((condition) => (
            <li key={condition.label}>
              <Chip tone={condition.done ? "ok" : "warn"}>
                {condition.done ? "cleared" : "open"}
              </Chip>{" "}
              {condition.label}
            </li>
          ))}
        </ol>
        <p className="dim">
          Note date (closing): <Mono>{noteDate}</Mono>.{" "}
          {freshness === undefined
            ? "No employment pointer on file."
            : `Employment as of ${employment && isOk(employment) ? day(employment.value.asOf) : "—"}: ${freshness.text}.`}
        </p>
      </Panel>
      <Panel title="Underwriting decision" aside={stateChip(decision)}>
        <NotLoaded loaded={decision} what="decision" />
        {isOk(decision) && (
          <Facts
            rows={[
              [
                "Status",
                <Chip key="s" tone="ok">
                  {lastSegment(decision.value.decisionStatus).split("-").pop()}
                </Chip>,
              ],
              [
                "Approved amount",
                decision.value.approvedAmount === undefined
                  ? "—"
                  : usd(decision.value.approvedAmount.amountValue),
              ],
              ["Decided", <Mono key="d">{day(decision.value.issued)}</Mono>],
              [
                "AUS recommendation",
                "Approve/Eligible (a recommendation; the underwriter decides)",
              ],
            ]}
          />
        )}
      </Panel>
      <ActionBar
        tour="desk-refresh-clear"
        label="Refresh employment and clear to close"
        who={whoLabel(role)}
        gate={canRefreshAndClear(file.state)}
        run={async () => {
          await runOn(DAY.clearToClose, refreshEmploymentAndClear);
          return "Ledgerly re-issued the employment credential and revoked the old one. Cleared to close.";
        }}
        onDone={file.reload}
      />
    </>
  );
}

function NoticeRow({
  label,
  notice,
}: {
  label: string;
  notice: Loaded<LoanTransferNotice> | undefined;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        {stateChip(notice)} {isOk(notice) && `effective ${day(notice.value.transferEffectiveDate)}`}
      </td>
    </tr>
  );
}

/** Step 20. */
export function PostClosingTab() {
  const file = useLoanFile();
  const { role } = useDesk();
  const saleNotice = useRead(() =>
    load(podUrl("alex", "mortgage/juniper/sale-notice"), LoanTransferNotice),
  );
  const transferNotice = useRead(() =>
    load(podUrl("alex", "mortgage/juniper/servicing-transfer-notice"), LoanTransferNotice),
  );
  const record = file.closingRecord;
  return (
    <>
      <Panel title="Closing record (delivered to Castellan)" aside={stateChip(record)}>
        <NotLoaded loaded={record} what="closing record" />
        {isOk(record) && (
          <Facts
            rows={[
              ["Principal", usd(record.value.principalAmount.amountValue)],
              ["Rate", `${record.value.interestRatePercent}%`],
              ["Term", `${record.value.loanTermMonths} months`],
              ["Closed", <Mono key="c">{day(record.value.closingDate)}</Mono>],
              ["Recorded as", <Mono key="r">{record.value.recordingReference}</Mono>],
              ["eNote", <Mono key="e">{record.value.eNoteReference}</Mono>],
            ]}
          />
        )}
      </Panel>
      <Panel title="Purchase confirmation" aside={stateChip(file.purchase)}>
        <NotLoaded loaded={file.purchase} what="purchase confirmation" />
        {isOk(file.purchase) && (
          <p>
            <Mono>{file.purchase.value.identifier}</Mono> · {file.purchase.value.description}
          </p>
        )}
      </Panel>
      <Panel title="Notices in Alex's pod">
        <table className="grid">
          <tbody>
            <NoticeRow
              label="Notice of sale (from Castellan, via Juniper's drawer)"
              notice={saleNotice}
            />
            <NoticeRow label="Notice of servicing transfer" notice={transferNotice} />
          </tbody>
        </table>
        <p className="dim">
          The sale is between Juniper and Castellan. No consent from Alex is needed.
        </p>
      </Panel>
      <ActionBar
        tour="desk-deliver-loan"
        label="Deliver the loan"
        who={whoLabel(role)}
        gate={canDeliverLoan(file.state)}
        run={async () => {
          await runOn(DAY.sale, deliverLoan);
          await runOn(DAY.transferNotice, announceServicingTransfer);
          return "Castellan purchased the loan. The notice of sale and the servicing transfer notice are in Alex's pod.";
        }}
        onDone={file.reload}
      />
    </>
  );
}
