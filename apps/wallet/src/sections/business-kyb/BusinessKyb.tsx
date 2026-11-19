// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn's business KYB screens (flows.md section 3): Northwind Logistics' credentials drawer,
 * the two banks' requests (K1, K2), the in-browser ownership proof for Brackenridge, the grants
 * with the closing withdrawal, and the journey ledger with its examiner view. Jordan Blake, the
 * managing member, operates Northwind's pod in the wallet.
 */
import "./business-kyb.css";
import { DAY, ENTITY, percent } from "@mortgage/content/business-kyb/facts";
import { KYB_GRANTS, type KybGrantCode } from "@mortgage/content/business-kyb/grants";
import {
  BUSINESS_KYB_HOLDER,
  businessKybLens,
  KYB_COMPLIANCE,
} from "@mortgage/content/business-kyb/mount";
import type { KybPresentation, PreDecision } from "@mortgage/content/business-kyb/proof";
import { TOUR } from "@mortgage/content/business-kyb/tour";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ComplianceItem, defineJourneyLedger, type JourneyLedger } from "@mortgage/lens";
import { onEvent, onReset } from "@mortgage/pod-runtime";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Screen } from "../../App.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../../components/ui.tsx";
import { usePodData, useWallet, type WalletWorld } from "../../runtime.tsx";

const journey = () => import("@mortgage/content/business-kyb/journey");

const BACK = { href: "/kyb", label: "Northwind" };

