// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn's small business loan screens (flows.md section 6), operated by Jordan Blake for
 * Northwind Logistics LLC: what the loan put in Northwind's pod (`loan`), the requests from Alder
 * Bank and Brackenridge Bank with grants S2 and S3 (`loan/requests`), the grants with the
 * withdrawal on repayment (`loan/sharing`), and the journey ledger with its examiner view
 * (`loan/ledger`). The credentials from the business onboarding demo are reused: nothing is
 * collected again.
 */
import "./small-business-loan.css";
import { ORGS } from "@mortgage/content/orgs";
import { usd } from "@mortgage/content/small-business-loan/facts";
import { LOAN_GRANTS, type LoanGrantCode } from "@mortgage/content/small-business-loan/grants";
import { loanTotals } from "@mortgage/content/small-business-loan/ledger";
import {
  LOAN_COMPLIANCE,
  SMALL_BUSINESS_LOAN_HOLDER,
  smallBusinessLoanLens,
} from "@mortgage/content/small-business-loan/mount";
import { TOUR } from "@mortgage/content/small-business-loan/tour";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { type ComplianceItem, defineJourneyLedger, type JourneyLedger } from "@mortgage/lens";
import { onEvent, onReset } from "@mortgage/pod-runtime";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Screen } from "../../App.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../../components/ui.tsx";
import { usePodData, useWallet, type WalletWorld } from "../../runtime.tsx";

const journey = () => import("@mortgage/content/small-business-loan/journey");

const BACK = { href: "/loan", label: "Northwind's loan" };

/** One write of a kind at a time from this page (a request is sent once). */
const once = new Map<string, Promise<unknown>>();
function single<T>(key: string, run: () => Promise<T>): Promise<T> {
  const running = once.get(key) as Promise<T> | undefined;
  if (running !== undefined) return running;
  const started = run().finally(() => once.delete(key));
  once.set(key, started);
  return started;
}

/** A run of a wallet action with its outcome shown, never swallowed. */
function useRun<T>() {
  const { run } = useWallet();
  const [state, setState] = useState<{ running: boolean; error?: unknown; done?: T }>({
    running: false,
  });
  const go = (action: (world: WalletWorld) => Promise<T>) => {
    setState({ running: true });
    run(action).then(
      (done) => setState({ done, running: false }),
      (error: unknown) => setState({ error, running: false }),
    );
  };
  return { go, state };
}

