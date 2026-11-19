// AUTHORED-BY Claude Opus 5.5
/**
 * Corner Dispensary's dispensing workstation: the queue on the left, the patient and the label
 * preview on the right. Rosa's medicines and allergies are read from her pod under grant M2; the
 * pharmacy's own supply records live in its own pod. Everything is fictional and none of it is
 * clinical guidance.
 */
import { DAY, NOT_CLINICAL, SUPPLY_QUANTITY } from "@mortgage/content/medication-handover/facts";
import type { MedicationDispense } from "@mortgage/content/medication-handover/fhir";
import type { QueueLine, QueueView } from "@mortgage/content/medication-handover/journey";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import { appWorld, journey, type Outcome, useAction, usePodState } from "./runtime.ts";

/** The router base: Vite's `base` without its trailing slash ("/pharmacy"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Bar() {
  return (
    <header className="bar">
      <p className="bar-name">
        <span className="bar-mark" aria-hidden="true">
          +
        </span>
        {org.organisation}
      </p>
      <nav aria-label="Dispensary" className="bar-nav">
        <Link href="/queue">Queue</Link>
        <Link href="/records">Our records</Link>
      </nav>
      <p className="bar-user">
        {org.persona?.name}, {org.persona?.role}
      </p>
    </header>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return <main className="station">{children}</main>;
}

const dayLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });

function Refused({ outcome }: { outcome: Extract<Outcome<unknown>, { state: "refused" }> }) {
  return (
    <div role="alert" className="alert">
      <p>
        <strong>Refused by the pod ({outcome.status}).</strong> Rosa has not shared her medicines
        with Corner Dispensary, or has withdrawn it. Our own dispensing records are unaffected.
      </p>
    </div>
  );
}

/** What the workstation shows: the live view when Rosa's record was read, or our own records. */
interface Station {
  /** Discharge prescriptions not yet supplied. */
  pending: boolean;
  /** The live view of Rosa's list, when it was read on this visit. */
  live: QueueView | undefined;
  /** What we supplied, from our own pod. */
  supplies: MedicationDispense[];
}

async function loadStation(): Promise<Station> {
  const world = await appWorld();
  const j = await journey();
  const supplies = await j.readPharmacyRecords(world);
  const supplied = j.pharmacyRecordUrl(world, "atorvastatin", DAY.discharge);
  const pending = !supplies.some((supply) => supply.value === supplied);
  // A new prescription puts Rosa in the queue: the workstation opens her record. Once supplied,
  // it shows our own records until the pharmacist reads her list again (Refresh).
  const live = pending ? await j.openQueue(world) : undefined;
  return { live, pending, supplies };
}

const STATUS_LABEL: Record<QueueLine["status"], string> = {
  changed: "Changed",
  new: "New",
  stopped: "Stopped",
  unchanged: "No change",
};

