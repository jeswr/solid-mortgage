// AUTHORED-BY Claude Opus 5.5
/**
 * Riverbend General Hospital's ward system: a clinical record with a patient banner and dense
 * tabs. On the Discharge medicines tab the ward pharmacist reconciles Rosa's list and signs: each
 * change goes to Rosa's pod with its reason (a FHIR Provenance record), with the discharge
 * prescriptions and summary. Everything is fictional and none of it is clinical guidance.
 */
import {
  ADMISSION_LIST,
  CLINICIANS,
  DAY,
  DISCHARGE_CHANGES,
  type MedicineChange,
  NOT_CLINICAL,
} from "@mortgage/content/medication-handover/facts";
import type { DischargeView } from "@mortgage/content/medication-handover/journey";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { org } from "./org.ts";
import { appWorld, journey, type Outcome, useAction, usePodState } from "./runtime.ts";

/** The router base: Vite's `base` without its trailing slash ("/hospital"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Masthead() {
  return (
    <header className="masthead">
      <p className="masthead-name">{org.organisation}</p>
      <p className="masthead-sub">Ward system · Ward 4 East</p>
      <p className="masthead-user">
        {org.persona?.name}, {org.persona?.role}
      </p>
    </header>
  );
}

/** The patient banner: who this record is, and what must never be missed. */
function PatientBanner() {
  return (
    <section className="patient-banner" aria-label="Patient">
      <p className="pb-name">
        <strong>RIVERA, Rosa</strong> <span>Mrs</span>
      </p>
      <dl className="pb-facts">
        <div>
          <dt>Born</dt>
          <dd>Fictional</dd>
        </div>
        <div>
          <dt>Record</dt>
          <dd>In her pod</dd>
        </div>
        <div>
          <dt>Admitted</dt>
          <dd>Day {DAY.admission}</dd>
        </div>
        <div className="pb-allergy">
          <dt>Allergy</dt>
          <dd>Amoxicillin</dd>
        </div>
      </dl>
    </section>
  );
}

const TABS: [string, string][] = [
  ["/", "Summary"],
  ["/medicines", "Medicines on admission"],
  ["/discharge", "Discharge medicines"],
];

