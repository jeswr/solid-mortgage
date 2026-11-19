// AUTHORED-BY Claude Opus 5.5
/**
 * Finchly Loans: an online instalment lender (flows.md section 4, steps 7, 8 and 11). A card stack
 * on a big number: the quote it gave on Maya's proofs, the application (grant L1, consent record
 * first), one decision run through two models side by side, the disclosure written into Maya's
 * pod, then servicing: the payments, the repayment credential, and what the pod answers once Maya
 * has withdrawn the grant.
 */
import type { World } from "@mortgage/content/mortgage/world";
import { podUrl, statusOf } from "@mortgage/content/mortgage/world";
import { DAY, LOAN, PERSON, POLICY, usd } from "@mortgage/content/small-dollar-lending/facts";
import { CREDENTIAL_PATHS, LENDING_GRANTS } from "@mortgage/content/small-dollar-lending/grants";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import { appWorld, journey, useAction, usePodState } from "./runtime.ts";

/** The router base: Vite's `base` without its trailing slash ("/fintech-lender"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const L1 = LENDING_GRANTS.L1;

function Top() {
  return (
    <header className="top">
      <Link href="/" className="brand">
        <span aria-hidden="true" className="brand-mark">
          f
        </span>
        {org.organisation}
      </Link>
      <nav aria-label="Your loan" className="top-nav">
        <Link href="/apply">Apply</Link>
        <Link href="/decision">Decision</Link>
        <Link href="/servicing">Servicing</Link>
      </nav>
    </header>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return (
    <main className="screen">
      <h1>{title}</h1>
      {children}
    </main>
  );
}

/** The big number at the head of every card stack. */
function BigNumber({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="big">
      <span className="big-label">{label}</span>
      <span className="big-value">{value}</span>
      {note === undefined ? null : <span className="big-note">{note}</span>}
    </div>
  );
}

function Refused({ outcome, what }: { outcome: { status: number }; what: string }) {
  return (
    <p role="alert" className="alert">
      <strong>Refused by the pod ({outcome.status}).</strong> {what}
    </p>
  );
}

function Failure({ outcome }: { outcome: { readonly state: string; readonly message?: string } }) {
  return outcome.state === "error" ? (
    <p role="alert" className="alert">
      {outcome.message}
    </p>
  ) : null;
}

const accessNote = (status: number | undefined) =>
  status === undefined
    ? "–"
    : status === 200
      ? "200: readable under grant L1"
      : `${status}: Maya has not granted us access`;

// --- Home ---------------------------------------------------------------------------------------