function Lines({ lines, testid }: { lines: readonly QueueLine[]; testid: string }) {
  return (
    <table className="lines" data-testid={testid}>
      <caption className="sr-only">Rosa's list against our last supply</caption>
      <thead>
        <tr>
          <th scope="col">Medicine</th>
          <th scope="col">Against last supply</th>
          <th scope="col">Why</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.key} data-status={line.status} data-testid={`line-${line.key}`}>
            <td>
              <strong>{line.now.product}</strong>
              <br />
              <span className="small">{line.dosage}</span>
            </td>
            <td>
              <span className={`tag tag-${line.status}`}>{STATUS_LABEL[line.status]}</span>
              {line.lastSupplied !== undefined ? (
                <span className="small block">
                  Last: {line.lastSupplied.product}, {dayLabel(line.lastSupplied.day)}
                </span>
              ) : null}
            </td>
            <td className="small">
              {line.why === undefined
                ? "–"
                : `${line.why.text} (${line.why.author}, ${line.why.organisation})`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One label per item to dispense, as the printer will produce them. */
function Labels({ lines }: { lines: readonly QueueLine[] | undefined }) {
  if (lines === undefined || lines.length === 0) return null;
  return (
    <div className="labels" data-testid="label-preview">
      {lines.map((line) => (
        <figure className="label" key={line.key} aria-labelledby={`label-${line.key}`}>
          <figcaption id={`label-${line.key}`}>Label preview: {line.now.product}</figcaption>
          <div className="label-body">
            <p className="label-drug">{line.now.product.toUpperCase()}</p>
            <p>Quantity: {SUPPLY_QUANTITY}</p>
            <p className="label-dose">{line.dosage}</p>
            <p>Rosa Rivera</p>
            <p className="label-from">
              {org.organisation} · fictional label, not clinical guidance
            </p>
          </div>
        </figure>
      ))}
    </div>
  );
}

function Queue() {
  const { outcome, reload } = usePodState(loadStation, ["pharmacy"]);
  const dispense = useAction();
  const refresh = useAction();
  const [refreshed, setRefreshed] = useState<QueueLine[] | undefined>(undefined);
  const station = outcome.state === "ok" ? outcome.value : undefined;
  const live = station?.live;
  const lines = refreshed ?? live?.lines;
  const prescribed = lines?.filter((line) => live?.prescriptions.includes(line.key as never));
  return (
    <Page title="Queue">
      <aside className="queue" aria-labelledby="queue-title">
        <h1 id="queue-title">Queue</h1>
        <ol className="queue-list">
          <li aria-current="true">
            <strong>Rosa Rivera</strong>
            <span className="small block">
              {station === undefined
                ? "…"
                : station.pending
                  ? "Discharge prescriptions: 2"
                  : "Supplied. Refresh to read her list again"}
            </span>
          </li>
        </ol>
        <p className="small muted">{NOT_CLINICAL}</p>
      </aside>
      <section className="patient" aria-labelledby="patient-title">
        <h2 id="patient-title">Rosa Rivera</h2>
        {outcome.state === "loading" ? <p role="status">Connecting to the pods…</p> : null}
        {outcome.state === "refused" ? <Refused outcome={outcome} /> : null}
        {outcome.state === "error" ? (
          <p role="alert" className="alert">
            {outcome.message}
          </p>
        ) : null}
        {live !== undefined ? (
          <>
            <p className="small">
              Read from Rosa's pod under grant M2: her medicines, the reason for each change, and
              her allergies. Compared with our last supply, from our own records.
            </p>
            <p className="allergy" data-testid="pharmacy-allergies">
              Allergy:{" "}
              {live.allergies.map((allergy) => allergy.substance.product).join(", ") || "none"}
            </p>
            <Lines lines={live.lines} testid="pharmacy-lines" />
            <div className="split">
              <div>
                <h3>To dispense</h3>
                <ul className="small">
                  {prescribed?.map((line) => (
                    <li key={line.key}>
                      {line.now.product} × {SUPPLY_QUANTITY}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="primary"
                  data-tour="pharmacy-dispense"
                  disabled={!station?.pending || dispense.outcome.state === "running"}
                  onClick={() =>
                    void dispense.run(async () => {
                      await (await journey()).dispense(await appWorld(DAY.discharge));
                      reload();
                    })
                  }
                >
                  {dispense.outcome.state === "running" ? "Recording…" : "Dispense"}
                </button>
              </div>
              <Labels lines={prescribed} />
            </div>
          </>
        ) : null}
        {station !== undefined && !station.pending ? (
          <>
            <p className="small" data-testid="pharmacy-supplied">
              Supplied:{" "}
              {station.supplies
                .slice(0, 2)
                .map((supply) => `${supply.medicine.product} (${dayLabel(supply.whenHandedOver)})`)
                .join(", ")}
              . Recorded in Rosa's pod and in our own records.
            </p>
            <button
              type="button"
              className="primary"
              data-tour="pharmacy-refresh"
              disabled={refresh.outcome.state === "running"}
              onClick={() =>
                void refresh.run(async () => {
                  setRefreshed(await (await journey()).refreshQueue(await appWorld()));
                })
              }
            >
              {refresh.outcome.state === "running" ? "Reading…" : "Refresh"}
            </button>
            {refresh.outcome.state === "refused" ? <Refused outcome={refresh.outcome} /> : null}
            {refresh.outcome.state === "error" ? (
              <p role="alert" className="alert">
                {refresh.outcome.message}
              </p>
            ) : null}
            {refreshed !== undefined ? (
              <>
                <p className="small" role="status">
                  Rosa's list, read again under grant M2.
                </p>
                <Lines lines={refreshed} testid="pharmacy-refreshed" />
              </>
            ) : null}
          </>
        ) : null}
        {dispense.outcome.state === "refused" ? <Refused outcome={dispense.outcome} /> : null}
        {dispense.outcome.state === "error" ? (
          <p role="alert" className="alert">
            {dispense.outcome.message}
          </p>
        ) : null}
      </section>
    </Page>
  );
}

function Records() {
  const { outcome } = usePodState(
    async () => (await journey()).readPharmacyRecords(await appWorld()),
    ["pharmacy"],
  );
  return (
    <Page title="Our records">
      <section className="patient wide" aria-labelledby="records-title">
        <h1 id="records-title">Our dispensing records</h1>
        <p className="small">
          What we supplied to Rosa Rivera, kept in our own store as the law requires. Rosa's
          withdrawal of access does not touch these.
        </p>
        {outcome.state === "loading" ? <p role="status">Connecting to the pods…</p> : null}
        {outcome.state === "error" ? (
          <p role="alert" className="alert">
            {outcome.message}
          </p>
        ) : null}
        {outcome.state === "ok" ? (
          <ul className="records" data-testid="pharmacy-records">
            {outcome.value.map((supply) => (
              <li key={supply.value}>
                <span className="mono">{dayLabel(supply.whenHandedOver)}</span>{" "}
                {supply.medicine.product} × {supply.quantity}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="small">
          <a href={appUrl("welcome")}>All demo apps</a>
        </p>
      </section>
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found">
      <section className="patient wide">
        <h1>Page not found</h1>
        <Link href="/queue">Go to the queue</Link>
      </section>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Bar />
        <Switch>
          <Route path="/" component={Queue} />
          <Route path="/queue" component={Queue} />
          <Route path="/records" component={Records} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