/** One write of a kind at a time from this page (a request or a challenge is made once). */
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
    ["/kyb", "Credentials"],
    ["/kyb/requests", "Requests"],
    ["/kyb/sharing", "Grants"],
    ["/kyb/ledger", "Journey ledger"],
  ];
  return (
    <nav aria-label="Business onboarding" className="kyb-nav">
      {links.map(([href, label]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
      {/* The proving page is cross-origin isolated: reach it with a full navigation. */}
      <a href={appUrl("wallet", "prove/kyb")}>Prove ownership</a>
    </nav>
  );
}

const SHARED = "Organisational identity, officer authorisation, beneficial ownership";

// --- Step 1: the credentials drawer -------------------------------------------------------------

/** Step 1: Northwind's credentials drawer (`kyb`). */
export function KybHome() {
  const { data, error } = usePodData(async (world) => (await journey()).openVault(world));
  const empty =
    data !== undefined &&
    data.identity === undefined &&
    data.officers === undefined &&
    data.ownership === undefined;
  return (
    <Screen title="Northwind" page="Northwind Logistics">
      <p className="muted small">
        {ENTITY.legalName}'s pod, operated by Jordan Blake, managing member. The register signs
        credentials into it; banks read them under a grant.
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? (
        <Loading what="Northwind's credentials" />
      ) : null}
      {empty ? (
        <Empty>
          The credentials drawer is empty. Halyard LEI Services, the register, issues them.
        </Empty>
      ) : null}
      {data?.identity !== undefined ? (
        <section className="card" aria-labelledby="kyb-identity" data-testid="kyb-held-identity">
          <h2 id="kyb-identity">Organisational identity</h2>
          <dl className="fields">
            <div className="field">
              <dt>Legal name</dt>
              <dd>{data.identity.credentialSubject.legalName}</dd>
            </div>
            <div className="field">
              <dt>LEI</dt>
              <dd className="kyb-mono">
                {data.identity.credentialSubject.lei.text}
                {data.identity.credentialSubject.lei.illustrative ? " (illustrative)" : ""}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
      {data?.officers !== undefined ? (
        <section className="card" aria-labelledby="kyb-officers" data-testid="kyb-held-officers">
          <h2 id="kyb-officers">Officer authorisation</h2>
          <ul className="kyb-plain">
            {data.officers.credentialSubject.officers.map((officer) => (
              <li key={officer.personName}>
                {officer.personName}, {officer.jobTitle}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data?.ownership !== undefined ? (
        <section className="card" aria-labelledby="kyb-ownership" data-testid="kyb-held-ownership">
          <h2 id="kyb-ownership">Beneficial ownership</h2>
          <table className="kyb-table">
            <caption className="muted small">Signed by the register, in basis points</caption>
            <thead>
              <tr>
                <th scope="col">Owner</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {data.ownership.credentialSubject.ownerships.map((ownership) => (
                <tr key={ownership.owner.personName}>
                  <th scope="row">{ownership.owner.personName}</th>
                  <td>{percent(ownership.bps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      <Nav />
    </Screen>
  );
}

// --- Steps 5 and 8: the requests ---------------------------------------------------------------

interface RequestsView {
  pending: { code: KybGrantCode; url: string }[];
  decided: { code: KybGrantCode; state: string }[];
}

async function loadRequests(world: WalletWorld): Promise<RequestsView> {
  const { ensureRequest, grantRows } = await journey();
  const { pendingRequest } = await import("@mortgage/content/business-kyb/grants");
  const rows = await grantRows(world);
  // Alder Bank asks as soon as Northwind applies for an account: its request is in the inbox.
  if (rows.find((row) => row.code === "K1")?.record === undefined) {
    await single("request-k1", () => ensureRequest(world, "K1"));
  }
  const pending: RequestsView["pending"] = [];
  for (const code of ["K1", "K2"] as const) {
    const url = await pendingRequest(world, code);
    if (url !== undefined) pending.push({ code, url });
  }
  const decided = rows.flatMap((row) =>
    row.record === undefined ? [] : [{ code: row.code, state: row.record.state }],
  );
  return { decided, pending };
}

/** Steps 5 and 8: the banks' requests (`kyb/requests`). */
export function KybRequests() {
  const { data, error } = usePodData(loadRequests);
  const { go, state } = useRun<KybGrantCode>();
  return (
    <Screen title="Requests" page="Requests to read Northwind's credentials" back={BACK}>
      <p className="muted small">
        A bank asks; Jordan approves for Northwind. A grant lets one bank read three credentials,
        for one purpose, until a date. Nothing is uploaded.
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? <Loading what="Northwind's inbox" /> : null}
      {data !== undefined && data.pending.length === 0 ? (
        <Empty>No request is waiting.</Empty>
      ) : null}
      <ul className="kyb-list">
        {data?.pending.map(({ code }) => {
          const spec = KYB_GRANTS[code];
          return (
            <li key={code} className="card" data-testid={`kyb-request-${code.toLowerCase()}`}>
              <div className="card-head">
                <OrgBadge slug={spec.to} />
                <div>
                  <p>
                    <strong>{ORGS[spec.to].organisation}</strong>
                  </p>
                  <p className="muted small">{spec.name}</p>
                </div>
                <span className="kyb-code">{code}</span>
              </div>
              <dl className="fields">
                <div className="field">
                  <dt>Reads</dt>
                  <dd>{SHARED}</dd>
                </div>
                <div className="field">
                  <dt>Purpose</dt>
                  <dd>{spec.purposeText}</dd>
                </div>
                <div className="field">
                  <dt>For</dt>
                  <dd>{spec.untilLabel}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="button primary wide"
                data-tour={`wallet-kyb-approve-${code.toLowerCase()}`}
                disabled={state.running}
                onClick={() =>
                  go(async (world) => {
                    const steps = await journey();
                    if (code === "K1") await steps.approveOnboarding(world);
                    else await steps.approveCredit(world);
                    return code;
                  })
                }
              >
                {state.running ? "Approving…" : "Approve"}
              </button>
            </li>
          );
        })}
      </ul>
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status">
          <strong>Grant {state.done} given</strong>
          <p>
            {ORGS[KYB_GRANTS[state.done].to].organisation} may read the three credentials. The
            consent record is in Northwind's pod.
            {state.done === "K2"
              ? " Brackenridge's credit desk has read them for its deal sheet."
              : ""}
          </p>
        </div>
      ) : null}
      {data !== undefined && data.decided.length > 0 ? (
        <p className="muted small">
          Decided: {data.decided.map((row) => `${row.code} (${row.state})`).join(", ")}.{" "}
          <Link href="/kyb/sharing">See the grants</Link>
        </p>
      ) : null}
      <Nav />
    </Screen>
  );
}

// --- Step 7: the proof -------------------------------------------------------------------------

interface ProveView {
  challenge?: { threshold: number };
  answered: boolean;
}

async function loadProve(world: WalletWorld): Promise<ProveView> {
  const { ensureChallenge, grantRows } = await journey();
  const { pendingRequest } = await import("@mortgage/content/business-kyb/grants");
  // Once Brackenridge has asked for K2 (or holds it), the proof has been answered.
  const k2 = (await grantRows(world)).find((row) => row.code === "K2")?.record;
  if (k2 !== undefined || (await pendingRequest(world, "K2")) !== undefined) {
    return { answered: true };
  }
  const challenge = await single("challenge", () => ensureChallenge(world));
  return { answered: false, ...(challenge === undefined ? {} : { challenge }) };
}

const STAGE_WORDS: Record<string, string> = {
  completeness: "Proving: no undisclosed owner at 25% or more",
};

/** Step 7: prove to Brackenridge (`prove/kyb`, a cross-origin isolated page). */
export function KybProve() {
  const { runApart } = useWallet();
  const view = usePodData(loadProve);
  const [stage, setStage] = useState<string>();
  const [result, setResult] = useState<{
    decision: PreDecision;
    presentation: KybPresentation;
  }>();
  const [error, setError] = useState<unknown>();
  const [proving, setProving] = useState(false);
  const isolated = globalThis.crossOriginIsolated === true;

  // Load the prover while the visitor reads, so the time shown is proving, not downloading.
  useEffect(() => {
    void import("@mortgage/vc-kit").then((kit) => kit.prewarmCompleteness()).catch(() => undefined);
  }, []);

  const prove = async () => {
    setProving(true);
    setError(undefined);
    try {
      // A proof grants nothing, so it runs outside the grant queue (runtime.tsx).
      const outcome = await runApart(async (world) =>
        (await journey()).proveOwnership(world, (next) => setStage(next)),
      );
      setResult(outcome);
    } catch (caught) {
      setError(caught);
    } finally {
      setProving(false);
      setStage(undefined);
    }
  };

  const seconds = (ms: number) => (ms / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 });
  return (
    <Screen title="Prove ownership" page="Prove ownership to Brackenridge" back={BACK}>
      <p className="lede">
        Brackenridge Bank asks one question before anything is shared: does any owner hold 25% or
        more that Northwind has not named? Cairn answers with proofs made on this device.
      </p>
      <section className="card" aria-labelledby="kyb-question">
        <h2 id="kyb-question">The question</h2>
        {view.error !== undefined ? <Problem error={view.error} /> : null}
        {view.data === undefined && view.error === undefined ? (
          <Loading what="Brackenridge's challenge" />
        ) : null}
        <p>
          No undisclosed owner holds 25% or more. Northwind names the owners who do; the others'
          names and every share stay on this device.
        </p>
        <p className="muted small">
          Proved against the anchors Halyard LEI Services signed into Northwind's pod with the
          ownership credential.
        </p>
        {view.data?.answered === true && result === undefined ? (
          <p className="notice success" role="status">
            Already answered: Brackenridge has the proofs and has asked for its grant.
          </p>
        ) : null}
        {error !== undefined ? <Problem error={error} /> : null}
        <button
          type="button"
          className="button primary wide"
          data-tour="wallet-kyb-prove"
          disabled={view.data?.challenge === undefined || proving || result !== undefined}
          onClick={prove}
        >
          {proving ? "Making proofs on this device…" : "Prove"}
        </button>
        <p className="small muted" role="status" data-testid="kyb-prove-status">
          {proving
            ? `${stage === undefined ? "Loading the prover" : (STAGE_WORDS[stage] ?? `Proving: ${stage.replace("share:", "")} holds at least 25%`)}. ${isolated ? "Several threads." : "One thread."}`
            : isolated
              ? "This page can prove with several threads."
              : "This page proves with one thread."}
        </p>
      </section>
      {result !== undefined ? (
        <section className="card" aria-labelledby="kyb-proved">
          <h2 id="kyb-proved">Proved live</h2>
          <p data-testid="kyb-proved-live" data-ms={result.presentation.provedMs}>
            Proved live in this browser in {seconds(result.presentation.provedMs)} s, with{" "}
            {result.presentation.threads} {result.presentation.threads === 1 ? "thread" : "threads"}
            : {1 + result.presentation.shares.length} proofs.
          </p>
          <p data-testid="kyb-pre-decision">
            {result.decision.passed
              ? `Brackenridge verified every proof against Halyard's anchors. It learned the names ${result.decision.disclosed.join(" and ")}, and that no one else holds 25% or more. Not a single share.`
              : `Brackenridge could not verify the proofs: ${result.decision.errors.join("; ")}`}
          </p>
          <p>
            <Link href="/kyb/requests">Brackenridge's request</Link>
          </p>
        </section>
      ) : null}
      <p className="small muted">
        The proofs go to Brackenridge's inbox. No access to Northwind's pod is granted by proving.
      </p>
      <Nav />
    </Screen>
  );
}

// --- Step 11: the grants -----------------------------------------------------------------------

/** Step 11: Northwind's grants; closing the Alder account withdraws K1 (`kyb/sharing`). */
export function KybSharing() {
  const grants = usePodData(async (world) => (await journey()).grantRows(world));
  const { go, state } = useRun<{ code: KybGrantCode; status?: number }>();
  const shown = grants.data?.filter((row) => row.record !== undefined) ?? [];
  return (
    <Screen title="Grants" page="Northwind's grants" back={BACK}>
      {grants.error !== undefined ? <Problem error={grants.error} /> : null}
      {grants.data === undefined && grants.error === undefined ? (
        <Loading what="Northwind's grants" />
      ) : null}
      {grants.data !== undefined && shown.length === 0 ? (
        <Empty>No bank can read Northwind's credentials yet.</Empty>
      ) : null}
      <ul className="kyb-list">
        {shown.map(({ code, record, spec }) => (
          <li key={code} className="card" data-testid={`kyb-grant-${code.toLowerCase()}`}>
            <div className="card-head">
              <OrgBadge slug={spec.to} />
              <div>
                <p>
                  <strong>{ORGS[spec.to].organisation}</strong>
                </p>
                <p className="muted small">
                  {spec.purposeText} · {record?.state === "active" ? spec.untilLabel : "Withdrawn"}
                </p>
              </div>
              <span className="kyb-code">{code}</span>
            </div>
            {record?.state === "active" ? (
              <button
                type="button"
                className="button revoke"
                data-tour={code === "K1" ? "wallet-kyb-close-alder" : undefined}
                disabled={state.running}
                onClick={() =>
                  go(async (world) => {
                    const steps = await journey();
                    if (code === "K1") {
                      const { reread } = await steps.closeAccount(world);
                      return { code, status: reread.status };
                    }
                    const { withdrawKybGrant } = await import(
                      "@mortgage/content/business-kyb/grants"
                    );
                    await withdrawKybGrant({ ...world, day: DAY.sale }, code, "16:10");
                    return { code };
                  })
                }
              >
                {code === "K1" ? "Close account and withdraw" : `Withdraw ${ORGS[spec.to].short}`}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status" data-testid="kyb-withdrawn">
          <strong>Grant {state.done.code} withdrawn</strong>
          <p>
            {ORGS[KYB_GRANTS[state.done.code].to].organisation} can no longer read Northwind's
            credentials. The withdrawal is in Northwind's consent records.
            {state.done.status !== undefined
              ? ` Alder Bank's next monitoring read: refused by the pod (${state.done.status}).`
              : ""}
          </p>
        </div>
      ) : null}
      <Nav />
    </Screen>
  );
}

// --- Step 12: the journey ledger and the examiner view -----------------------------------------

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

/** Step 12: the journey ledger, opening on the examiner view (`kyb/ledger`). */
export function KybLedger() {
  const entries = useLog();
  const mount = useRef<HTMLDivElement>(null);
  const ledger = useRef<JourneyLedger | null>(null);
  const pushed = useRef(0);
  useEffect(() => {
    defineJourneyLedger();
    const element = document.createElement("journey-ledger") as JourneyLedger;
    const calendar = createDemoCalendar();
    element.configure(
      {
        ...businessKybLens(),
        app: "wallet",
        calendar: { dayOf: (d) => calendar.dayOf(d), label: (d) => calendar.label(d) },
        holder: BUSINESS_KYB_HOLDER,
        registry: ORGS,
      },
      {
        compliance: KYB_COMPLIANCE.map((item) => ({ ...item }) as ComplianceItem),
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
        From the pods' request log, not typed in: every read of Northwind's credentials, the grant
        that allowed it, and each due diligence obligation beside the entries that meet it.
      </p>
      <div ref={mount} className="kyb-ledger" data-tour="kyb-journey-ledger" />
      <Nav />
    </Screen>
  );
}
