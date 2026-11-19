// AUTHORED-BY Claude Opus 5.5
/** Plumbline's screens: the order board, the order detail, the field app and review. */

import { APPRAISAL, DAY, FIGURE_TAG } from "@mortgage/content/mortgage/facts";
import { ORGS } from "@mortgage/content/orgs";
import { MORT } from "@mortgage/data-model";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CatchUp, OutcomeNote, podPath, Refusal } from "./components.tsx";
import {
  type FieldFacts,
  type InboxEntry,
  ORDER_NUMBER,
  type OrderView,
  probeCredit,
  type ReportView,
  readFieldFacts,
  readInbox,
  readOrder,
  readReport,
  urls,
} from "./data.ts";
import { useInspection } from "./inspection.ts";
import { org } from "./org.ts";
import { journey, useAction, useCatchUp, usePodState, worldOn } from "./runtime.ts";
import {
  canSubmit,
  INSPECTION_ITEMS,
  messageKindLabel,
  STAGES,
  shortDate,
  stageOf,
  usd,
} from "./view.ts";

const STEP = "appraisal-report";
const ORDER_PATH = `/orders/${ORDER_NUMBER}`;
const appraiser = ORGS.appraisal.altPersonas?.[0]?.name ?? "the panel appraiser";

interface Desk {
  order: OrderView | undefined;
  inbox: InboxEntry[];
  report: ReportView | undefined;
}

async function readDesk(): Promise<Desk> {
  const [order, inbox, report] = await Promise.all([readOrder(), readInbox(), readReport()]);
  return { inbox, order, report };
}

function useDesk() {
  return usePodState(readDesk, ["appraisal", "lender"]);
}

const ordersIn = (inbox: InboxEntry[]) =>
  inbox.filter((entry) => entry.kind === MORT.MessageKind_ServiceOrder);

export function Board() {
  useEffect(() => applyDocumentMeta(org, "Order board"), []);
  const { outcome } = useDesk();
  const { done } = useInspection();
  if (outcome.state !== "ok") return <OutcomeNote outcome={outcome} />;
  const { order, inbox, report } = outcome.value;
  const stage = stageOf({
    delivered: order?.delivered ?? false,
    inspected: done,
    orderReadable: order !== undefined,
    orderReceived: ordersIn(inbox).length > 0,
    reported: report !== undefined,
  });
  return (
    <>
      <div className="page-head">
        <h1>Order board</h1>
        <p className="muted">
          Orders from lenders, assigned to panel appraisers by rotation. {inbox.length} message
          {inbox.length === 1 ? "" : "s"} in the order inbox.
        </p>
      </div>
      <ol className="board" aria-label="Order stages">
        {STAGES.map((column) => (
          <li key={column} className="column">
            <h2 className="column-head">
              {column} <span className="count">{stage === column ? 1 : 0}</span>
            </h2>
            {stage === column && order !== undefined ? (
              <Link href={ORDER_PATH} className="ticket">
                <span className="ticket-no">{order.number}</span>
                <span>{report?.address ?? "Subject property"}</span>
                <span className="muted">
                  {order.customer} · loan {order.loanNumber}
                </span>
                <span className="muted">Appraiser: {appraiser}</span>
              </Link>
            ) : stage === column ? (
              <p className="ticket muted">Order message received; the order is not yet shared.</p>
            ) : null}
          </li>
        ))}
      </ol>
      <CatchUp
        needed={stage === undefined}
        step={STEP}
        label="No lender has ordered an appraisal yet. Juniper orders one at step 12."
      />
    </>
  );
}

