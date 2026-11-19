// AUTHORED-BY Claude Opus 5.5
/**
 * Brackenridge Bank's equipment term loan for Northwind (small business loan demo, flows.md
 * section 6, steps 4, 5 and 7).
 *
 * - `loan`: the application. Under grant S2 the desk reads four resources in Northwind's pod,
 *   checks the three credentials at source and measures twelve months of cash flow (the deal
 *   sheet). Before S2 the pod refuses the read.
 * - `loan/decision`: approve with two covenants and write the decision, the loan terms and the
 *   Regulation B notice of action taken into Northwind's pod.
 * - `loan/covenants`: one quarter on, the covenant test reads the cash flow under grant S3.
 */
import "./loan.css";
import { loanWorld } from "@mortgage/content/small-business-loan/browser";
import {
  COVENANTS,
  DAY,
  LOAN,
  LOAN_PAYMENT,
  usd,
} from "@mortgage/content/small-business-loan/facts";
import type {
  Assessment,
  CovenantTest,
  Delivered,
} from "@mortgage/content/small-business-loan/lender";
import type { CashFlowAssessment } from "@mortgage/data-model";
import type { ActionOutcome } from "@mortgage/demo-kit/react";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { note, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { org } from "../../org.ts";
import { type Outcome, startDemo, useAction, usePodState } from "../../runtime.ts";

const LENDER = "business-lender" as const;
const runtime = { note, podFetch, ready, setDay };
const journey = () => import("@mortgage/content/small-business-loan/journey");
const lender = () => import("@mortgage/content/small-business-loan/lender");

async function world(day?: number) {
  await startDemo();
  return loanWorld(runtime, LENDER, day);
}

const dateOnly = (date: Date | undefined) =>
  date === undefined
    ? "–"
    : date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      });

const COVENANT_WORDS: Record<string, string> = {
  "average-balance": `Average balance at least ${usd(COVENANTS.find((c) => c.metric === "average-balance")?.threshold ?? 0)}`,
  dscr: `Debt service coverage at least ${(COVENANTS.find((c) => c.metric === "dscr")?.threshold ?? 0).toFixed(2)}x`,
};

const TABS = [
  { href: "/loan", label: "Application" },
  { href: "/loan/decision", label: "Decision" },
  { href: "/loan/covenants", label: "Covenants" },
] as const;

