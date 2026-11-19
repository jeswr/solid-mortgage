// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn's motor-claim screens (flows.md section 7): Alex's claim file (step 1), the requests for
 * the claim's grants (step 4), who saw which part of the claim file (step 6), and the grants with
 * the claim's closing revoke and the journey ledger (step 10).
 *
 * The motor-claim functions take Alex's grant lock themselves (content/motor-claim/lock.ts), so
 * they run through `runApart`, outside the wallet's own queue and lock: a Web Lock is not
 * re-entrant, and taking it twice would wait for ever.
 */
import "./motor-claim.css";
import type { ClaimFileView } from "@mortgage/content/motor-claim/claim";
import { CLAIM_NUMBER, DAY, INCIDENT, PATHS, PHOTOS } from "@mortgage/content/motor-claim/facts";
import { MOTOR_CODES, MOTOR_GRANTS, motorGrants } from "@mortgage/content/motor-claim/grants";
import type { ClaimRequest } from "@mortgage/content/motor-claim/journey";
import {
  type MotorClaimTotals,
  motorClaimTotals,
  NOT_FOR_THE_REPAIRER,
} from "@mortgage/content/motor-claim/ledger";
import { MOTOR_CLAIM_HOLDER, motorClaimLens } from "@mortgage/content/motor-claim/mount";
import { TOUR } from "@mortgage/content/motor-claim/tour";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { defineJourneyLedger, type JourneyLedger } from "@mortgage/lens";
import { onEvent, onReset } from "@mortgage/pod-runtime";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Screen } from "../../App.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../../components/ui.tsx";
import { usePodData, useWallet, type WalletWorld } from "../../runtime.tsx";

const journey = () => import("@mortgage/content/motor-claim/journey");

const BACK = { href: "/claim", label: `Claim ${CLAIM_NUMBER}` };

/** A world on a fixed day of the claim: the documents carry that day's time. */
const onDay = (world: WalletWorld, day: number): WalletWorld => ({ ...world, day });

/** A motor-claim action with its outcome shown, never swallowed (see the module comment). */
function useRun() {
  const { runApart } = useWallet();
  const [state, setState] = useState<{ running: boolean; error?: unknown; done?: string }>({
    running: false,
  });
  const go = (label: string, action: (world: WalletWorld) => Promise<unknown>) => {
    setState({ running: true });
    runApart(action).then(
      () => setState({ done: label, running: false }),
      (error: unknown) => setState({ error, running: false }),
    );
  };
  return { go, state };
}

