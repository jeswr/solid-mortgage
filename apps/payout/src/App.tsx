// AUTHORED-BY Claude Opus 5.5
/**
 * Swiftline Payouts: a payment rail's status page (flows.md section 4, step 10). One timeline, one
 * receipt. Maya authorises the payout in her wallet with a one-time grant (L2); Swiftline reads the
 * payout instruction once, pushes the money to her card, keeps a receipt and confirms to Finchly.
 * A second read is refused by the pod: the grant closed after the first.
 */
import type { World } from "@mortgage/content/mortgage/world";
import { podUrl, statusOf } from "@mortgage/content/mortgage/world";
import { DAY, LOAN, PAYOUT, usd } from "@mortgage/content/small-dollar-lending/facts";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import { appWorld, journey, useAction, usePodState } from "./runtime.ts";

/** The router base: Vite's `base` without its trailing slash ("/payout"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** The timeline's stages, in order. */
export const STAGES = [
  "Instruction authorised in Maya's wallet",
  "Instruction read, once",
  "Pushed to card",
  "Confirmed to Finchly",
] as const;

function Top() {
  return (
    <header className="top">
      <Link href="/" className="brand">
        {org.organisation}
      </Link>
      <span className="rail">Push to card · {LOAN.loanNumber}</span>
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

function Home() {
  return (
    <Page title="Payouts">
      <p className="lede">
        We move a lender's funds to the borrower's debit card. We read the one instruction the
        borrower authorises, once, and nothing else.
      </p>
      <p>
        <Link href="/status" className="link-strong">
          Payout status for loan {LOAN.loanNumber}
        </Link>
      </p>
      <p className="small">
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

interface Receipt {
  description: string;
  issued: Date | undefined;
}

interface StatusView {
  receipt: Receipt | undefined;
}

async function loadStatus(): Promise<StatusView> {
  const world = await appWorld();
  const { readPayoutReceipt } = await journey();
  const record = await readPayoutReceipt(world);
  return {
    receipt:
      record === undefined ? undefined : { description: record.description, issued: record.issued },
  };
}

const instructionUrl = (world: World) => podUrl(world, "maya", "banking/payout-instruction");

const when = (date: Date | undefined) =>
  date === undefined ? "–" : date.toISOString().replace("T", " ").slice(0, 16);

function Status() {
  const { outcome, reload } = usePodState(loadStatus, ["payout", "maya"]);
  const authorise = useAction();
  const again = useAction();
  const [secondRead, setSecondRead] = useState<number>();
  const receipt = outcome.state === "ok" ? outcome.value.receipt : undefined;
  const paid = receipt !== undefined;
  const reached = paid ? STAGES.length : authorise.outcome.state === "running" ? 1 : 0;
  return (
    <Page title="Payout status">
      <p className="amount">
        <span className="num">{usd(LOAN.amountFinancedUsd, true)}</span> to the {PAYOUT.cardIssuer}{" "}
        card ending <span className="num">{PAYOUT.accountLast4}</span>
      </p>
      {outcome.state === "loading" ? <p role="status">Connecting to the pods…</p> : null}
      {outcome.state === "error" ? (
        <p role="alert" className="alert">
          {outcome.message}
        </p>
      ) : null}
      <ol className="timeline" aria-label="Payout timeline">
        {STAGES.map((stage, index) => (
          <li key={stage} className={index < reached ? "stage stage-done" : "stage"}>
            <span className="dot" aria-hidden="true" />
            <span>{stage}</span>
            <span className="stage-state">{index < reached ? "done" : "pending"}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="primary"
        data-tour="payout-authorise"
        disabled={paid || authorise.outcome.state === "running"}
        onClick={() =>
          void authorise.run(async () => {
            const { authorisePayout } = await journey();
            await authorisePayout(await appWorld(DAY.apply));
            reload();
          })
        }
      >
        {authorise.outcome.state === "running"
          ? "Waiting for Maya's wallet…"
          : paid
            ? "Paid"
            : "Authorise in Cairn"}
      </button>
      {authorise.outcome.state === "refused" ? (
        <p role="alert" className="alert">
          <strong>Refused by the pod ({authorise.outcome.status}).</strong> The instruction could
          not be read.
        </p>
      ) : null}
      {authorise.outcome.state === "error" ? (
        <p role="alert" className="alert">
          {authorise.outcome.message}
        </p>
      ) : null}
      {receipt !== undefined ? (
        <section className="receipt" aria-labelledby="receipt-heading" data-testid="payout-receipt">
          <h2 id="receipt-heading">Receipt</h2>
          <dl>
            <div>
              <dt>Loan</dt>
              <dd className="num">{LOAN.loanNumber}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd className="num">{usd(LOAN.amountFinancedUsd, true)}</dd>
            </div>
            <div>
              <dt>Card</dt>
              <dd className="num">•••• {PAYOUT.accountLast4}</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd className="num">{when(receipt.issued)}</dd>
            </div>
          </dl>
          <p className="small">{receipt.description}</p>
        </section>
      ) : null}
      <section className="probe" aria-labelledby="probe-heading">
        <h2 id="probe-heading">Read the instruction again</h2>
        <p className="small">
          The grant Maya gave us was for one read. Anything more is the pod's to refuse.
        </p>
        <button
          type="button"
          className="secondary"
          disabled={again.outcome.state === "running"}
          onClick={() =>
            void again.run(async () => {
              const world = await appWorld();
              setSecondRead(await statusOf(world.fetchAs("payout"), instructionUrl(world)));
            })
          }
        >
          Read again
        </button>
        {secondRead === undefined ? null : secondRead === 200 ? (
          <p role="status" data-testid="payout-second-read">
            200: the instruction was readable.
          </p>
        ) : (
          <p role="alert" className="alert" data-testid="payout-second-read">
            <strong>Refused by the pod ({secondRead}).</strong>{" "}
            {paid
              ? "The one-time grant closed after our first read."
              : "Maya has not authorised a payout."}
          </p>
        )}
      </section>
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found">
      <Link href="/">Back to payouts</Link>
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
          <Route path="/status" component={Status} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
