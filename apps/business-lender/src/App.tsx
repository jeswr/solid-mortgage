// AUTHORED-BY Claude Opus 5.5
/**
 * Brackenridge Bank Commercial Credit, a fictional bank's credit desk (business KYB demo,
 * flows.md section 3, steps 7, 8 and 10). A pipeline of deals and a two-pane deal view: the
 * borrower (read from Northwind's pod under grant K2, checked at Halyard) beside the facility and
 * its covenant table. Before K2, the desk holds only the ownership pre-decision it reached from
 * Northwind's zero-knowledge proofs, and the pod refuses its read.
 */
import type { DealDesk } from "@mortgage/content/business-kyb/banks";
import { ENTITY, percent } from "@mortgage/content/business-kyb/facts";
import { PodRequestError } from "@mortgage/content/mortgage/world";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import { journey, lenderWorld, proof, usePodState } from "./runtime.ts";
import { sections } from "./sections/index.ts";

/** The router base: Vite's `base` without its trailing slash ("/business-lender"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <p className="masthead-name">
          <Link href="/">{org.organisation}</Link>
        </p>
        <p className="masthead-desk">Commercial Credit</p>
      </div>
    </header>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

function Pipeline() {
  return (
    <Page title="Credit pipeline">
      <p className="lede">
        Signed in as {org.persona?.name}, {org.persona?.role}. Deals in front of the committee.
      </p>
      <ul className="pipeline" aria-label="Deals">
        <li>
          <Link href="/deal">{ENTITY.legalName}</Link>
          <p>Revolving credit line · $750,000 · 3 years · freight and logistics</p>
        </li>
        <li>
          <Link href="/loan">{ENTITY.legalName}: equipment term loan</Link>
          <p>Term loan · $150,000 · 5 years · two refrigerated box trucks</p>
        </li>
      </ul>
      <p className="muted small">
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

interface DealView {
  pre?: { description: string; issued: Date };
  desk?: DealDesk;
  refused?: number;
}

async function loadDeal(): Promise<DealView> {
  const world = await lenderWorld();
  const pre = await (await proof()).readPreDecision(world);
  try {
    const desk = await (await journey()).dealPage(world);
    return { desk, ...(pre === undefined ? {} : { pre }) };
  } catch (error) {
    if (error instanceof PodRequestError) {
      return { refused: error.status, ...(pre === undefined ? {} : { pre }) };
    }
    throw error;
  }
}

const dateOnly = (date: Date) =>
  date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });

type Status = "met" | "pending" | "illustrative";

function Badge({ status, children }: { status: Status; children: ReactNode }) {
  return <span className={`status status-${status}`}>{children}</span>;
}

function Covenants({ view }: { view: DealView }) {
  const proved = view.pre?.description.startsWith("Pre-decision: proceed") === true;
  const owners = view.desk?.sheet.ownership;
  const rows: { covenant: string; basis: string; status: Status; words: string }[] = [
    {
      basis: "Zero-knowledge proof against Halyard's anchors",
      covenant: "No undisclosed owner holds 25% or more",
      status: proved ? "met" : "pending",
      words: proved ? "Met" : "Awaiting proof",
    },
    {
      basis: "Ownership credential read under K2",
      covenant: "Identify each owner holding 25% or more",
      status: owners === undefined ? "pending" : "met",
      words: owners === undefined ? "Awaiting grant" : `Met: ${owners.beneficialOwners.join(", ")}`,
    },
    {
      basis: "Halyard's status list, at every read",
      covenant: "Notify a change of ownership",
      status: owners === undefined ? "pending" : "met",
      words:
        view.desk?.changed === true
          ? "Met: re-issued at the register, read today"
          : owners === undefined
            ? "Awaiting grant"
            : "Met: credential current",
    },
    {
      basis: "Quarterly accounts (simulated)",
      covenant: "Debt service coverage at least 1.25x",
      status: "illustrative",
      words: "Illustrative",
    },
  ];
  return (
    <div className="table-wrap">
      <table className="table" data-testid="lender-covenants">
        <caption>Covenants and how each is evidenced</caption>
        <thead>
          <tr>
            <th scope="col">Covenant</th>
            <th scope="col">Evidence</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.covenant}>
              <th scope="row">{row.covenant}</th>
              <td>{row.basis}</td>
              <td>
                <Badge status={row.status}>{row.words}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Borrower({ view }: { view: DealView }) {
  const sheet = view.desk?.sheet;
  return (
    <section className="pane" aria-labelledby="borrower-heading">
      <h2 id="borrower-heading">The borrower</h2>
      {view.refused !== undefined ? (
        <p role="alert" className="alert" data-testid="lender-refused">
          <strong>Refused by the pod ({view.refused}).</strong> Northwind has not granted
          Brackenridge access to its credentials. The desk holds only its ownership pre-decision.
        </p>
      ) : null}
      {sheet !== undefined ? (
        <>
          <dl className="terms">
            <dt>Legal name</dt>
            <dd data-testid="lender-legal-name">{sheet.legalName}</dd>
            <dt>LEI</dt>
            <dd className="mono">{sheet.lei} (illustrative)</dd>
            <dt>Checked</dt>
            <dd>
              {sheet.verified
                ? "Read from Northwind's pod under K2, verified at Halyard"
                : "Did not verify at Halyard"}
            </dd>
          </dl>
          <h3>Ownership</h3>
          <div className="table-wrap">
            <table className="table" data-testid="lender-owners">
              <caption>
                {view.desk?.changed
                  ? "Re-issued at the register: read today"
                  : "As signed by Halyard"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Owner</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {sheet.ownership.owners.map((owner) => (
                  <tr key={owner.name}>
                    <th scope="row">{owner.name}</th>
                    <td className="num">{percent(owner.bps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Deal() {
  const { outcome } = usePodState(loadDeal, ["northwind"]);
  const view = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <Page title={ENTITY.legalName}>
      <p className="lede">Revolving credit line, $750,000, three years.</p>
      {outcome.state === "loading" ? <p role="status">Reading the deal file…</p> : null}
      {outcome.state === "error" ? (
        <p role="alert" className="alert">
          {outcome.message}
        </p>
      ) : null}
      {outcome.state === "refused" ? (
        <p role="alert" className="alert">
          <strong>Refused by the pod ({outcome.status}).</strong>
        </p>
      ) : null}
      {view !== undefined ? (
        <div className="deal">
          <Borrower view={view} />
          <section className="pane" aria-labelledby="facility-heading">
            <h2 id="facility-heading">The facility</h2>
            <dl className="terms">
              <dt>Product</dt>
              <dd>Revolving credit line</dd>
              <dt>Limit</dt>
              <dd>$750,000</dd>
              <dt>Term</dt>
              <dd>3 years</dd>
            </dl>
            <h3>Ownership pre-decision</h3>
            {view.pre === undefined ? (
              <p className="muted">
                No pre-decision yet. Northwind answers our ownership question with a proof.
              </p>
            ) : (
              <p className="note" data-testid="lender-pre-decision">
                {view.pre.description}{" "}
                <span className="muted small">({dateOnly(view.pre.issued)})</span>
              </p>
            )}
            <h3>Covenants</h3>
            <Covenants view={view} />
          </section>
        </div>
      ) : null}
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found">
      <Link href="/">Go to the credit pipeline</Link>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Masthead />
        <Switch>
          <Route path="/" component={Pipeline} />
          <Route path="/deal" component={Deal} />
          {sections.map((section) => (
            <Route key={section.path} path={`/${section.path}`} component={section.Component} />
          ))}
          <Route component={NotFound} />
        </Switch>
        <footer className="foot">
          <p>{org.organisation} is fictional. Deals, figures and covenants are simulated.</p>
        </footer>
      </Router>
    </DemoTrust>
  );
}