function Tabs() {
  const [location] = useLocation();
  return (
    <nav aria-label="Patient record" className="tabs">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={location === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Page({
  title,
  shown = false,
  children,
}: {
  title: string;
  /** Show the page's heading (the record's tabs name every other page). */
  shown?: boolean;
  children: ReactNode;
}) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return (
    <main className="record">
      <h1 className={shown ? "page-title" : "sr-only"}>{title}</h1>
      <PatientBanner />
      <Tabs />
      <div className="tab-body">{children}</div>
      <p className="footnote">{NOT_CLINICAL}</p>
    </main>
  );
}

function Refused({ outcome }: { outcome: Extract<Outcome<unknown>, { state: "refused" }> }) {
  return (
    <div role="alert" className="alert">
      <p>
        <strong>Refused by the pod ({outcome.status}).</strong> The hospital's access to Rosa's
        record was for her stay. It has ended; her record is hers.
      </p>
    </div>
  );
}

function Summary() {
  return (
    <Page title="Summary">
      <h2>Admission summary</h2>
      <p>
        Admitted on day {DAY.admission} with chest pain; cardiac causes assessed. Kidney function
        fell during the stay and recovered. Planned discharge: day {DAY.discharge}.
      </p>
      <p>
        Rosa keeps her own medication list in her pod. Under grant M1, given when she was admitted,
        the ward reads it and writes changes back there, so nothing is retyped at discharge.
      </p>
      <p>
        <Link href="/discharge">Reconcile discharge medicines</Link> ·{" "}
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

function AdmissionList() {
  return (
    <Page title="Medicines on admission">
      <h2>Medicines on admission, as Rosa listed them</h2>
      <table className="grid">
        <thead>
          <tr>
            <th scope="col">Medicine</th>
            <th scope="col">Instruction</th>
            <th scope="col">RxNorm</th>
          </tr>
        </thead>
        <tbody>
          {ADMISSION_LIST.map((medicine) => (
            <tr key={medicine.key}>
              <td>{medicine.product}</td>
              <td>{medicine.dosage}</td>
              <td className="code">{medicine.rxcui}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Page>
  );
}

const MARK: Record<MedicineChange["kind"], string> = {
  "dose-changed": "Dose changed",
  new: "New",
  stopped: "Stopped",
};

interface DischargeState {
  view: DischargeView;
  signed: boolean;
}

async function loadDischarge(): Promise<DischargeState> {
  const view = await (await journey()).openDischarge(await appWorld());
  const lisinopril = view.statements.find((s) => s.medicine.ingredient === "lisinopril");
  const signed = lisinopril?.medicine.product === "Lisinopril 20 mg tablet";
  return { signed, view };
}

function Discharge() {
  const { outcome } = usePodState(loadDischarge, ["rosa"]);
  const sign = useAction();
  const state = outcome.state === "ok" ? outcome.value : undefined;
  const signed = state?.signed === true || sign.outcome.state === "ok";
  return (
    <Page title="Discharge medicines">
      <h2>Discharge medicines reconciliation</h2>
      {outcome.state === "loading" ? <p role="status">Reading Rosa's list from her pod…</p> : null}
      {outcome.state === "refused" ? <Refused outcome={outcome} /> : null}
      {outcome.state === "error" ? (
        <p role="alert" className="alert">
          {outcome.message}
        </p>
      ) : null}
      {state !== undefined ? (
        <>
          <p className="small">
            Read from Rosa's pod under grant M1: {state.view.statements.length} medicines,{" "}
            {state.view.allergies.length} allergy.
          </p>
          <table className="grid" data-testid="hospital-changes">
            <thead>
              <tr>
                <th scope="col">Change</th>
                <th scope="col">Medicine</th>
                <th scope="col">Reason recorded</th>
              </tr>
            </thead>
            <tbody>
              {DISCHARGE_CHANGES.map((change) => (
                <tr key={change.medicine.key} data-change={change.kind}>
                  <td>
                    <span className={`marker marker-${change.kind}`}>{MARK[change.kind]}</span>
                  </td>
                  <td>
                    {change.medicine.product}
                    <span className="small block">{change.medicine.dosage}</span>
                  </td>
                  <td className="small">{change.why}</td>
                </tr>
              ))}
              {state.view.statements
                .filter(
                  (s) =>
                    !DISCHARGE_CHANGES.some((c) => c.medicine.ingredient === s.medicine.ingredient),
                )
                .map((s) => (
                  <tr key={s.value} data-change="none">
                    <td>
                      <span className="marker">Continue</span>
                    </td>
                    <td>
                      {s.medicine.product}
                      <span className="small block">{s.dosage}</span>
                    </td>
                    <td className="small">–</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="small">
            Signing writes each change to Rosa's pod with a provenance record (who, when, why), the
            two discharge prescriptions, and the discharge summary. Signed by {CLINICIANS.hospital}.
          </p>
          <button
            type="button"
            className="sign"
            data-tour="hospital-sign-discharge"
            disabled={signed || sign.outcome.state === "running"}
            onClick={() =>
              void sign.run(async () => {
                await (await journey()).signDischarge(await appWorld(DAY.discharge));
              })
            }
          >
            {sign.outcome.state === "running" ? "Signing…" : signed ? "Signed" : "Sign"}
          </button>
          {signed ? (
            <p role="status" className="ok" data-testid="hospital-signed">
              Signed. The list, the reasons, the prescriptions and the discharge summary are in
              Rosa's pod.
            </p>
          ) : null}
          {sign.outcome.state === "refused" ? <Refused outcome={sign.outcome} /> : null}
          {sign.outcome.state === "error" ? (
            <p role="alert" className="alert">
              {sign.outcome.message}
            </p>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found" shown>
      <Link href="/">Back to the summary</Link>
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
          <Route path="/" component={Summary} />
          <Route path="/medicines" component={AdmissionList} />
          <Route path="/discharge" component={Discharge} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
