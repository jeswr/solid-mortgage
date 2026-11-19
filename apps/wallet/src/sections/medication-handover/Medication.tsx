// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn's medication-handover screens (flows.md section 5): Rosa's medicines and allergy with the
 * change history each change carries, the requests she answers (and her carer), the grants she
 * can withdraw, Alex's "Shared with me", and the journey ledger with totals counted from the log.
 * Every clinical detail is fictional and none of it is clinical guidance.
 */
import "../moving-house/moving-house.css";
import "./medication.css";
import { DAY, NOT_CLINICAL } from "@mortgage/content/medication-handover/facts";
import type {
  AllergyIntolerance,
  MedicationStatement,
  ProvenanceRecord,
} from "@mortgage/content/medication-handover/fhir";
import {
  approveMedGrants,
  type GrantRecord,
  isMedCode,
  M1_UNTIL_LABEL,
  MED_CODES,
  MED_GRANTS,
  type MedCode,
  medGrants,
  pendingRequests,
  UNTIL_WITHDRAWN,
  withdrawMedGrant,
} from "@mortgage/content/medication-handover/grants";
import {
  type MedicationTotals,
  medicationTotals,
} from "@mortgage/content/medication-handover/ledger";
import { MEDICATION_HOLDER, medicationLens } from "@mortgage/content/medication-handover/mount";
import { prepareMedicationHandover } from "@mortgage/content/medication-handover/prepare";
import { TOUR } from "@mortgage/content/medication-handover/tour";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { HOLDERS } from "@mortgage/demo-kit/holders";
import { defineJourneyLedger, type JourneyLedger } from "@mortgage/lens";
import { onEvent, onReset } from "@mortgage/pod-runtime";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Screen } from "../../App.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../../components/ui.tsx";
import { usePodData, useWallet } from "../../runtime.tsx";

const journey = () => import("@mortgage/content/medication-handover/journey");

const BACK = { href: "/health", label: "Health" };

let preparing: Promise<boolean> | undefined;

/** Bring the pods to the demo's start (once per page; it checks the pods first). */
function prepared<T extends World>(world: T): Promise<T> {
  preparing ??= prepareMedicationHandover(world).catch((error: unknown) => {
    preparing = undefined;
    throw error;
  });
  return preparing.then(() => world);
}

/** A run of a wallet action with its outcome shown, never swallowed. */
function useRun() {
  const { run } = useWallet();
  const [state, setState] = useState<{ running: boolean; error?: unknown; done?: string }>({
    running: false,
  });
  const go = (label: string, action: Parameters<typeof run>[0]) => {
    setState({ running: true });
    run(action).then(
      () => setState({ done: label, running: false }),
      (error: unknown) => setState({ error, running: false }),
    );
  };
  return { go, state };
}

/** Rosa's screens act for Rosa; the carer's screen for Alex. */
function NotThisHolder({ who, where }: { who: string; where: string }) {
  return (
    <Empty>
      This screen is {who}'s. <Link href={where}>Open it as {who}</Link>.
    </Empty>
  );
}