function Home() {
  return (
    <Page title="Small loans, decided on what you earn">
      <BigNumber
        label="Up to"
        value={usd(LOAN.amountFinancedUsd)}
        note={`${LOAN.numberOfPayments} payments, ${LOAN.annualPercentageRate}% APR`}
      />
      <p className="lede">
        We look at your income and how your account runs, not only a credit score. You keep the
        data; we ask to read it for one loan, and we stop when you say so.
      </p>
      <ul className="stack">
        <li className="card">
          <h2>
            <Link href="/apply">Apply</Link>
          </h2>
          <p>Your quote, and the one grant we ask for.</p>
        </li>
        <li className="card">
          <h2>
            <Link href="/decision">Decision</Link>
          </h2>
          <p>Two models, one answer, and your disclosure.</p>
        </li>
        <li className="card">
          <h2>
            <Link href="/servicing">Servicing</Link>
          </h2>
          <p>Payments, and the record they build.</p>
        </li>
      </ul>
      <p className="small">
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

// --- Apply (step 7) ------------------------------------------------------------------------------

interface ApplyView {
  quote: string | undefined;
  /** The pod's answer to our read of Maya's cash-flow summary. */
  access: number;
}

async function loadApply(): Promise<ApplyView> {
  const world = await appWorld();
  const { readQuote } = await import("@mortgage/content/small-dollar-lending/prequalification");
  return {
    access: await statusOf(world.fetchAs("fintech-lender"), mayaPath(world, "cashFlow")),
    quote: await readQuote(world, "fintech-lender"),
  };
}

const mayaPath = (world: World, key: keyof typeof CREDENTIAL_PATHS) =>
  podUrl(world, "maya", CREDENTIAL_PATHS[key]);

function Apply() {
  const { outcome, reload } = usePodState(loadApply, ["fintech-lender", "maya"]);
  const apply = useAction();
  const view = outcome.state === "ok" ? outcome.value : undefined;
  const granted = view?.access === 200;
  return (
    <Page title="Apply">
      <BigNumber
        label="Your quote"
        value={usd(LOAN.amountFinancedUsd)}
        note={`${LOAN.numberOfPayments} × ${usd(LOAN.paymentAmountUsd, true)} every ${LOAN.paymentIntervalDays} days`}
      />
      {outcome.state === "loading" ? <p role="status">Connecting to the pods…</p> : null}
      <Failure outcome={outcome} />
      <ol className="stack">
        <li className="card">
          <h2>Pre-qualified on proofs</h2>
          {view?.quote === undefined ? (
            <p className="muted">
              No quote yet. Maya's wallet proves our three questions first; we hold nothing about
              her until she applies.
            </p>
          ) : (
            <p data-testid="fintech-quote">{view.quote}</p>
          )}
        </li>
        <li className="card">
          <h2>The grant we ask for: {L1.code}</h2>
          <p>{L1.description}.</p>
          <ul className="reads">
            <li>Identity credential (Trueline Identity)</li>
            <li>Employment and income (Ledgerly)</li>
            <li>Cash-flow summary (Alder Bank)</li>
          </ul>
          <p className="small">
            {L1.endLabel}, or when Maya withdraws it. Maya's wallet writes the agreement and her
            consent record before the pod lets us read anything.
          </p>
          <button
            type="button"
            className="cta"
            data-tour="fintech-apply"
            disabled={granted || apply.outcome.state === "running"}
            onClick={() =>
              void apply.run(async () => {
                const { applyToFinchly } = await journey();
                await applyToFinchly(await appWorld(DAY.apply));
                reload();
              })
            }
          >
            {apply.outcome.state === "running"
              ? "Asking Maya's wallet…"
              : granted
                ? "Applied"
                : "Apply"}
          </button>
          {apply.outcome.state === "refused" ? (
            <Refused outcome={apply.outcome} what="The application could not be recorded." />
          ) : null}
          <Failure outcome={apply.outcome} />
        </li>
        <li className="card">
          <h2>Our access to Maya's pod</h2>
          <p data-testid="fintech-access">{accessNote(view?.access)}</p>
        </li>
      </ol>
    </Page>
  );
}

// --- Decision (step 8) ---------------------------------------------------------------------------

type Decision = Awaited<ReturnType<Awaited<ReturnType<typeof journey>>["finchlyDecides"]>>;

let deciding: Promise<Decision> | undefined;

/** Run the decision once per page: it reads under L1, asks Quillon, and keeps a record. */
function decideOnce(): Promise<Decision> {
  deciding ??= (async () => {
    const { finchlyDecides } = await journey();
    return finchlyDecides(await appWorld(DAY.apply));
  })().catch((error: unknown) => {
    deciding = undefined;
    throw error;
  });
  return deciding;
}

async function loadDisclosure(): Promise<boolean> {
  const world = await appWorld();
  return (
    (await statusOf(
      world.fetchAs("fintech-lender"),
      podUrl(world, "maya", "loans/finchly/disclosure"),
    )) === 200
  );
}

function ModelCard({
  title,
  model,
  testid,
}: {
  title: string;
  model: Decision["bureauOnly"];
  testid: string;
}) {
  return (
    <section
      className={model.approved ? "card model model-yes" : "card model model-no"}
      aria-labelledby={`${testid}-h`}
      data-testid={testid}
    >
      <h2 id={`${testid}-h`}>{title}</h2>
      <p className="verdict">{model.approved ? "Approved" : "Declined"}</p>
      <dl className="pairs">
        {model.inputs.map((input) => (
          <div key={input.label}>
            <dt>{input.label}</dt>
            <dd>{input.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DecisionPage() {
  const [attempt, setAttempt] = useState(0);
  const { outcome } = usePodState(decideOnce, [], [attempt]);
  const disclosure = usePodState(loadDisclosure, ["maya"]);
  const accept = useAction();
  const decision = outcome.state === "ok" ? outcome.value : undefined;
  const disclosed = disclosure.outcome.state === "ok" && disclosure.outcome.value;
  return (
    <Page title="Decision">
      <p className="lede">
        One application, run through two models. The bureau-only model sees a thin file. Ours also
        reads the income and cash-flow credentials Maya granted, checked at their issuers.
      </p>
      {outcome.state === "loading" ? (
        <p role="status">Checking the credentials at source and asking Quillon for the score…</p>
      ) : null}
      {outcome.state === "refused" ? (
        <>
          <Refused
            outcome={outcome}
            what="Maya has not granted Finchly access. Apply first; her wallet asks her."
          />
          <button type="button" className="ghost" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </>
      ) : null}
      <Failure outcome={outcome} />
      {decision !== undefined ? (
        <div className="models">
          <ModelCard title="Bureau only" model={decision.bureauOnly} testid="fintech-bureau-only" />
          <ModelCard
            title="Bureau and cash flow"
            model={decision.withCashFlow}
            testid="fintech-with-cash-flow"
          />
        </div>
      ) : null}
      {decision?.withCashFlow.approved ? (
        <section className="card disclosure" aria-labelledby="tila">
          <h2 id="tila">Truth in Lending disclosure</h2>
          <dl className="pairs">
            <div>
              <dt>Annual percentage rate</dt>
              <dd>{LOAN.annualPercentageRate}%</dd>
            </div>
            <div>
              <dt>Finance charge</dt>
              <dd>{usd(LOAN.financeChargeUsd, true)}</dd>
            </div>
            <div>
              <dt>Amount financed</dt>
              <dd>{usd(LOAN.amountFinancedUsd, true)}</dd>
            </div>
            <div>
              <dt>Total of payments</dt>
              <dd>{usd(LOAN.totalOfPaymentsUsd, true)}</dd>
            </div>
          </dl>
          <p className="small">
            {LOAN.numberOfPayments} payments of {usd(LOAN.paymentAmountUsd, true)} every{" "}
            {LOAN.paymentIntervalDays} days. Cut-offs: score {POLICY.bureauMinimumScore}; income{" "}
            {usd(POLICY.minimumMonthlyIncomeUsd)} a month; cash-flow score{" "}
            {POLICY.minimumCashFlowScore}; no returned payments.
          </p>
          <button
            type="button"
            className="cta"
            data-tour="fintech-accept"
            disabled={disclosed || accept.outcome.state === "running"}
            onClick={() =>
              void accept.run(async () => {
                const { acceptLoan } = await journey();
                await acceptLoan(await appWorld(DAY.apply));
                disclosure.reload();
              })
            }
          >
            {accept.outcome.state === "running" ? "Writing…" : disclosed ? "Accepted" : "Accept"}
          </button>
          {accept.outcome.state === "refused" ? (
            <Refused outcome={accept.outcome} what="The disclosure could not be written." />
          ) : null}
          <Failure outcome={accept.outcome} />
          {disclosed ? (
            <p role="status" className="ok" data-testid="fintech-disclosed">
              The disclosure is in {PERSON.name}'s pod, in <code>/loans/finchly/</code>. It is hers
              to keep.
            </p>
          ) : null}
        </section>
      ) : null}
    </Page>
  );
}

// --- Servicing (steps 11 and 12) -------------------------------------------------------------------

interface ServicingView {
  credentialIssued: boolean;
  accessEnded: boolean;
}

async function loadServicing(): Promise<ServicingView> {
  const world = await appWorld();
  const finchly = world.fetchAs("fintech-lender");
  const own = async (path: string) =>
    (await statusOf(finchly, podUrl(world, "fintech-lender", path))) === 200;
  return {
    accessEnded: await own("loans/fl-2048-access-ended"),
    credentialIssued: await own("issued/maya-repayment-history"),
  };
}

function Servicing() {
  const { outcome, reload } = usePodState(loadServicing, ["fintech-lender", "maya"]);
  const pay = useAction();
  const refresh = useAction();
  const [refreshed, setRefreshed] = useState<number>();
  const view = outcome.state === "ok" ? outcome.value : undefined;
  const paid = view?.credentialIssued === true;
  return (
    <Page title="Servicing">
      <BigNumber
        label={`Loan ${LOAN.loanNumber}`}
        value={paid ? usd(0, true) : usd(LOAN.totalOfPaymentsUsd, true)}
        note={paid ? "Paid in full" : "Left to pay"}
      />
      {outcome.state === "loading" ? <p role="status">Connecting to the pods…</p> : null}
      <Failure outcome={outcome} />
      <ol className="stack">
        <li className="card">
          <h2>Payments</h2>
          <ul className="schedule">
            {[DAY.firstPayment, DAY.payoff].map((day, index) => (
              <li key={day}>
                <span>Payment {index + 1}</span>
                <span className="num">{usd(LOAN.paymentAmountUsd, true)}</span>
                <span>{paid ? "Paid on time" : `Due on day ${day}`}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="cta"
            data-tour="fintech-pay"
            disabled={paid || pay.outcome.state === "running"}
            onClick={() =>
              void pay.run(async () => {
                const { makePayments } = await journey();
                await makePayments(await appWorld(DAY.payoff));
                reload();
              })
            }
          >
            {pay.outcome.state === "running" ? "Recording…" : paid ? "Paid" : "Make the payments"}
          </button>
          {pay.outcome.state === "refused" ? (
            <Refused outcome={pay.outcome} what="Maya's grant does not cover this write." />
          ) : null}
          <Failure outcome={pay.outcome} />
        </li>
        <li className="card">
          <h2>What the payments built</h2>
          {paid ? (
            <p data-testid="fintech-repayment">
              Reported to Quillon, and a repayment history credential signed by us is in Maya's pod:{" "}
              {LOAN.numberOfPayments} of {LOAN.numberOfPayments} on time.
            </p>
          ) : (
            <p className="muted">Nothing yet.</p>
          )}
        </li>
        <li className="card">
          <h2>Bank data</h2>
          <p className="small">
            While the grant lasts, our servicing file may read Maya's cash-flow summary again.
          </p>
          <button
            type="button"
            className="ghost"
            disabled={refresh.outcome.state === "running"}
            onClick={() =>
              void refresh.run(async () => {
                const { finchlyReadsAgain } = await journey();
                setRefreshed(await finchlyReadsAgain(await appWorld()));
                reload();
              })
            }
          >
            Refresh bank data
          </button>
          {refreshed === undefined ? null : refreshed === 200 ? (
            <p role="status" data-testid="fintech-refresh">
              200: read under grant {L1.code}.
            </p>
          ) : (
            <p role="alert" className="alert" data-testid="fintech-refresh">
              <strong>Refused by the pod ({refreshed}).</strong> Our access to Maya's pod has ended.
            </p>
          )}
          {view?.accessEnded ? (
            <p data-testid="fintech-access-ended">
              Access ended: Maya withdrew grant {L1.code}. We keep the loan records the law
              requires; we no longer read anything in her pod.
            </p>
          ) : null}
        </li>
      </ol>
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found">
      <Link href="/">Back to Finchly</Link>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Top />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/apply" component={Apply} />
          <Route path="/decision" component={DecisionPage} />
          <Route path="/servicing" component={Servicing} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
