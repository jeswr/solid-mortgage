// AUTHORED-BY Claude Opus 5.5
/**
 * Larch Lane Family Practice's consultation screen: a timeline of encounters down the side, the
 * problem list, and Rosa's medicines read live from her pod under grant M3, each change with the
 * reason recorded beside it. Dr Marsh stops the duplicate statin and saves; the practice keeps a
 * record of the consultation that points at Rosa's list instead of copying it. Everything is
 * fictional and none of it is clinical guidance.
 */
import {
  CLINICIANS,
  DAY,
  NOT_CLINICAL,
  PRACTICE_CHANGE,
} from "@mortgage/content/medication-handover/facts";
import type { MedicationStatement } from "@mortgage/content/medication-handover/fhir";
import type { ConsultationView } from "@mortgage/content/medication-handover/journey";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import { appWorld, journey, type Outcome, useAction, usePodState } from "./runtime.ts";

/** The router base: Vite's `base` without its trailing slash ("/clinic"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Header() {
  return (
    <header className="header">
      <p className="header-name">{org.organisation}</p>
      <nav aria-label="Practice" className="header-nav">
        <Link href="/">Today</Link>
        <Link href="/consultation">Consultation</Link>
      </nav>
    </header>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return (
    <main className="page">
      {children}
      <p className="footnote">{NOT_CLINICAL}</p>
    </main>
  );
}

function Refused({ outcome }: { outcome: Extract<Outcome<unknown>, { state: "refused" }> }) {
  return (
    <div role="alert" className="alert">
      <p>
        <strong>Refused by the pod ({outcome.status}).</strong> Rosa has not shared her record with
        the practice yet. Her list stays in her pod until she does.
      </p>
    </div>
  );
}

function Today() {
  return (
    <Page title="Today">
      <h1>Today's list</h1>
      <p className="lede">Day {DAY.consultation}. One follow-up after a hospital stay.</p>
      <ol className="appointments">
        <li>
          <span className="time">09:30</span>
          <span>
            <strong>Rosa Rivera</strong>, follow-up after discharge from Riverbend General Hospital
          </span>
          <Link href="/consultation">Open consultation</Link>
        </li>
      </ol>
      <p>
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

/** The problem list: fictional, and only what the consultation needs. */
const PROBLEMS = ["High blood pressure", "Type 2 diabetes", "Raised cholesterol"];

const dayLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });

function why(view: ConsultationView, statement: MedicationStatement): string | undefined {
  const records = view.provenance.filter((record) =>
    record.targets.some((target) => target.iri === statement.value),
  );
  const latest = records.sort((a, b) => b.recorded.getTime() - a.recorded.getTime())[0];
  return latest === undefined ? undefined : `${latest.why} (${latest.author})`;
}

async function loadConsultation(): Promise<ConsultationView> {
  return (await journey()).openConsultation(await appWorld());
}

function Medicines({ view }: { view: ConsultationView }) {
  return (
    <table className="meds" data-testid="clinic-medicines">
      <caption className="sr-only">Rosa's medicines, read from her pod</caption>
      <thead>
        <tr>
          <th scope="col">Medicine</th>
          <th scope="col">Status</th>
          <th scope="col">Last change, and why</th>
        </tr>
      </thead>
      <tbody>
        {view.statements.map((statement) => (
          <tr
            key={statement.value}
            data-testid={`med-${statement.medicine.ingredient}`}
            data-active={String(statement.isActive)}
          >
            <td>
              <strong>{statement.medicine.product}</strong>
              <span className="small block">{statement.dosage}</span>
            </td>
            <td>{statement.isActive ? "Taking" : "Stopped"}</td>
            <td className="small">{why(view, statement) ?? "Listed by Rosa"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Consultation() {
  const { outcome } = usePodState(loadConsultation, ["rosa"]);
  const save = useAction();
  const view = outcome.state === "ok" ? outcome.value : undefined;
  const active = (ingredient: string) =>
    view?.statements.some((s) => s.medicine.ingredient === ingredient && s.isActive) === true;
  const duplicate = active("simvastatin") && active("atorvastatin");
  const saved = (view !== undefined && !active("simvastatin")) || save.outcome.state === "ok";
  return (
    <Page title="Consultation">
      <div className="consult">
        <aside className="timeline" aria-labelledby="timeline-title">
          <h2 id="timeline-title">Encounters</h2>
          <ol>
            <li>
              <span className="when">Day {DAY.admission}</span> Admitted, Riverbend General
            </li>
            <li>
              <span className="when">Day {DAY.discharge}</span> Discharged, summary in Rosa's pod
            </li>
            <li aria-current="step">
              <span className="when">Day {DAY.consultation}</span> Follow-up, {CLINICIANS.clinic}
            </li>
          </ol>
          <h2>Problems</h2>
          <ul>
            {PROBLEMS.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </aside>
        <section className="notes" aria-labelledby="consult-title">
          <h1 id="consult-title">Rosa Rivera: follow-up</h1>
          {outcome.state === "loading" ? (
            <p role="status">Reading Rosa's record from her pod…</p>
          ) : null}
          {outcome.state === "refused" ? <Refused outcome={outcome} /> : null}
          {outcome.state === "error" ? (
            <p role="alert" className="alert">
              {outcome.message}
            </p>
          ) : null}
          {view !== undefined ? (
            <>
              <p className="small" data-testid="clinic-summary">
                Read under grant M3: {view.summary.title}, {dayLabel(view.summary.date)}, by{" "}
                {view.summary.author}. Allergy:{" "}
                {view.allergies.map((allergy) => allergy.substance.product).join(", ") || "none"}.
              </p>
              <Medicines view={view} />
              {duplicate ? (
                <p className="flag" data-testid="clinic-duplicate">
                  Two statins are listed: simvastatin, from before the stay, and atorvastatin,
                  started in hospital.
                </p>
              ) : null}
              <h2>Plan</h2>
              <p>
                Stop simvastatin. Reason to record: <q>{PRACTICE_CHANGE.why}</q>
              </p>
              <button
                type="button"
                className="save"
                data-tour="clinic-save-consultation"
                disabled={saved || save.outcome.state === "running"}
                onClick={() =>
                  void save.run(async () => {
                    await (await journey()).stopDuplicate(await appWorld(DAY.consultation));
                  })
                }
              >
                {save.outcome.state === "running" ? "Saving…" : saved ? "Saved" : "Save"}
              </button>
              {saved ? (
                <p role="status" className="ok" data-testid="clinic-saved">
                  Saved. Simvastatin is stopped in Rosa's list, with the reason; the practice's own
                  record points at her list rather than copying it.
                </p>
              ) : null}
              {save.outcome.state === "refused" ? <Refused outcome={save.outcome} /> : null}
              {save.outcome.state === "error" ? (
                <p role="alert" className="alert">
                  {save.outcome.message}
                </p>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found">
      <h1>Page not found</h1>
      <Link href="/">Back to today's list</Link>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Header />
        <Switch>
          <Route path="/" component={Today} />
          <Route path="/consultation" component={Consultation} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