function Nav() {
  const links: [string, string][] = [
    ["/health", "Medicines"],
    ["/health/requests", "Requests"],
    ["/health/sharing", "Who can see it"],
    ["/health/ledger", "Journey ledger"],
  ];
  return (
    <nav aria-label="Health" className="mh-nav">
      {links.map(([href, label]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

const dateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });

function History({ records }: { records: readonly ProvenanceRecord[] }) {
  if (records.length === 0) return <p className="muted small">Listed by Rosa.</p>;
  return (
    <ol className="med-history" aria-label="Change history">
      {records.map((record) => (
        <li key={record.value}>
          <strong>{dateLabel(record.recorded)}</strong> · {record.author},{" "}
          {record.onBehalfOf.display}: {record.why}
        </li>
      ))}
    </ol>
  );
}

function MedicineCard({
  statement,
  history,
}: {
  statement: MedicationStatement;
  history: readonly ProvenanceRecord[];
}) {
  const medicine = statement.medicine;
  return (
    <li className="card med-card" data-testid={`med-${medicine.ingredient}`}>
      <div className="med-head">
        <p>
          <strong>{medicine.product}</strong>
        </p>
        <span className={statement.isActive ? "med-state" : "med-state stopped"}>
          {statement.isActive ? "Taking" : "Stopped"}
        </span>
      </div>
      <p className="small">{statement.dosage}</p>
      <p className="muted small">RxNorm {medicine.rxcui}</p>
      <History records={history} />
    </li>
  );
}

function AllergyCard({ allergy }: { allergy: AllergyIntolerance }) {
  return (
    <li className="card med-card" data-testid={`allergy-${allergy.substance.ingredient}`}>
      <p>
        <strong>{allergy.substance.product}</strong>
      </p>
      <p className="small">{allergy.notes.join(" ")}</p>
    </li>
  );
}

interface HealthData {
  statements: MedicationStatement[];
  allergies: AllergyIntolerance[];
  history: ProvenanceRecord[];
}

/** Step 1: Rosa's medicines and allergy, with each change's history. */
export function MedHealth() {
  const { holder } = useWallet();
  const { data, error } = usePodData<HealthData>(async (world) => {
    if (world.holder !== MEDICATION_HOLDER.id)
      return { allergies: [], history: [], statements: [] };
    const j = await journey();
    await prepared(world);
    // The history first: the page's last read is the allergy, which completes the tour step.
    const history = await j.readProvenance(world, "rosa");
    const view = await j.openHealth(world);
    return { ...view, history };
  });
  if (holder !== MEDICATION_HOLDER.id) {
    return (
      <Screen title="Health" page="Health">
        <NotThisHolder who="Rosa" where="/health?holder=rosa" />
      </Screen>
    );
  }
  return (
    <Screen title="Health" page="Health">
      <p className="muted small">
        Rosa's medicines and allergies, in her pod. Every change carries who made it and why.{" "}
        {NOT_CLINICAL}
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? <Loading what="Rosa's medicines" /> : null}
      {data !== undefined ? (
        <>
          <h2 className="med-h2">Medicines</h2>
          <ul className="mh-list" data-testid="med-list">
            {data.statements.map((statement) => (
              <MedicineCard
                key={statement.value}
                statement={statement}
                history={data.history.filter((record) =>
                  record.targets.some((target) => target.iri === statement.value),
                )}
              />
            ))}
          </ul>
          <h2 className="med-h2">Allergies</h2>
          <ul className="mh-list">
            {data.allergies.map((allergy) => (
              <AllergyCard key={allergy.value} allergy={allergy} />
            ))}
          </ul>
        </>
      ) : null}
      <Nav />
    </Screen>
  );
}

interface RequestsData {
  pending: { code: MedCode; name: string; from: string }[];
  grants: GrantRecord[];
}

async function loadRequests(world: World): Promise<RequestsData> {
  await prepared(world);
  const grants = await medGrants(world);
  const active = new Set(grants.filter((g) => g.state === "active").map((g) => g.code));
  const requests = await pendingRequests(world);
  const pending = requests
    .filter((request) => isMedCode(request.grantCode) && !active.has(request.grantCode))
    .map((request) => ({
      code: request.grantCode as MedCode,
      from: request.assigneeIri,
      name: request.name,
    }));
  return { grants, pending };
}

/** Step 3: answer the pharmacy's and the practice's requests, and add Alex as carer. */
export function MedRequests() {
  const { holder } = useWallet();
  const { data, error } = usePodData(async (world) =>
    world.holder === MEDICATION_HOLDER.id ? loadRequests(world) : undefined,
  );
  const { go, state } = useRun();
  const [carer, setCarer] = useState(true);
  if (holder !== MEDICATION_HOLDER.id) {
    return (
      <Screen title="Requests" page="Health requests" back={BACK}>
        <NotThisHolder who="Rosa" where="/health/requests?holder=rosa" />
      </Screen>
    );
  }
  const carerActive = data?.grants.some((g) => g.code === "M4" && g.state === "active") ?? false;
  const codes: MedCode[] = [
    ...(data?.pending.map((p) => p.code) ?? []),
    ...(carer && !carerActive ? (["M4"] as const) : []),
  ];
  return (
    <Screen title="Requests" page="Health requests" back={BACK}>
      <p className="muted small">
        Each grant names who may see what, and why. The pod enforces it; you can withdraw it at any
        time.
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? <Loading what="your requests" /> : null}
      {data !== undefined ? (
        <section className="card" aria-labelledby="med-requests">
          <h2 id="med-requests">Waiting for you</h2>
          {data.pending.length === 0 ? <p className="muted small">No requests waiting.</p> : null}
          <ul className="mh-list">
            {data.pending.map((request) => {
              const spec = MED_GRANTS[request.code];
              return (
                <li
                  key={request.code}
                  className="med-request"
                  data-testid={`med-request-${request.code}`}
                >
                  <div className="card-head">
                    <OrgBadge webid={request.from} />
                    <div>
                      <p>
                        <strong>{ORGS[spec.to as keyof typeof ORGS]?.organisation}</strong>{" "}
                        <span className="mh-code">{request.code}</span>
                      </p>
                      <p className="small">{spec.scope}</p>
                      <p className="muted small">
                        Purpose: {spec.purpose} · {UNTIL_WITHDRAWN}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <label className="mh-choice med-carer">
            <input
              type="checkbox"
              checked={carer || carerActive}
              disabled={carerActive || state.running}
              onChange={(event) => setCarer(event.target.checked)}
            />
            <span>
              <strong>Add {HOLDERS.alex.name} as my carer</strong>{" "}
              <span className="mh-code">M4</span>
              <br />
              <span className="small">{MED_GRANTS.M4.scope}</span>
            </span>
          </label>
          <button
            type="button"
            className="button primary wide"
            data-tour="wallet-med-approve"
            disabled={codes.length === 0 || state.running}
            onClick={() =>
              go("approved", async (world) => {
                await approveMedGrants({ ...world, day: DAY.discharge }, codes, "14:30");
              })
            }
          >
            {state.running ? "Approving…" : "Approve"}
          </button>
        </section>
      ) : null}
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status">
          <strong>Grants given</strong>
          <p>Each was told in its inbox. The hospital's grant for the stay has ended.</p>
        </div>
      ) : null}
      <Nav />
    </Screen>
  );
}

function grantLine(record: GrantRecord): string {
  const code = record.code as MedCode;
  const until = code === "M1" ? M1_UNTIL_LABEL : UNTIL_WITHDRAWN;
  const state =
    record.state === "active" ? until : record.state === "expired" ? "Ended" : "Withdrawn";
  return `${MED_GRANTS[code].scope} · ${state}`;
}

/** Step 9: the grants on record; withdraw one. */
export function MedSharing() {
  const { holder } = useWallet();
  const grants = usePodData(async (world) =>
    world.holder === MEDICATION_HOLDER.id ? medGrants(await prepared(world)) : [],
  );
  const { go, state } = useRun();
  if (holder !== MEDICATION_HOLDER.id) {
    return (
      <Screen title="Who can see it" page="Who can see your health record" back={BACK}>
        <NotThisHolder who="Rosa" where="/health/sharing?holder=rosa" />
      </Screen>
    );
  }
  const shown = (grants.data ?? []).filter((record) => isMedCode(record.code));
  return (
    <Screen title="Who can see it" page="Who can see your health record" back={BACK}>
      {grants.error !== undefined ? <Problem error={grants.error} /> : null}
      {grants.data === undefined && grants.error === undefined ? (
        <Loading what="your grants" />
      ) : null}
      {grants.data !== undefined && shown.length === 0 ? (
        <Empty>Nobody can see your health record.</Empty>
      ) : null}
      <ul className="mh-list">
        {MED_CODES.flatMap((code) => {
          const record = shown.find((candidate) => candidate.code === code);
          if (record === undefined) return [];
          const to = MED_GRANTS[code].to;
          const name = to === "alex" ? HOLDERS.alex.name : ORGS[to].organisation;
          return [
            <li key={code} className="card" data-testid={`med-grant-${code}`}>
              <div className="card-head">
                {to === "alex" ? null : <OrgBadge slug={to} />}
                <div>
                  <p>
                    <strong>{name}</strong> <span className="mh-code">{code}</span>
                  </p>
                  <p className="small">{grantLine(record)}</p>
                </div>
              </div>
              {record.state === "active" && code !== "M1" ? (
                <button
                  type="button"
                  className="button revoke"
                  data-tour={code === "M2" ? "wallet-med-revoke-pharmacy" : undefined}
                  disabled={state.running}
                  onClick={() =>
                    go(code, async (world) => {
                      await withdrawMedGrant({ ...world, day: DAY.changePharmacy }, code, "10:15");
                    })
                  }
                >
                  Withdraw {to === "alex" ? HOLDERS.alex.short : ORGS[to].short}
                </button>
              ) : null}
            </li>,
          ];
        })}
      </ul>
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status">
          <strong>Grant withdrawn</strong>
          <p>
            The withdrawal is in your consent records, and they were told. What they recorded
            themselves stays with them.
          </p>
        </div>
      ) : null}
      <Nav />
    </Screen>
  );
}

/** Step 8: Alex's "Shared with me": Rosa's medicines, read-only, under M4. */
export function MedSharedWithMe() {
  const { holder } = useWallet();
  const { data, error } = usePodData(async (world) =>
    world.holder === "alex" ? (await journey()).openSharedWithMe(world) : undefined,
  );
  if (holder !== "alex") {
    return (
      <Screen title="Shared with me" page="Shared with me">
        <NotThisHolder who="Alex" where="/health/shared?holder=alex" />
      </Screen>
    );
  }
  const current = data?.statements.filter((statement) => statement.isActive) ?? [];
  const stopped = data?.statements.filter((statement) => !statement.isActive) ?? [];
  return (
    <Screen title="Shared with me" page="Shared with me">
      <p className="muted small">
        Records other people share with you. You can read them; you cannot change them.{" "}
        {NOT_CLINICAL}
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? (
        <Loading what="what is shared with you" />
      ) : null}
      {data !== undefined && data.sharedBy.length === 0 ? (
        <Empty>Nothing is shared with you yet.</Empty>
      ) : null}
      {data !== undefined && data.sharedBy.length > 0 ? (
        <section className="card" aria-labelledby="med-shared">
          <h2 id="med-shared">{HOLDERS.rosa.name}: medicines</h2>
          <p className="muted small">Read-only, under grant M4. Current as of this read.</p>
          <ul className="mh-list" data-testid="med-shared-current">
            {current.map((statement) => (
              <li key={statement.value} className="med-line">
                <strong>{statement.medicine.product}</strong>
                <span className="small">{statement.dosage}</span>
              </li>
            ))}
          </ul>
          {stopped.length > 0 ? (
            <p className="small" data-testid="med-shared-stopped">
              Stopped: {stopped.map((statement) => statement.medicine.product).join(", ")}.
            </p>
          ) : null}
        </section>
      ) : null}
    </Screen>
  );
}

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