function Nav() {
  const links: [string, string][] = [
    ["/claim", "Claim file"],
    ["/claim/requests", "Requests"],
    ["/claim/seen", "Who saw what"],
    ["/claim/sharing", "Grants and ledger"],
  ];
  return (
    <nav aria-label="Motor claim" className="mc-nav">
      {links.map(([href, label]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

const photoSrc = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

interface ClaimScreenData {
  file: ClaimFileView;
  photos: { url: string; svg: string; caption: string }[];
}

async function loadClaim(world: WalletWorld): Promise<ClaimScreenData> {
  const { openNewClaim } = await journey();
  const { readPhoto } = await import("@mortgage/content/motor-claim/claim");
  const file = await openNewClaim(world);
  const photos = [];
  for (const url of file.incident?.photos ?? []) {
    const caption = PHOTOS.find((photo) => url.endsWith(photo.file))?.caption ?? "Photo";
    photos.push({ caption, svg: await readPhoto(world, "alex", url), url });
  }
  return { file, photos };
}

const dateTime = (date: Date) =>
  date.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

/** Step 1: the claim file in Alex's pod. */
export function MotorClaimFile() {
  const { data, error } = usePodData(loadClaim);
  const { go, state } = useRun();
  const file = data?.file;
  const started = file?.incident !== undefined;
  return (
    <Screen title={`Claim ${CLAIM_NUMBER}`} page={`Claim ${CLAIM_NUMBER}`}>
      <p className="muted small">
        The claim file lives in your pod, in <code>/{PATHS.claim}</code>. Organisations read the
        parts you grant, where they are.
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? <Loading what="your claim file" /> : null}
      {data !== undefined && !started ? (
        <section className="card" aria-labelledby="mc-new">
          <h2 id="mc-new">New claim</h2>
          <dl className="fields">
            <div className="field">
              <dt>What happened</dt>
              <dd>{INCIDENT.description}</dd>
            </div>
            <div className="field">
              <dt>Where</dt>
              <dd>{INCIDENT.location}</dd>
            </div>
            <div className="field">
              <dt>Photos</dt>
              <dd>{PHOTOS.map((photo) => photo.caption).join("; ")}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="button primary wide"
            data-tour="wallet-mc-start"
            disabled={state.running}
            onClick={() =>
              go("started", async (world) =>
                (await journey()).startClaimFile(onDay(world, DAY.incident)),
              )
            }
          >
            {state.running ? "Saving…" : "Start claim"}
          </button>
        </section>
      ) : null}
      {file?.incident !== undefined ? (
        <section className="card" aria-labelledby="mc-incident" data-testid="mc-incident">
          <h2 id="mc-incident">Incident report</h2>
          <dl className="fields">
            <div className="field">
              <dt>When</dt>
              <dd>{dateTime(file.incident.occurredAt)}</dd>
            </div>
            <div className="field">
              <dt>Where</dt>
              <dd>{file.incident.location}</dd>
            </div>
            <div className="field">
              <dt>Car</dt>
              <dd>{file.incident.vehicle.name}</dd>
            </div>
            <div className="field">
              <dt>What happened</dt>
              <dd>{file.incident.description}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      {data !== undefined && data.photos.length > 0 ? (
        <ul className="mc-photos" aria-label="Photos in your pod">
          {data.photos.map((photo) => (
            <li key={photo.url}>
              <img src={photoSrc(photo.svg)} alt={photo.caption} />
              <span>{photo.caption}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {file?.otherParty !== undefined ? (
        <section className="card" aria-labelledby="mc-other">
          <h2 id="mc-other">The other driver</h2>
          <dl className="fields">
            <div className="field">
              <dt>Name</dt>
              <dd>{file.otherParty.name}</dd>
            </div>
            <div className="field">
              <dt>Insurer</dt>
              <dd>{file.otherParty.insurerName}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      {file !== undefined && started ? (
        <section className="card" aria-labelledby="mc-added">
          <h2 id="mc-added">Added by others</h2>
          <ul className="mc-added">
            <li>
              Damage report (Wrenfield Mutual):{" "}
              {file.damageReport === undefined ? "not yet" : file.damageReport.damage.join("; ")}
            </li>
            <li>
              Estimate (Anvil Collision Repair):{" "}
              {file.estimate === undefined
                ? "not yet"
                : `${file.estimate.estimateNumber}, $${file.estimate.totalUsd.toFixed(2)} (illustrative)`}
            </li>
            <li>
              Invoice (Anvil Collision Repair):{" "}
              {file.invoice === undefined ? "not yet" : file.invoice.invoiceNumber}
            </li>
          </ul>
        </section>
      ) : null}
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status">
          <strong>Claim file started</strong>
          <p>Written to your pod only. Nobody else can read it until you grant access.</p>
        </div>
      ) : null}
      <Nav />
    </Screen>
  );
}

/** Step 4: the requests for the claim's grants. */
export function MotorClaimRequests() {
  const requests = usePodData(async (world) => (await journey()).claimRequests(world));
  const { go, state } = useRun();
  return (
    <Screen title="Requests" page="Claim requests" back={BACK}>
      <p className="muted small">
        Each organisation asks for exactly what its part of the claim needs, until that part ends.
      </p>
      {requests.error !== undefined ? <Problem error={requests.error} /> : null}
      {requests.data === undefined && requests.error === undefined ? (
        <Loading what="your requests" />
      ) : null}
      {requests.data !== undefined && requests.data.length === 0 ? (
        <Empty>No requests yet. Report the claim to Wrenfield Mutual first.</Empty>
      ) : null}
      <ul className="mc-list">
        {(requests.data ?? []).map((row: ClaimRequest) => {
          const spec = MOTOR_GRANTS[row.code];
          return (
            <li key={row.url} className="card" data-testid={`mc-request-${row.code.toLowerCase()}`}>
              <div className="card-head">
                <OrgBadge slug={spec.to} />
                <div>
                  <p>
                    <strong>{ORGS[spec.to].organisation}</strong>
                  </p>
                  <p className="muted small">{spec.description}</p>
                </div>
                <span className="mc-code">{row.code}</span>
              </div>
              <ul className="mc-perms">
                {spec.permissions.map((permission) => (
                  <li key={permission.label}>{permission.label}</li>
                ))}
                <li>{spec.endLabel}</li>
              </ul>
              {row.state === "pending" && row.code === "C2" ? (
                <button
                  type="button"
                  className="button primary wide"
                  data-tour="wallet-mc-approve-repairer"
                  disabled={state.running}
                  onClick={() =>
                    go("approved", async (world) =>
                      (await journey()).approveRepairer(onDay(world, DAY.desk)),
                    )
                  }
                >
                  {state.running ? "Approving…" : "Approve"}
                </button>
              ) : (
                <p className="mc-state">
                  {row.state === "pending" ? "Waiting for you" : `Approved · now ${row.state}`}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status">
          <strong>Grant C2 given</strong>
          <p>Anvil can read the damage report and the photos until the job is complete.</p>
        </div>
      ) : null}
      <Nav />
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

const PARTS: readonly { label: string; path: string }[] = [
  { label: "Incident report", path: PATHS.incident },
  { label: "Other driver's details", path: PATHS.otherParty },
  { label: "Photos", path: PATHS.photos },
  { label: "Damage report", path: PATHS.damageReport },
  { label: "Estimate", path: PATHS.estimate },
  { label: "Invoice", path: PATHS.invoice },
];

const READERS = ["insurer", "repairer"] as const;

function readersOf(totals: MotorClaimTotals, path: string): string[] {
  const found = new Set<string>();
  for (const [read, who] of Object.entries(totals.readers)) {
    if (read === `/${path}` || (path.endsWith("/") && read.startsWith(`/${path}`))) {
      for (const reader of who) found.add(reader);
    }
  }
  return READERS.filter((reader) => found.has(reader));
}

/** Step 6: who read which part of the claim file, from the log. */
export function MotorClaimSeen() {
  const totals = motorClaimTotals(useLog());
  return (
    <Screen title="Who saw what" page="Who saw what" back={BACK}>
      <p className="muted small">
        From the pod's request log: every read below was checked by the pod against your grants.
      </p>
      <table className="mc-seen" data-testid="mc-seen">
        <caption>Claim {CLAIM_NUMBER}: who read each part</caption>
        <thead>
          <tr>
            <th scope="col">Part</th>
            {READERS.map((reader) => (
              <th key={reader} scope="col">
                {ORGS[reader].short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PARTS.map((part) => {
            const who = readersOf(totals, part.path);
            return (
              <tr key={part.path}>
                <th scope="row">{part.label}</th>
                {READERS.map((reader) => (
                  <td key={reader}>{who.includes(reader) ? "Read" : "–"}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <section className="card" aria-labelledby="mc-not-seen">
        <h2 id="mc-not-seen">Anvil did not see</h2>
        <ul className="mc-not-seen" data-testid="mc-not-seen">
          {NOT_FOR_THE_REPAIRER.map((item) => (
            <li key={item.path}>
              {item.label}
              {totals.notSeen.includes(item.label) ? "" : " (read)"}
            </li>
          ))}
        </ul>
        <p
          className="small"
          data-metric="motor-claim.repairer-things"
          data-value={totals.repairerThings}
        >
          Anvil read {totals.repairerThings} {totals.repairerThings === 1 ? "thing" : "things"}: the
          damage report and the photos. No rule let it read anything else.
        </p>
      </section>
      <Nav />
    </Screen>
  );
}

function Totals({ totals }: { totals: MotorClaimTotals }) {
  const items: [string, number, string][] = [
    ["parties", totals.parties, "parties touched the claim file"],
    ["grants", totals.claimGrants, "grants, each scoped to one job"],
    ["denied", totals.denied, totals.denied === 1 ? "refused read" : "refused reads"],
  ];
  return (
    <ul className="mc-totals" aria-label="Totals counted from the log">
      {items.map(([key, value, label]) => (
        <li key={key} data-metric={`motor-claim.${key}`} data-value={value}>
          <strong>{value}</strong> {label}
        </li>
      ))}
    </ul>
  );
}

async function loadGrants(world: WalletWorld) {
  const records = await motorGrants(world);
  return MOTOR_CODES.map((code) => ({
    code,
    state: records.find((record) => record.code === code)?.state ?? ("none" as const),
  }));
}

const STATE_TEXT = {
  active: "Active",
  expired: "Expired",
  none: "Not given",
  revoked: "Withdrawn",
} as const;

/** Step 10: the grants, the claim's closing revoke, and the journey ledger. */
export function MotorClaimSharing() {
  const grants = usePodData(loadGrants);
  const { go, state } = useRun();
  const entries = useLog();
  const totals = motorClaimTotals(entries);
  const mount = useRef<HTMLDivElement>(null);
  const ledger = useRef<JourneyLedger | null>(null);
  const pushed = useRef(0);
  useEffect(() => {
    defineJourneyLedger();
    const element = document.createElement("journey-ledger") as JourneyLedger;
    const calendar = createDemoCalendar();
    element.configure(
      {
        ...motorClaimLens(),
        app: "wallet",
        calendar: { dayOf: (d) => calendar.dayOf(d), label: (d) => calendar.label(d) },
        holder: MOTOR_CLAIM_HOLDER,
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
  const c1 = grants.data?.find((row) => row.code === "C1");
  return (
    <Screen title="Grants and ledger" page="Claim grants and ledger" back={BACK}>
      {grants.error !== undefined ? <Problem error={grants.error} /> : null}
      {grants.data === undefined && grants.error === undefined ? (
        <Loading what="your grants" />
      ) : null}
      <ul className="mc-list">
        {(grants.data ?? []).map((row) => {
          const spec = MOTOR_GRANTS[row.code];
          return (
            <li key={row.code} className="card" data-testid={`mc-grant-${row.code.toLowerCase()}`}>
              <div className="card-head">
                <OrgBadge slug={spec.to} />
                <div>
                  <p>
                    <strong>
                      {row.code} · {ORGS[spec.to].organisation}
                    </strong>
                  </p>
                  <p className="muted small">
                    {spec.description} · {spec.endLabel}
                  </p>
                </div>
                <span className={`mc-pill mc-pill-${row.state}`}>{STATE_TEXT[row.state]}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {c1 !== undefined ? (
        <button
          type="button"
          className="button revoke wide"
          data-tour="wallet-mc-close"
          disabled={state.running || c1.state !== "active"}
          onClick={() =>
            go("closed", async (world) => (await journey()).closeClaim(onDay(world, DAY.close)))
          }
        >
          {state.running ? "Closing…" : c1.state === "active" ? "Close claim" : "Claim closed"}
        </button>
      ) : null}
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status">
          <strong>Claim closed</strong>
          <p>
            Wrenfield can no longer read the licence or the claim folder. P1 stays: it still keeps
            your motor policy current.
          </p>
        </div>
      ) : null}
      <h2 className="mc-heading">Journey ledger</h2>
      <p className="muted small">
        Counted from the pod's request log, not typed in: every read of your pod and the grant that
        allowed it.
      </p>
      <Totals totals={totals} />
      <div ref={mount} className="mc-ledger" data-tour="mc-journey-ledger" />
      <Nav />
    </Screen>
  );
}
