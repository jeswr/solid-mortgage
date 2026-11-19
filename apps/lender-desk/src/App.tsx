// AUTHORED-BY Claude Opus 5.5
/**
 * Juniper Loan Desk: a loan origination system. Dark sidebar with the role switcher, a pipeline
 * table, and the loan file with its tabs. Every screen reads from pods through `podFetch`.
 */
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useParams } from "wouter";
import { DeskContext, personaOf, useDesk } from "./desk.tsx";
import { LoanFileProvider, useLoanFile } from "./file.tsx";
import { org } from "./org.ts";
import {
  AppraisalTab,
  AusTab,
  ClosingTab,
  DisclosuresTab,
  InsuranceTab,
  SummaryTab,
  TitleTab,
  UrlaTab,
} from "./tabs/file.tsx";
import { ConditionsTab, CreditTab, PostClosingTab, VerificationsTab } from "./tabs/process.tsx";
import { Chip, Mono, stateChip } from "./ui.tsx";
import {
  LOAN_NUMBER,
  milestones,
  pipelineStatus,
  ROLES,
  type Role,
  TABS,
  tabById,
  usd,
} from "./view.ts";

/** The router base: Vite's `base` without its trailing slash ("/lender-desk"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TAB_COMPONENTS: Record<string, ComponentType> = {
  "1003": UrlaTab,
  appraisal: AppraisalTab,
  aus: AusTab,
  closing: ClosingTab,
  conditions: ConditionsTab,
  credit: CreditTab,
  disclosures: DisclosuresTab,
  insurance: InsuranceTab,
  "post-closing": PostClosingTab,
  summary: SummaryTab,
  title: TitleTab,
  verifications: VerificationsTab,
};

function Pipeline() {
  const file = useLoanFile();
  useEffect(() => applyDocumentMeta(org, "Pipeline"), []);
  const application = file.application;
  const done = milestones(file.state).filter((step) => step.stage === "done").length;
  return (
    <main id="main" className="work">
      <header className="work-head">
        <h1>Pipeline</h1>
        <span className="dim">
          1 loan · {file.loading ? "reading…" : "read from Juniper's pod"}
        </span>
      </header>
      <div className="table-wrap">
        <table className="grid pipeline">
          <thead>
            <tr>
              <th scope="col">Loan</th>
              <th scope="col">Borrower</th>
              <th scope="col">Property</th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col">Stage</th>
              <th scope="col">Progress</th>
              <th scope="col">Application</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Link href={`/loans/${LOAN_NUMBER}/summary`} className="loan-link">
                  <Mono>{LOAN_NUMBER}</Mono>
                </Link>
              </td>
              <td>Alex Rivera</td>
              <td>
                {application?.state === "ok"
                  ? application.value.subjectProperty.address.streetAddress
                  : "—"}
              </td>
              <td className="num">
                <Mono>
                  {application?.state === "ok"
                    ? usd(application.value.requestedAmount.amountValue)
                    : "—"}
                </Mono>
              </td>
              <td>
                <Chip tone="info">{pipelineStatus(file.state)}</Chip>
              </td>
              <td>
                <Mono>{done}/6</Mono>
              </td>
              <td>{stateChip(application)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="dim">
        Amounts are illustrative figures, not an offer. Juniper keeps pointers to Alex's
        credentials, not copies.
      </p>
    </main>
  );
}

function LoanFile() {
  const params = useParams<{ loan: string; tab?: string }>();
  const tab = tabById(params.tab ?? "summary");
  const desk = useDesk();
  useEffect(() => {
    if (tab !== undefined && !desk.pinned) desk.setRole(tab.role);
    applyDocumentMeta(org, `${params.loan} · ${tab?.label ?? "Not found"}`);
  }, [tab, desk.pinned, desk.setRole, params.loan]);
  if (params.loan !== LOAN_NUMBER || tab === undefined) return <NotFound />;
  const Body = TAB_COMPONENTS[tab.id] as ComponentType;
  return (
    <main id="main" className="work">
      <header className="work-head">
        <h1>
          <Mono>{LOAN_NUMBER}</Mono> <span className="dim">Alex Rivera · 14 Larch Lane</span>
        </h1>
        <span className="dim">
          {tab.label} · work of the {tab.role}
        </span>
      </header>
      <nav aria-label="Loan file" className="tabs">
        {TABS.map((entry) => (
          <Link
            key={entry.id}
            href={`/loans/${LOAN_NUMBER}/${entry.id}`}
            className={entry.id === tab.id ? "tab tab-on" : "tab"}
            aria-current={entry.id === tab.id ? "page" : undefined}
          >
            {entry.label}
          </Link>
        ))}
      </nav>
      <div className="tab-body">
        <h2 className="visually-hidden">{tab.label}</h2>
        <Body />
      </div>
    </main>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Not found"), []);
  return (
    <main id="main" className="work">
      <h1>Page not found</h1>
      <p>
        <Link href="/">Back to the pipeline</Link>
      </p>
    </main>
  );
}

function Sidebar({ role, onRole }: { role: Role; onRole(role: Role): void }) {
  const persona = personaOf(role);
  return (
    <aside className="side" aria-label="Loan Desk">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          J
        </span>
        <span>
          <strong>Juniper</strong> <span className="brand-sub">Loan Desk</span>
        </span>
      </div>
      <nav aria-label="Desk" className="side-nav">
        <Link href="/">Pipeline</Link>
        <Link href={`/loans/${LOAN_NUMBER}/summary`}>
          <Mono>{LOAN_NUMBER}</Mono>
        </Link>
      </nav>
      <div className="role">
        <label htmlFor="role-switch">Role</label>
        <select
          id="role-switch"
          value={role}
          onChange={(event) => onRole(event.target.value as Role)}
        >
          {ROLES.map((entry) => (
            <option key={entry} value={entry}>
              {personaOf(entry).name}, {entry}
            </option>
          ))}
        </select>
        <p className="side-note">
          Acting as <strong>{persona.name}</strong>. Sign-in is simulated; every request is made as
          Juniper Home Loans and the pod checks it.
        </p>
      </div>
      <nav aria-label="Elsewhere" className="side-links">
        <a href={appUrl("lender")}>Borrower portal</a>
        <a href={appUrl("welcome")}>All demo apps</a>
      </nav>
    </aside>
  );
}

function Shell({ dayOne }: { dayOne?: string }) {
  const [role, setRoleState] = useState<Role>("processor");
  const [pinned, setPinned] = useState(false);
  const calendar = useMemo(() => createDemoCalendar(dayOne), [dayOne]);
  const desk = useMemo(
    () => ({ calendar, pinned, role, setRole: setRoleState }),
    [calendar, pinned, role],
  );
  return (
    <DeskContext.Provider value={desk}>
      <TrustBanner signedInAs={personaOf(role)} />
      <a href="#main" className="skip">
        Skip to content
      </a>
      <div className="desk">
        <Sidebar
          role={role}
          onRole={(next) => {
            setRoleState(next);
            setPinned(true);
          }}
        />
        <LoanFileProvider>
          <Switch>
            <Route path="/" component={Pipeline} />
            <Route path="/loans/:loan/:tab?" component={LoanFile} />
            <Route component={NotFound} />
          </Switch>
        </LoanFileProvider>
      </div>
    </DeskContext.Provider>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook, dayOne }: { hook?: BaseLocationHook; dayOne?: string }) {
  return (
    <DemoTrust org={org}>
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Shell {...(dayOne === undefined ? {} : { dayOne })} />
      </Router>
    </DemoTrust>
  );
}