export function OrderDetail() {
  useEffect(() => applyDocumentMeta(org, `Order ${ORDER_NUMBER}`), []);
  const { outcome } = useDesk();
  const probe = useAction();
  const [probeStatus, setProbeStatus] = useState<number>();
  if (outcome.state !== "ok") return <OutcomeNote outcome={outcome} />;
  const { order, inbox, report } = outcome.value;
  if (order === undefined) {
    return (
      <>
        <h1>Order {ORDER_NUMBER}</h1>
        <CatchUp
          needed
          step={STEP}
          label="This order has not been placed yet. Juniper places it at step 12."
        />
      </>
    );
  }
  return (
    <div className="detail">
      <CatchUp
        needed={false}
        step={STEP}
        label="This order has not been placed yet. Juniper places it at step 12."
      />
      <div className="page-head">
        <h1>Order {order.number}</h1>
        <p className="status-line">
          <span className={`pill ${report === undefined ? "open" : "closed"}`}>
            {report === undefined ? "Open" : order.delivered ? "Delivered" : "Report sent"}
          </span>{" "}
          Ordered {shortDate(order.ordered)} by {order.customer} for loan {order.loanNumber}
        </p>
      </div>
      <section className="panel" aria-labelledby="engagement">
        <h2 id="engagement">Engagement</h2>
        <dl className="facts">
          <dt>Client</dt>
          <dd>{order.customer}</dd>
          <dt>Product</dt>
          <dd>Single-family appraisal (redesigned URAR)</dd>
          <dt>Assigned to</dt>
          <dd>{appraiser}, panel appraiser</dd>
          <dt>Coordinator</dt>
          <dd>{org.persona?.name}</dd>
        </dl>
      </section>
      <section className="panel notice" aria-labelledby="independence">
        <h2 id="independence">Independence</h2>
        <p>
          {appraiser} was assigned from Plumbline's panel by rotation. The lender's sales staff did
          not choose the appraiser and may not influence the value. Questions about the report go
          through Plumbline, not to the appraiser.
        </p>
      </section>
      <section className="panel" aria-labelledby="access">
        <h2 id="access">What we may read in Alex's pod</h2>
        <ul className="access-list">
          <li>
            <code>{podPath(urls.property())}</code>: the property record
          </li>
          <li>
            <code>{podPath(urls.agreement())}</code>: the purchase agreement
          </li>
        </ul>
        <p className="muted">
          Under Alex's grant G5, until the report is delivered. Nothing about Alex's income, assets
          or credit.
        </p>
        <button
          type="button"
          className="secondary"
          disabled={probe.outcome.state === "running"}
          onClick={() =>
            probe.run(async () => {
              setProbeStatus(await probeCredit());
            })
          }
        >
          Try to read Alex's credit summary
        </button>
        {probeStatus === undefined ? null : probeStatus === 401 || probeStatus === 403 ? (
          <Refusal
            status={probeStatus}
            method="GET"
            url={urls.credit()}
            why="G5 covers the property record and the purchase agreement only."
          />
        ) : (
          <p role="status">The pod answered {probeStatus}.</p>
        )}
      </section>
      <section className="panel" aria-labelledby="messages">
        <h2 id="messages">Order inbox</h2>
        <table className="grid">
          <thead>
            <tr>
              <th scope="col">Received</th>
              <th scope="col">Kind</th>
              <th scope="col">From</th>
              <th scope="col">Summary</th>
            </tr>
          </thead>
          <tbody>
            {inbox.map((entry) => (
              <tr key={entry.url}>
                <td>{shortDate(entry.published)}</td>
                <td>{messageKindLabel(entry.kind)}</td>
                <td>{entry.from}</td>
                <td>{entry.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="next">
        <Link href={`${ORDER_PATH}/field`} className="cta">
          Open the field app
        </Link>{" "}
        <Link href={`${ORDER_PATH}/review`}>Review and delivery</Link>
      </p>
    </div>
  );
}

/** Comparable sales on the appraiser's worksheet. Not stored in any pod. */
const COMPARABLES = [
  { address: "9 Larch Lane", area: 1790, price: 419_500, sold: "4 months ago" },
  { address: "31 Meadow Court", area: 1920, price: 436_000, sold: "2 months ago" },
  { address: "112 Fenwick Street", area: 1880, price: 427_250, sold: "5 weeks ago" },
] as const;

export function Field() {
  useEffect(() => applyDocumentMeta(org, "Field app"), []);
  const desk = useDesk();
  const { done, ticked, toggle } = useInspection();
  const action = useAction();
  const catchingUp = useCatchUp().running;
  const deskValue = desk.outcome.state === "ok" ? desk.outcome.value : undefined;
  const needFacts = deskValue?.order !== undefined && deskValue.report === undefined;
  const facts = usePodState<FieldFacts | undefined>(
    () => (needFacts ? readFieldFacts() : Promise.resolve(undefined)),
    ["alex"],
    [needFacts],
  );
  if (deskValue === undefined) return <OutcomeNote outcome={desk.outcome} />;
  const { order, report } = deskValue;
  const factsValue = facts.outcome.state === "ok" ? facts.outcome.value : undefined;
  const submittable = canSubmit({
    delivered: order?.delivered ?? false,
    factsReadable: factsValue !== undefined,
    inspected: done,
    orderReadable: order !== undefined,
    orderReceived: true,
    reported: report !== undefined,
  });
  return (
    <div className="field-stage">
      <section className="phone" aria-label="Field app">
        <div className="phone-bar">
          <span>Plumbline Field</span>
          <span>{appraiser}</span>
        </div>
        <div className="phone-body">
          <h1 className="phone-title">Order {ORDER_NUMBER}</h1>
          <CatchUp
            needed={order === undefined}
            step={STEP}
            label="No order is assigned to you yet. Juniper orders the appraisal at step 12."
          />
          {report !== undefined ? (
            <div className="done-card" role="status">
              <strong>Report delivered.</strong> {usd(report.valueUsd)} for {report.address}. Grant
              G5 ends with delivery: Alex's wallet removes your access when it next applies
              expiries.
              <Link href={`${ORDER_PATH}/review`}>See the signed report</Link>
            </div>
          ) : null}
          {needFacts ? (
            <>
              <section aria-labelledby="subject">
                <h2 id="subject">Subject property</h2>
                <OutcomeNote
                  outcome={facts.outcome}
                  why="Plumbline's grant does not cover this read now."
                />
                {factsValue === undefined ? null : (
                  <dl className="phone-facts">
                    <dt>Address</dt>
                    <dd>{factsValue.property.address.streetAddress}</dd>
                    <dt>Parcel</dt>
                    <dd>{factsValue.property.parcelNumber}</dd>
                    <dt>Built</dt>
                    <dd>{factsValue.property.yearBuilt}</dd>
                    <dt>Floor area</dt>
                    <dd>{factsValue.property.floorSizeSqFt.toLocaleString("en-US")} sq ft</dd>
                    <dt>Rooms</dt>
                    <dd>
                      {factsValue.property.bedrooms ?? "?"} bed ·{" "}
                      {factsValue.property.bathrooms ?? "?"} bath
                    </dd>
                    <dt>Construction</dt>
                    <dd>
                      {factsValue.property.constructionType},{" "}
                      {factsValue.property.roofType.toLowerCase()} roof
                    </dd>
                    <dt>Contract price</dt>
                    <dd>{usd(factsValue.agreement.purchasePriceUsd)}</dd>
                    <dt>Seller</dt>
                    <dd>{factsValue.agreement.sellerName}</dd>
                  </dl>
                )}
                <p className="phone-source">Read from Alex's pod under G5.</p>
              </section>
              <section aria-labelledby="checklist">
                <h2 id="checklist">Inspection</h2>
                <ul className="checklist">
                  {INSPECTION_ITEMS.map((item, index) => (
                    <li key={item}>
                      <label>
                        <input
                          type="checkbox"
                          checked={ticked[index] ?? false}
                          onChange={() => toggle(index)}
                        />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="comps">
                <h2 id="comps">Comparables</h2>
                <ul className="comps">
                  {COMPARABLES.map((comp) => (
                    <li key={comp.address}>
                      <strong>{comp.address}</strong>
                      <span>
                        {usd(comp.price)} · {comp.area.toLocaleString("en-US")} sq ft · sold{" "}
                        {comp.sold}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="phone-source">
                  Appraiser's worksheet, not from any pod. {FIGURE_TAG}.
                </p>
              </section>
              <section aria-labelledby="value">
                <h2 id="value">Value</h2>
                <p className="big-value">{usd(APPRAISAL.appraisedValueUsd)}</p>
                <p className="phone-source">{FIGURE_TAG}.</p>
              </section>
            </>
          ) : null}
          <button
            type="button"
            className="big-button"
            data-tour="appraisal-submit-report"
            disabled={!submittable || catchingUp || action.outcome.state === "running"}
            onClick={() =>
              action.run(async () =>
                (await journey()).submitAppraisal(await worldOn(DAY.appraisal)),
              )
            }
          >
            {action.outcome.state === "running" ? "Signing and sending…" : "Submit the report"}
          </button>
          <OutcomeNote outcome={action.outcome} />
        </div>
      </section>
    </div>
  );
}

export function Review() {
  useEffect(() => applyDocumentMeta(org, "Review and delivery"), []);
  const { outcome } = useDesk();
  if (outcome.state !== "ok") return <OutcomeNote outcome={outcome} />;
  const { order, report } = outcome.value;
  return (
    <div className="detail">
      <div className="page-head">
        <h1>Review and delivery</h1>
        <p className="muted">
          The signed report as it sits in Plumbline's store, and its delivery.
        </p>
      </div>
      <CatchUp
        needed={report === undefined}
        step="title-commitment"
        label="No report has been submitted yet. The appraiser submits it at step 13."
      />
      {report === undefined ? null : (
        <>
          <section className="panel" aria-labelledby="report">
            <h2 id="report">Appraisal report {ORDER_NUMBER}</h2>
            <dl className="facts">
              <dt>Property</dt>
              <dd>{report.address}</dd>
              <dt>Appraised value</dt>
              <dd>
                {usd(report.valueUsd)} <span className="muted">({FIGURE_TAG})</span>
              </dd>
              <dt>Appraiser</dt>
              <dd>
                {report.appraiser}, licence {report.licenseId}
              </dd>
              <dt>Signed</dt>
              <dd>{shortDate(report.issued)}, as a verifiable credential</dd>
              <dt>Stored at</dt>
              <dd>
                <code>{podPath(report.url)}</code>
              </dd>
            </dl>
          </section>
          <section className="panel" aria-labelledby="delivery">
            <h2 id="delivery">Delivery</h2>
            <p>
              {order?.delivered
                ? `${order.customer} checked the signature and marked order ${order.number} delivered. As creditor, it puts Alex's copy in Alex's pod.`
                : "Sent to the lender's inbox; the lender has not yet marked the order delivered."}
            </p>
            <p className="muted">
              Plumbline's grant G5 ends with delivery. The copy in Alex's pod is the evidence;
              Alex's wallet sees it and removes the access rule when it next applies expiries.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