function Nav() {
  const links: [string, string][] = [
    ["/loan", "Loan documents"],
    ["/loan/requests", "Requests"],
    ["/loan/sharing", "Grants"],
    ["/loan/ledger", "Journey ledger"],
  ];
  return (
    <nav aria-label="Equipment loan" className="sbl-nav">
      {links.map(([href, label]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

const READ_LABELS: Record<string, string> = {
  "credentials/beneficial-ownership": "Ownership credential",
  "credentials/org-identity": "Identity credential",
  "credentials/tax-compliance": "Tax compliance credential",
  "finance/cash-flow": "Cash flow record",
  "loans/brackenridge/decision": "Decision",
  "loans/brackenridge/notice-of-action": "Notice of action taken",
  "loans/brackenridge/terms": "Loan terms",
};

const MODE_WORDS: Record<string, string> = {
  Read: "Reads",
  Write: "Writes",
};

/** What a grant covers, in words: "Reads: …", "Writes: …". */
function Covers({ code }: { code: LoanGrantCode }) {
  const rows = new Map<string, string[]>();
  for (const permission of LOAN_GRANTS[code].permissions) {
    for (const mode of permission.modes) {
      const list = rows.get(mode) ?? [];
      for (const path of permission.paths) list.push(READ_LABELS[path] ?? path);
      rows.set(mode, list);
    }
  }
  return (
    <>
      {[...rows].map(([mode, list]) => (
        <div className="field" key={mode}>
          <dt>{MODE_WORDS[mode] ?? mode}</dt>
          <dd>{list.join(", ")}</dd>
        </div>
      ))}
    </>
  );
}

// --- The loan documents in Northwind's pod ------------------------------------------------------

async function loadDocuments(world: WalletWorld) {
  const { holderCashFlow, readDelivered } = await journey();
  const delivered = await readDelivered(world);
  let months: number | undefined;
  try {
    const record = await holderCashFlow(world);
    months = record.months.length;
  } catch {
    months = undefined;
  }
  return { delivered, months };
}

/** Northwind's loan: the documents Brackenridge wrote back, and the cash flow record (`loan`). */
export function LoanHome() {
  const { data, error } = usePodData(loadDocuments);
  const delivered = data?.delivered;
  return (
    <Screen title="Northwind's loan" page="Northwind's equipment loan">
      <p className="muted small">
        Northwind Logistics LLC's pod, operated by Jordan Blake, managing member. The bank keeps its
        cash flow record here; the lender reads what Northwind grants and writes its decision back.
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? <Loading what="Northwind's loan" /> : null}
      {data !== undefined ? (
        <section className="card" aria-labelledby="sbl-cash-flow">
          <h2 id="sbl-cash-flow">Cash flow record</h2>
          <p data-testid="wallet-loan-cash-flow">
            {data.months === undefined || data.months === 0
              ? "Empty: Alder Bank has not written it yet."
              : `${data.months} months, written by Alder Bank from its own ledger.`}
          </p>
        </section>
      ) : null}
      {delivered !== undefined && delivered.notice === undefined ? (
        <Empty>No decision yet. Brackenridge Bank writes its decision here.</Empty>
      ) : null}
      {delivered?.notice !== undefined ? (
        <section className="card" aria-labelledby="sbl-notice" data-testid="wallet-loan-notice">
          <h2 id="sbl-notice">{delivered.notice.name}</h2>
          <p>{delivered.notice.description}</p>
          <p className="muted small">Written by Brackenridge Bank into Northwind's pod.</p>
        </section>
      ) : null}
      {delivered?.terms !== undefined ? (
        <section className="card" aria-labelledby="sbl-terms" data-testid="wallet-loan-terms">
          <h2 id="sbl-terms">Loan terms</h2>
          <dl className="fields">
            <div className="field">
              <dt>Principal</dt>
              <dd>{usd(delivered.terms.principalUsd)}</dd>
            </div>
            <div className="field">
              <dt>Rate</dt>
              <dd>{delivered.terms.interestRate}%</dd>
            </div>
            <div className="field">
              <dt>Term</dt>
              <dd>{delivered.terms.termMonths} months</dd>
            </div>
            <div className="field">
              <dt>Payment</dt>
              <dd>{usd(delivered.terms.monthlyPaymentUsd)} a month</dd>
            </div>
          </dl>
        </section>
      ) : null}
      <Nav />
    </Screen>
  );
}

// --- Steps 3 and 6: the requests ---------------------------------------------------------------

interface RequestsView {
  pending: { code: LoanGrantCode; url: string }[];
  decided: { code: LoanGrantCode; state: string }[];
}

async function loadRequests(world: WalletWorld): Promise<RequestsView> {
  const steps = await journey();
  // Brackenridge's application request waits in the inbox from the start; its monitoring
  // request arrives with the decision.
  await single("request-s2", () => steps.ensureApplication(world));
  const delivered = await steps.readDelivered(world);
  if (delivered.decision !== undefined) {
    await single("request-s3", () => steps.ensureMonitoringRequest(world));
  }
  const pending: RequestsView["pending"] = [];
  for (const code of ["S2", "S3"] as const) {
    const url = await steps.pendingRequest(world, code);
    if (url !== undefined) pending.push({ code, url });
  }
  const rows = await steps.loanGrantRows(world);
  const decided = rows.flatMap((row) =>
    row.record === undefined ? [] : [{ code: row.code, state: row.record.state }],
  );
  return { decided, pending };
}

function ApproveButton({
  code,
  disabled,
  onClick,
  running,
}: {
  code: "S2" | "S3";
  disabled: boolean;
  onClick: () => void;
  running: boolean;
}) {
  const label = running ? "Approving…" : "Approve";
  return code === "S2" ? (
    <button
      type="button"
      className="button primary wide"
      data-tour="wallet-loan-approve-s2"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  ) : (
    <button
      type="button"
      className="button primary wide"
      data-tour="wallet-loan-approve-s3"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** Steps 3 and 6: Brackenridge's requests (`loan/requests`). */
export function LoanRequests() {
  const { data, error } = usePodData(loadRequests);
  const { go, state } = useRun<LoanGrantCode>();
  return (
    <Screen title="Requests" page="Requests to use Northwind's data" back={BACK}>
      <p className="muted small">
        A lender asks; Jordan approves for Northwind. A grant names what may be read, for what
        purpose, and until when. Nothing is uploaded.
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? <Loading what="Northwind's inbox" /> : null}
      {data !== undefined && data.pending.length === 0 ? (
        <Empty>No request is waiting.</Empty>
      ) : null}
      <ul className="sbl-list">
        {data?.pending.map(({ code }) => {
          const spec = LOAN_GRANTS[code];
          if (code === "S1") return null;
          return (
            <li
              key={code}
              className="card"
              data-testid={`wallet-loan-request-${code.toLowerCase()}`}
            >
              <div className="card-head">
                <OrgBadge slug={spec.to} />
                <div>
                  <p>
                    <strong>{ORGS[spec.to].organisation}</strong>
                  </p>
                  <p className="muted small">{spec.name}</p>
                </div>
                <span className="sbl-code">{code}</span>
              </div>
              <p className="small">{spec.description}</p>
              <dl className="fields">
                <Covers code={code} />
                <div className="field">
                  <dt>Purpose</dt>
                  <dd>{spec.purposeText}</dd>
                </div>
                <div className="field">
                  <dt>For</dt>
                  <dd>{spec.untilLabel}</dd>
                </div>
              </dl>
              <ApproveButton
                code={code}
                disabled={state.running}
                running={state.running}
                onClick={() =>
                  go(async (world) => {
                    const steps = await journey();
                    if (code === "S2") await steps.approveApplication(world);
                    else await steps.approveMonitoring(world);
                    return code;
                  })
                }
              />
            </li>
          );
        })}
      </ul>
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status" data-testid="wallet-loan-approved">
          <strong>Grant {state.done} given</strong>
          <p>
            {ORGS[LOAN_GRANTS[state.done].to].organisation} may now use what the grant names. The
            consent record is in Northwind's pod.
          </p>
        </div>
      ) : null}
      {data !== undefined && data.decided.length > 0 ? (
        <p className="muted small">
          Decided: {data.decided.map((row) => `${row.code} (${row.state})`).join(", ")}.{" "}
          <Link href="/loan/sharing">See the grants</Link>
        </p>
      ) : null}
      <Nav />
    </Screen>
  );
}

// --- Step 8: the grants ------------------------------------------------------------------------

const STATE_WORDS: Record<string, string> = {
  active: "Active",
  expired: "Ended: its term ran out",
  revoked: "Withdrawn",
};

/** Step 8: Northwind's loan grants; repaying the loan withdraws S3 (`loan/sharing`). */
export function LoanSharing() {
  const grants = usePodData(async (world) => (await journey()).loanGrantRows(world));
  const { go, state } = useRun<{ status: number }>();
  const shown = grants.data?.filter((row) => row.record !== undefined) ?? [];
  return (
    <Screen title="Grants" page="Northwind's loan grants" back={BACK}>
      {grants.error !== undefined ? <Problem error={grants.error} /> : null}
      {grants.data === undefined && grants.error === undefined ? (
        <Loading what="Northwind's grants" />
      ) : null}
      {grants.data !== undefined && shown.length === 0 ? (
        <Empty>No organisation holds a loan grant yet.</Empty>
      ) : null}
      <ul className="sbl-list">
        {shown.map(({ code, record, spec }) => (
          <li
            key={code}
            className={`card grant state-${record?.state ?? "none"}`}
            data-testid={`wallet-loan-grant-${code.toLowerCase()}`}
          >
            <div className="card-head">
              <OrgBadge slug={spec.to} />
              <div>
                <p>
                  <strong>{ORGS[spec.to].organisation}</strong>
                </p>
                <p className="muted small">
                  {spec.purposeText} ·{" "}
                  {record?.state === "active"
                    ? spec.untilLabel
                    : (STATE_WORDS[record?.state ?? ""] ?? record?.state)}
                </p>
              </div>
              <span className="sbl-code">{code}</span>
            </div>
            <dl className="fields">
              <Covers code={code} />
            </dl>
            {code === "S3" && record?.state === "active" ? (
              <button
                type="button"
                className="button revoke"
                data-tour="wallet-loan-withdraw-s3"
                disabled={state.running}
                onClick={() =>
                  go(async (world) => {
                    const { reread } = await (await journey()).repaidStep(world);
                    return { status: reread.status };
                  })
                }
              >
                Loan repaid: withdraw
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status" data-testid="wallet-loan-withdrawn">
          <strong>Grant S3 withdrawn</strong>
          <p>
            The loan is repaid. Brackenridge Bank can no longer read Northwind's cash flow; the
            withdrawal is in Northwind's consent records. Brackenridge's next read: refused by the
            pod ({state.done.status}).
          </p>
        </div>
      ) : null}
      <Nav />
    </Screen>
  );
}

// --- Step 9: the journey ledger and the examiner view ------------------------------------------

/** Every entry of the pods' request log, now and as it grows (a restart empties it). */
function useLog(): LensEntry[] {
  const [entries, setEntries] = useState<LensEntry[]>([]);
  useEffect(() => {
    let buffer: LensEntry[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => setEntries([...buffer]);
    const stop = onEvent(
      (entry) => {
        buffer.push(entry);
        clearTimeout(timer);
        timer = setTimeout(flush, 50);
      },
      { replay: true },
    );
    const stopReset = onReset(() => {
      buffer = [];
      flush();
    });
    return () => {
      clearTimeout(timer);
      stop();
      stopReset();
    };
  }, []);
  return entries;
}

/** Step 9: the journey ledger, opening on the examiner view (`loan/ledger`). */
export function LoanLedger() {
  const entries = useLog();
  const totals = loanTotals(entries);
  const mount = useRef<HTMLDivElement>(null);
  const ledger = useRef<JourneyLedger | null>(null);
  const pushed = useRef(0);
  useEffect(() => {
    defineJourneyLedger();
    const element = document.createElement("journey-ledger") as JourneyLedger;
    const calendar = createDemoCalendar();
    element.configure(
      {
        ...smallBusinessLoanLens(),
        app: "wallet",
        calendar: { dayOf: (d) => calendar.dayOf(d), label: (d) => calendar.label(d) },
        holder: SMALL_BUSINESS_LOAN_HOLDER,
        registry: ORGS,
      },
      {
        compliance: LOAN_COMPLIANCE.map((item) => ({ ...item }) as ComplianceItem),
        headingLevel: 2,
        steps: TOUR.map((step) => ({
          chapter: step.chapter,
          id: step.id,
          title: step.title,
          ...(step.clock ? { day: step.clock.day } : {}),
        })),
        view: "examiner",
      },
    );
    mount.current?.append(element);
    ledger.current = element;
    pushed.current = 0;
    return () => {
      element.remove();
      ledger.current = null;
    };
  }, []);
  useEffect(() => {
    const element = ledger.current;
    if (element === null) return;
    for (const entry of entries.slice(pushed.current)) element.push(entry, { replayed: true });
    pushed.current = entries.length;
  }, [entries]);
  return (
    <Screen title="Journey ledger" page="Journey ledger" back={BACK}>
      <p className="muted small">
        From the pods' request log, not typed in: who wrote into Northwind's pod, who read it under
        which grant, and each lending obligation beside the entries that meet it.
      </p>
      <dl className="sbl-totals" data-testid="wallet-loan-totals">
        <div>
          <dt>Issuers</dt>
          <dd data-testid="wallet-loan-issuers">{totals.issuers}</dd>
        </div>
        <div>
          <dt>Lenders</dt>
          <dd data-testid="wallet-loan-lenders">{totals.lenders}</dd>
        </div>
        <div>
          <dt>Decisions written back</dt>
          <dd data-testid="wallet-loan-decisions">{totals.decisions}</dd>
        </div>
      </dl>
      <div ref={mount} className="sbl-ledger" />
      <Nav />
    </Screen>
  );
}
