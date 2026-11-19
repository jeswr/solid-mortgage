// AUTHORED-BY Claude Opus 5.5
/**
 * Business banking at Alder Bank (small business loan demo, flows.md section 6, step 1). Northwind
 * asks Alder to keep its cash flow record up to date in Northwind's pod. The click is the consent:
 * Alder's request (grant S1: write one resource, read nothing) is approved by Jordan Blake in
 * Northwind's wallet in the same step, and Alder writes twelve months of its own ledger figures.
 * Alder then tries to read the record back: the pod refuses, because S1 is write-only.
 */
// Signing in the cold-start preparation needs the signing library's Buffer stand-in.
import "@mortgage/vc-kit/browser/buffer";
import "./small-business-loan.css";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import { ORGS } from "@mortgage/content/orgs";
import { loanWorld } from "@mortgage/content/small-business-loan/browser";
import { ACCOUNT_LAST4, DAY, usd } from "@mortgage/content/small-business-loan/facts";
import type { MonthlyCashFlowInit } from "@mortgage/data-model";
import { createPodHooks } from "@mortgage/demo-kit/react";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { note, onEvent, onReset, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import { useEffect, useState } from "react";

const BANK = "bank" as const;
const org = ORGS[BANK];
const runtime = { note, podFetch, ready, setDay };
const journey = () => import("@mortgage/content/small-business-loan/journey");
const cashFlow = () => import("@mortgage/content/small-business-loan/cash-flow");
const grants = () => import("@mortgage/content/small-business-loan/grants");
const worldModule = () => import("@mortgage/content/mortgage/world");

const { useAction, usePodState } = createPodHooks({ events: { onEvent, onReset }, refusalOf });

const month = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC", year: "numeric" });

interface Published {
  readonly months: readonly MonthlyCashFlowInit[];
  readonly url: string;
  /** What the pod answered when Alder read the record back. */
  readonly readBack: number;
}

async function loadGrant() {
  const world = await loanWorld(runtime, BANK);
  const record = await (await grants()).loanGrant(world, "S1");
  return record?.state;
}

/** Step 1: `business`. */
export function BusinessBanking() {
  useEffect(() => applyDocumentMeta(org, "Business banking"), []);
  const { outcome, reload } = usePodState(loadGrant, [BANK]);
  const publish = useAction();
  const [published, setPublished] = useState<Published | undefined>();
  const grant = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <div className="sbl">
      <p className="sbl-eyebrow">Business banking · Northwind Logistics LLC</p>
      <h1>Business banking</h1>
      <p className="sbl-lede">
        Operating account ending <span className="sbl-mono">{ACCOUNT_LAST4}</span>
      </p>
      <section className="sbl-card" aria-labelledby="sbl-pod">
        <h2 id="sbl-pod">Keep Northwind's pod up to date</h2>
        <p>
          We can keep a month-by-month record of this account's cash flow in Northwind's own pod, at{" "}
          <span className="sbl-mono">finance/cash-flow</span>. Northwind decides who reads it. We
          may write that one record and read nothing (grant S1).
        </p>
        <p className="sbl-small" data-testid="bank-s1-state">
          Grant S1:{" "}
          {grant === undefined ? "not yet approved" : grant === "active" ? "active" : grant}
        </p>
        <button
          type="button"
          className="sbl-button"
          data-tour="bank-business-publish-cash-flow"
          disabled={publish.outcome.state === "running"}
          onClick={() =>
            void publish.run(async () => {
              const world = await loanWorld(runtime, BANK, DAY.cashFlow);
              const done = await (await journey()).publishCashFlowStep(world);
              const months = (await cashFlow()).monthsUpTo(world, DAY.cashFlow, DAY.cashFlow);
              const readBack = await (await worldModule()).statusOf(world.fetchAs(BANK), done.url);
              setPublished({ months, readBack, url: done.url });
              reload();
            })
          }
        >
          {publish.outcome.state === "running" ? "Publishing…" : "Keep my pod up to date"}
        </button>
        {publish.outcome.state === "refused" ? (
          <p role="alert" className="sbl-alert">
            <strong>Refused by the pod ({publish.outcome.status}).</strong> Northwind has not
            granted Alder Bank write access to its cash flow record.
          </p>
        ) : null}
        {publish.outcome.state === "error" ? (
          <p role="alert" className="sbl-alert">
            {publish.outcome.message}
          </p>
        ) : null}
      </section>
      {published !== undefined ? (
        <section className="sbl-card" aria-labelledby="sbl-written" data-testid="bank-published">
          <h2 id="sbl-written">Written to Northwind's pod</h2>
          <div className="sbl-scroll">
            <table className="sbl-table">
              <caption className="sbl-small">
                {published.months.length} months, from our ledger
              </caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col" className="num">
                    In
                  </th>
                  <th scope="col" className="num">
                    Out
                  </th>
                  <th scope="col" className="num">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {published.months.map((row) => (
                  <tr key={row.periodStart.toISOString()}>
                    <th scope="row">{month(row.periodStart)}</th>
                    <td className="num">{usd(row.inflowUsd)}</td>
                    <td className="num">{usd(row.outflowUsd)}</td>
                    <td className="num">{usd(row.closingBalanceUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {published.readBack === 200 ? null : (
            <p role="alert" className="sbl-alert" data-testid="bank-read-back">
              <strong>Refused by the pod ({published.readBack}).</strong> We tried to read the
              record back. Grant S1 lets us write it, never read it.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