function Totals({ totals }: { totals: MedicationTotals }) {
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const items: [string, number, string][] = [
    ["lists", totals.lists, plural(totals.lists, "medication list", "medication lists")],
    [
      "writers",
      totals.writers,
      plural(totals.writers, "organisation wrote to it", "organisations wrote to it"),
    ],
    ["readers", totals.readers, plural(totals.readers, "reader", "readers")],
    ["changes", totals.changes, plural(totals.changes, "change", "changes")],
    ["attributed", totals.attributed, "signed with a name and a reason"],
    ["denied", totals.denied, plural(totals.denied, "refused read", "refused reads")],
  ];
  return (
    <ul className="mh-totals" aria-label="Totals counted from the log">
      {items.map(([key, value, label]) => (
        <li key={key} data-metric={`medication-handover.${key}`} data-value={value}>
          <strong>{value}</strong> {label}
        </li>
      ))}
    </ul>
  );
}

/** Step 10: the journey ledger, with totals counted from the same log. */
export function MedLedger() {
  const entries = useLog();
  const totals = medicationTotals(entries);
  const mount = useRef<HTMLDivElement>(null);
  const ledger = useRef<JourneyLedger | null>(null);
  const pushed = useRef(0);
  useEffect(() => {
    defineJourneyLedger();
    const element = document.createElement("journey-ledger") as JourneyLedger;
    const calendar = createDemoCalendar();
    element.configure(
      {
        ...medicationLens(),
        app: "wallet",
        calendar: { dayOf: (d) => calendar.dayOf(d), label: (d) => calendar.label(d) },
        holder: MEDICATION_HOLDER,
        registry: ORGS,
      },
      {
        headingLevel: 2,
        steps: TOUR.map((step) => ({
          chapter: step.chapter,
          id: step.id,
          title: step.title,
          ...(step.clock ? { day: step.clock.day } : {}),
        })),
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
    <Screen title="Journey ledger" page="Medication journey ledger" back={BACK}>
      <p className="muted small">
        Counted from the pod's request log, not typed in: who wrote to Rosa's list, who read it,
        each change with its provenance record, and the read the pod refused.
      </p>
      <Totals totals={totals} />
      <div ref={mount} className="mh-ledger" data-tour="med-journey-ledger" />
      <Nav />
    </Screen>
  );
}