function LoanPage({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  const [location] = useLocation();
  return (
    <main>
      <p className="muted small">Commercial Credit · Northwind Logistics LLC</p>
      <h1>{title}</h1>
      <p className="lede">
        {LOAN.name} · {usd(LOAN.principalUsd)} · {LOAN.termMonths} months at {LOAN.interestRate}% ·{" "}
        {LOAN.purpose.toLowerCase()} · loan <span className="mono">{LOAN.loanNumber}</span>
      </p>
      <nav aria-label="This loan">
        <ul className="loan-tabs">
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link href={tab.href} aria-current={location === tab.href ? "page" : undefined}>
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </main>
  );
}

function ActionResult({
  outcome,
  ok,
  refused,
}: {
  outcome: ActionOutcome;
  ok: string;
  refused: string;
}) {
  if (outcome.state === "ok") {
    return (
      <p role="status" className="loan-ok">
        {ok}
      </p>
    );
  }
  if (outcome.state === "refused") {
    return (
      <p role="alert" className="alert" data-testid="lender-refused">
        <strong>Refused by the pod ({outcome.status}).</strong> {refused}
      </p>
    );
  }
  if (outcome.state === "error") {
    return (
      <p role="alert" className="alert">
        {outcome.message}
      </p>
    );
  }
  return null;
}

function Loading({ outcome }: { outcome: Outcome<unknown> }) {
  if (outcome.state === "loading") return <p role="status">Connecting to the pods…</p>;
  if (outcome.state === "error") {
    return (
      <p role="alert" className="alert">
        {outcome.message}
      </p>
    );
  }
  return null;
}

function MeasuresCard({ record, title }: { record: CashFlowAssessment; title: string }) {
  return (
    <section className="pane" aria-labelledby="measures-heading" data-testid="lender-measures">
      <h2 id="measures-heading">{title}</h2>
      <dl className="terms">
        <dt>Debt service coverage</dt>
        <dd data-testid="lender-dscr">{record.debtServiceCoverageRatio.toFixed(2)}x</dd>
        <dt>Average balance</dt>
        <dd>{usd(record.averageBalanceUsd)}</dd>
        <dt>Covenants</dt>
        <dd>
          <span className={`status status-${record.covenantsMet ? "met" : "pending"}`}>
            {record.covenantsMet ? "Met" : "Missed"}
          </span>
        </dd>
        <dt>Checked</dt>
        <dd>{dateOnly(record.checkedAt)}</dd>
      </dl>
      <p className="muted small">Kept in our own credit file.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Step 4: the application and the deal sheet.

async function loadAssessment(): Promise<CashFlowAssessment | undefined> {
  return (await lender()).readAssessment(await world());
}

const BANDS: Record<string, string> = {
  "1m-5m": "$1M to $5M",
  "500k-1m": "$500k to $1M",
  "over-5m": "over $5M",
  "under-500k": "under $500k",
};

function DealSheet({ sheet }: { sheet: Assessment }) {
  return (
    <div className="deal" data-testid="lender-deal-sheet">
      <section className="pane" aria-labelledby="sources-heading">
        <h2 id="sources-heading">Checked at source</h2>
        <div className="table-wrap">
          <table className="table" data-testid="lender-checks">
            <caption>Read from Northwind's pod under grant S2</caption>
            <thead>
              <tr>
                <th scope="col">Resource</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {sheet.checks.map((check) => (
                <tr key={check.path} data-testid={`lender-check-${check.path.split("/").pop()}`}>
                  <th scope="row">{check.label}</th>
                  <td>
                    <span className={`status status-${check.verified ? "met" : "pending"}`}>
                      {check.verified ? "Verified" : "Failed"}
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">Cash flow</th>
                <td>
                  <span className="status status-met">Read</span> written by Alder Bank
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Signatures checked against the register's and the Department of Revenue's published keys
          and status lists. Nothing was uploaded.
        </p>
      </section>
      <section className="pane" aria-labelledby="sheet-heading">
        <h2 id="sheet-heading">Deal sheet</h2>
        <dl className="terms">
          <dt>Borrower</dt>
          <dd>{sheet.legalName}</dd>
          <dt>Owners of 25% or more</dt>
          <dd>{sheet.beneficialOwners.join(", ")}</dd>
          <dt>State taxes</dt>
          <dd>Compliant, filings current through {dateOnly(sheet.filingsCurrentThrough)}</dd>
          <dt>Turnover band</dt>
          <dd>{BANDS[sheet.turnoverBand ?? ""] ?? "–"}</dd>
          <dt>Twelve months' inflow</dt>
          <dd>{usd(sheet.cashFlow.inflowUsd)}</dd>
          <dt>New payment</dt>
          <dd>{usd(LOAN_PAYMENT)} a month</dd>
          <dt>Coverage with it</dt>
          <dd data-testid="lender-sheet-dscr">{sheet.cashFlow.dscr.toFixed(2)}x</dd>
          <dt>Average balance</dt>
          <dd>{usd(sheet.cashFlow.averageBalanceUsd)}</dd>
          <dt>Recommendation</dt>
          <dd>
            <span className={`status status-${sheet.approve ? "met" : "pending"}`}>
              {sheet.approve ? "Approve with covenants" : "Refer"}
            </span>
          </dd>
        </dl>
      </section>
    </div>
  );
}

/** Step 4: `loan`. */
export function LoanApplication() {
  const { outcome, reload } = usePodState(loadAssessment, [LENDER]);
  const assess = useAction();
  const [sheet, setSheet] = useState<Assessment | undefined>();
  const saved = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <LoanPage title="Equipment loan application">
      <Loading outcome={outcome} />
      <section className="pane" aria-labelledby="apply-heading">
        <h2 id="apply-heading">Assess the application</h2>
        <p>
          Northwind applied from its wallet and granted us 30 days' read of four resources in its
          pod, for a credit decision: its identity, ownership and tax compliance credentials, and
          the cash flow record Alder Bank keeps there. We read them at source; nothing is
          re-collected.
        </p>
        <button
          type="button"
          className="loan-button"
          data-tour="lender-loan-assess"
          disabled={outcome.state === "loading" || assess.outcome.state === "running"}
          onClick={() =>
            void assess.run(async () => {
              setSheet(await (await journey()).assessment(await world(DAY.apply)));
              reload();
            })
          }
        >
          {assess.outcome.state === "running" ? "Reading at source…" : "Assess at source"}
        </button>
        <ActionResult
          outcome={assess.outcome}
          ok="Assessed. The deal sheet is in our credit file."
          refused="Northwind has not granted us access to its application documents."
        />
      </section>
      {sheet !== undefined ? <DealSheet sheet={sheet} /> : null}
      {sheet === undefined && saved !== undefined ? (
        <MeasuresCard record={saved} title="Origination assessment" />
      ) : null}
    </LoanPage>
  );
}

// ---------------------------------------------------------------------------------------------
// Step 5: the decision and the documents written back.

async function loadDelivered(): Promise<Delivered> {
  // Read back as Brackenridge, under the S2 write-back it holds on the three documents.
  return (await lender()).readDelivered(await world(), LENDER);
}

function DeliveredDocuments({ delivered }: { delivered: Delivered }) {
  const { terms, notice, decision } = delivered;
  return (
    <div className="deal" data-testid="lender-delivered">
      <section className="pane" aria-labelledby="terms-heading">
        <h2 id="terms-heading">Loan terms</h2>
        {terms === undefined ? (
          <p className="muted">Not written yet.</p>
        ) : (
          <dl className="terms" data-testid="lender-terms">
            <dt>Principal</dt>
            <dd>{usd(terms.principalUsd)}</dd>
            <dt>Rate</dt>
            <dd>{terms.interestRate}% fixed</dd>
            <dt>Term</dt>
            <dd>{terms.termMonths} months</dd>
            <dt>Payment</dt>
            <dd>{usd(terms.monthlyPaymentUsd)} a month</dd>
            {terms.covenants.map((covenant) => (
              <FragmentRow key={covenant.metric ?? covenant.name} label="Covenant">
                {COVENANT_WORDS[covenant.metric ?? ""] ?? covenant.name}, tested quarterly
              </FragmentRow>
            ))}
          </dl>
        )}
        {decision === undefined ? null : (
          <p className="muted small">Decision recorded {dateOnly(decision.issued)}.</p>
        )}
      </section>
      <section className="pane" aria-labelledby="notice-heading">
        <h2 id="notice-heading">Notice of action taken</h2>
        {notice === undefined ? (
          <p className="muted">Not written yet.</p>
        ) : (
          <>
            <p data-testid="lender-notice-name">
              <strong>{notice.name}</strong>
            </p>
            <p className="loan-notice">{notice.description}</p>
            <p className="muted small">
              12 CFR 1002.9: written into Northwind's pod, which keeps it.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function FragmentRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Step 5: `loan/decision`. */
export function LoanDecision() {
  const { outcome, reload } = usePodState(loadDelivered, [LENDER]);
  const decide = useAction();
  const delivered = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <LoanPage title="Credit decision">
      <Loading outcome={outcome} />
      {outcome.state === "refused" ? (
        <p role="alert" className="alert">
          <strong>Refused by the pod ({outcome.status}).</strong> Our grant to write into
          Northwind's loan folder is not in force.
        </p>
      ) : null}
      <section className="pane" aria-labelledby="decide-heading">
        <h2 id="decide-heading">Approve with covenants</h2>
        <p>
          The committee approves on two financial covenants, tested each quarter. We write the
          decision, the loan terms and the notice of action taken into Northwind's pod, where S2
          lets us write those three documents and nothing else.
        </p>
        <button
          type="button"
          className="loan-button"
          data-tour="lender-loan-decide"
          disabled={outcome.state === "loading" || decide.outcome.state === "running"}
          onClick={() =>
            void decide.run(async () => {
              await (await journey()).decision(await world(DAY.decision));
              reload();
            })
          }
        >
          {decide.outcome.state === "running" ? "Writing…" : "Approve and deliver"}
        </button>
        <ActionResult
          outcome={decide.outcome}
          ok="Approved. Three documents are in Northwind's pod."
          refused="Northwind's pod would not take the documents."
        />
      </section>
      {delivered !== undefined && (delivered.terms ?? delivered.notice) !== undefined ? (
        <DeliveredDocuments delivered={delivered} />
      ) : null}
    </LoanPage>
  );
}

// ---------------------------------------------------------------------------------------------
// Step 7: the quarterly covenant test.

async function loadCovenantTest(): Promise<CashFlowAssessment | undefined> {
  return (await lender()).readCovenantTest(await world(), 1);
}

/** Step 7: `loan/covenants`. */
export function LoanCovenants() {
  const { outcome, reload } = usePodState(loadCovenantTest, [LENDER]);
  const run = useAction();
  const [result, setResult] = useState<CovenantTest | undefined>();
  const saved = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <LoanPage title="Covenant monitoring">
      <Loading outcome={outcome} />
      <section className="pane" aria-labelledby="quarter-heading">
        <h2 id="quarter-heading">Quarter 1 test</h2>
        <p>
          Northwind granted us a standing read of its cash flow record while the loan is open (grant
          S3). Each quarter end the calendar brings the test round: we read the latest three months
          and test both covenants.
        </p>
        <button
          type="button"
          className="loan-button"
          data-tour="lender-loan-quarter"
          disabled={outcome.state === "loading" || run.outcome.state === "running"}
          onClick={() =>
            void run.run(async () => {
              const done = await (await journey()).quarterStep(await world(DAY.quarter));
              setResult(done.test);
              reload();
            })
          }
        >
          {run.outcome.state === "running" ? "Testing…" : "Run the quarter's test"}
        </button>
        <ActionResult
          outcome={run.outcome}
          ok="Tested. The result is in our credit file."
          refused="Northwind has not granted us a standing read of its cash flow."
        />
      </section>
      {result !== undefined ? (
        <section className="pane" aria-labelledby="result-heading" data-testid="lender-quarter">
          <h2 id="result-heading">Three months to the quarter end</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Covenant</th>
                  <th scope="col" className="num">
                    Value
                  </th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {result.covenants.map((row) => (
                  <tr key={row.covenant.metric}>
                    <th scope="row">{COVENANT_WORDS[row.covenant.metric] ?? row.covenant.name}</th>
                    <td className="num">
                      {row.covenant.metric === "dscr" ? `${row.value.toFixed(2)}x` : usd(row.value)}
                    </td>
                    <td>
                      <span className={`status status-${row.met ? "met" : "pending"}`}>
                        {row.met ? "Met" : "Missed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : saved !== undefined ? (
        <MeasuresCard record={saved} title="Quarter 1 result" />
      ) : null}
    </LoanPage>
  );
}
