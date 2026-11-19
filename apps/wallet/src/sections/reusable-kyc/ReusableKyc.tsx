// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn's reusable-KYC screens (flows.md section 8): Alex's verified identity (the statement Alder
 * Bank signed, and who may read it), the consent screen for Pennant's one-time request (Y1), and
 * the journey ledger with totals counted from the log.
 *
 * Approving Y1 registers a one-time grant with the pod runtime before the grant itself: after
 * Pennant's first read the runtime closes it, as Alex's wallet. The wallet then writes the consent
 * record that says so (`recordOneTimeUsed`), whenever it next shows these screens.
 */
import "./reusable-kyc.css";
import type { World } from "@mortgage/content/mortgage/world";
import { remove } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { SCHEME } from "@mortgage/content/reusable-kyc/facts";
import type { OneTimeState } from "@mortgage/content/reusable-kyc/grants";
import { PURPOSE_TEXT, UNTIL_LABEL } from "@mortgage/content/reusable-kyc/grants";
import { type ReusableKycTotals, reusableKycTotals } from "@mortgage/content/reusable-kyc/ledger";
import { REUSABLE_KYC_HOLDER, reusableKycLens } from "@mortgage/content/reusable-kyc/mount";
import { TOUR } from "@mortgage/content/reusable-kyc/tour";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { isAppSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { defineJourneyLedger, type JourneyLedger } from "@mortgage/lens";
import { onEvent, oneTimeGrant, onReset } from "@mortgage/pod-runtime";
import { TourCursor, waitForTarget } from "@mortgage/tour";
import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { Screen } from "../../App.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../../components/ui.tsx";
import { safeReturnUrl } from "../../explain.ts";
import { usePodData, useWallet } from "../../runtime.tsx";

const journey = () => import("@mortgage/content/reusable-kyc/journey");
const grants = () => import("@mortgage/content/reusable-kyc/grants");

const BACK = { href: "/kyc", label: "Verified identity" };
const CARD = ORGS["card-issuer"];
const BANK = ORGS.bank;

const STATE_TEXT: Readonly<Record<OneTimeState, string>> = {
  ended: "Withdrawn.",
  none: "Nobody else can read it.",
  open: "May read it once, within the hour. Your wallet closes it after the first read.",
  used: "One-time grant, closed by your wallet after Pennant's first read.",
};

function Nav() {
  return (
    <nav className="kyc-nav" aria-label="Verified identity">
      <Link href="/kyc">Verified identity</Link>
      <Link href="/kyc/ledger">Journey ledger</Link>
    </nav>
  );
}

interface IdentityView {
  version?: number;
  validUntil?: Date;
  checks: { method: string; date: string; description: string }[];
  sharing: OneTimeState;
}

async function loadIdentity(world: World): Promise<IdentityView> {
  const [{ readAttestation }, { oneTimeState }] = await Promise.all([journey(), grants()]);
  const view = await readAttestation(world);
  const sharing = await oneTimeState(world);
  const credential = view.credential;
  if (credential === undefined) return { checks: [], sharing };
  return {
    checks: credential.credentialSubject.checks
      .map((check) => ({
        date: check.date.toISOString().slice(0, 10),
        description: check.description,
        method: check.method.slice(check.method.lastIndexOf("-") + 1),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    sharing,
    validUntil: credential.validUntil,
    version: view.versions.at(-1),
  };
}

/** After Pennant's read, the wallet writes the consent record that says the grant was used up. */
function useRecordUsed(sharing: OneTimeState | undefined) {
  const { run } = useWallet();
  const done = useRef(false);
  useEffect(() => {
    if (sharing !== "used" || done.current) return;
    done.current = true;
    run(async (world) => (await journey()).closeUsedGrant(world)).catch((error: unknown) =>
      console.warn("recording the used grant failed", error),
    );
  }, [sharing, run]);
}

const METHOD: Readonly<Record<string, string>> = {
  Documentary: "Documentary",
  GovernmentList: "Government lists",
  NonDocumentary: "Non-documentary",
};

/** The statement Alex holds, and who may read it. */
export function KycHome() {
  const { data, error } = usePodData(loadIdentity);
  useRecordUsed(data?.sharing);
  return (
    <Screen title="Verified identity" page="Verified identity">
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? <Loading what="your verified identity" /> : null}
      {data !== undefined && data.version === undefined ? (
        <Empty>
          No statement yet. {BANK.organisation} signs one under Your identity, and it lands here.
        </Empty>
      ) : null}
      {data?.version !== undefined ? (
        <section className="card" aria-labelledby="kyc-statement">
          <div className="card-head">
            <OrgBadge slug="bank" />
            <div>
              <h2 id="kyc-statement">KYC attestation</h2>
              <p className="muted small">
                Signed by {BANK.organisation} · version {data.version}
                {data.validUntil === undefined
                  ? ""
                  : ` · valid until ${data.validUntil.toISOString().slice(0, 10)}`}
              </p>
            </div>
          </div>
          <ul className="kyc-checks" data-testid="wallet-kyc-checks">
            {data.checks.map((check) => (
              <li key={`${check.method}-${check.date}`}>
                <strong>{METHOD[check.method] ?? check.method}</strong>, {check.date}:{" "}
                {check.description}
              </li>
            ))}
          </ul>
          <p className="small muted">
            What the bank verified and how. No images of your documents.
          </p>
        </section>
      ) : null}
      {data !== undefined ? (
        <section className="card" aria-labelledby="kyc-sharing">
          <h2 id="kyc-sharing">Who can read it</h2>
          <div className="card-head">
            <OrgBadge slug="card-issuer" />
            <div>
              <p>
                <strong>{CARD.organisation}</strong> · Y1
              </p>
              <p className="small" data-testid="wallet-kyc-sharing" data-state={data.sharing}>
                {data.sharing === "none" ? "No grant." : STATE_TEXT[data.sharing]}
              </p>
            </div>
          </div>
        </section>
      ) : null}
      <Nav />
    </Screen>
  );
}

interface ConsentView {
  reason?: string;
  sharing: OneTimeState;
  hasStatement: boolean;
}

/** Pennant's request (Y1): one record, read once, within an hour. */
export function KycConsent() {
  const search = new URLSearchParams(useSearch());
  const requestUrl = search.get("request");
  const auto = search.get("auto") === "1";
  const returnTo = safeReturnUrl(search.get("return"), window.location, isAppSlug);
  const { run } = useWallet();
  const { data, error } = usePodData<ConsentView | undefined>(
    async (world) => {
      if (requestUrl === null) return undefined;
      const [{ readOneTimeRequest, oneTimeState }, { readAttestation }] = await Promise.all([
        grants(),
        journey(),
      ]);
      const { reason } = await readOneTimeRequest(world, requestUrl);
      const sharing = await oneTimeState(world);
      const hasStatement = (await readAttestation(world)).credential !== undefined;
      return { hasStatement, sharing, ...(reason === undefined ? {} : { reason }) };
    },
    [requestUrl],
  );
  const [busy, setBusy] = useState<"approve" | "decline">();
  const [failure, setFailure] = useState<unknown>();
  const [answered, setAnswered] = useState<"approved" | "declined">();

  const answer = async (kind: "approve" | "decline") => {
    if (requestUrl === null) return;
    setBusy(kind);
    setFailure(undefined);
    try {
      if (kind === "approve") {
        await run(async (world) =>
          (await journey()).approveOneTimeRead(world, requestUrl, oneTimeGrant),
        );
      } else {
        await run((world) => remove(world.fetchAs(world.holder), requestUrl));
      }
      setAnswered(kind === "approve" ? "approved" : "declined");
      if (returnTo !== undefined) window.location.assign(returnTo);
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(undefined);
    }
  };

  const approvable =
    data !== undefined &&
    data.reason === undefined &&
    data.hasStatement &&
    data.sharing !== "open" &&
    answered === undefined;

  // Handed over by the tour (or presenting): the tour's cursor presses Approve, once.
  const pressed = useRef(false);
  useEffect(() => {
    if (!auto || !approvable || pressed.current) return;
    pressed.current = true;
    void waitForTarget("wallet-kyc-approve", { timeoutMs: 20_000 })
      .then((button) => new TourCursor().clickElement(button))
      .catch(() => undefined);
  }, [auto, approvable]);

  return (
    <Screen title="Requests" page="One-time request" back={BACK}>
      {requestUrl === null ? <Empty>No request to answer.</Empty> : null}
      {error !== undefined ? <Problem error={error} /> : null}
      {requestUrl !== null && data === undefined && error === undefined ? (
        <Loading what="the request" />
      ) : null}
      {data !== undefined ? (
        <article className="card consent" aria-labelledby="kyc-request">
          <div className="card-head">
            <OrgBadge slug="card-issuer" />
            <div>
              <h2 id="kyc-request">{CARD.organisation}</h2>
              <p className="muted">asks to check your identity · Y1</p>
            </div>
          </div>
          <dl className="consent-facts">
            <div>
              <dt>What</dt>
              <dd>Read your KYC attestation from {BANK.organisation}. Nothing else in your pod.</dd>
            </div>
            <div>
              <dt>Why</dt>
              <dd>{PURPOSE_TEXT}.</dd>
            </div>
            <div>
              <dt>Until</dt>
              <dd>{UNTIL_LABEL}. Your wallet closes it after the first read.</dd>
            </div>
            <div>
              <dt>Relies on</dt>
              <dd>
                {CARD.short} checks that {BANK.organisation} is on the {SCHEME.name} list of issuers
                it has an agreement with.
              </dd>
            </div>
          </dl>
          {data.reason !== undefined ? (
            <p role="alert" className="notice problem" data-testid="wallet-kyc-unsafe">
              Cairn will not approve this request: it is {data.reason}.
            </p>
          ) : !data.hasStatement ? (
            <p role="alert" className="notice problem">
              There is no statement in your pod to share yet. Ask {BANK.organisation} for one under
              Your identity.
            </p>
          ) : data.sharing === "open" && answered === undefined ? (
            <p className="notice success" role="status">
              Already approved: {CARD.short} may read it once.
            </p>
          ) : null}
          {failure !== undefined ? <Problem error={failure} /> : null}
          {answered !== undefined ? (
            <div className="notice success" role="status">
              <strong>{answered === "approved" ? "Shared once" : "Declined"}</strong>
              <p>
                {answered === "approved"
                  ? `${CARD.short} may read your statement once, within the hour. The consent record is in Activity.`
                  : `Nothing was shared with ${CARD.short}.`}
                {returnTo === undefined ? null : " Taking you back…"}
              </p>
            </div>
          ) : (
            <div className="actions">
              <button
                type="button"
                className="button ghost"
                disabled={busy !== undefined || data.reason !== undefined}
                onClick={() => void answer("decline")}
              >
                {busy === "decline" ? "Declining…" : "Decline"}
              </button>
              <button
                type="button"
                className="button primary"
                data-tour="wallet-kyc-approve"
                disabled={busy !== undefined || !approvable}
                onClick={() => void answer("approve")}
              >
                {busy === "approve" ? "Approving…" : "Approve once"}
              </button>
            </div>
          )}
          {returnTo !== undefined && answered === undefined ? (
            <p className="small">
              <a href={returnTo}>Back to {CARD.organisation}</a>
            </p>
          ) : null}
        </article>
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

function Totals({ totals }: { totals: ReusableKycTotals }) {
  const items: [keyof ReusableKycTotals, string][] = [
    ["checks", totals.checks === 1 ? "set of checks" : "sets of checks"],
    ["institutions", "institutions"],
    ["reads", totals.reads === 1 ? "read of your statement" : "reads of your statement"],
    ["denied", totals.denied === 1 ? "refused read" : "refused reads"],
    ["accessWithdrawn", "access closed by your wallet"],
    ["statementsWithdrawn", "statement withdrawn by the bank"],
    ["withdrawals", "withdrawals in all"],
  ];
  return (
    <ul className="kyc-totals" aria-label="Totals counted from the log">
      {items.map(([key, label]) => (
        <li key={key} data-metric={`reusable-kyc.${key}`} data-value={totals[key]}>
          <strong>{totals[key]}</strong> {label}
        </li>
      ))}
    </ul>
  );
}

/** Step 7: the journey ledger, with totals counted from the same log. */
export function KycLedger() {
  const entries = useLog();
  const totals = reusableKycTotals(entries);
  const sharing = usePodData(async (world) => (await grants()).oneTimeState(world));
  useRecordUsed(sharing.data);
  const mount = useRef<HTMLDivElement>(null);
  const ledger = useRef<JourneyLedger | null>(null);
  const pushed = useRef(0);
  useEffect(() => {
    defineJourneyLedger();
    const element = document.createElement("journey-ledger") as JourneyLedger;
    const calendar = createDemoCalendar();
    element.configure(
      {
        ...reusableKycLens(),
        app: "wallet",
        calendar: { dayOf: (d) => calendar.dayOf(d), label: (d) => calendar.label(d) },
        holder: REUSABLE_KYC_HOLDER,
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
    <Screen title="Journey ledger" page="Journey ledger" back={BACK}>
      <p className="muted small">
        Counted from the pod's request log, not typed in: each read of your statement, the refused
        one, and both kinds of withdrawal.
      </p>
      <Totals totals={totals} />
      <div ref={mount} className="kyc-ledger" data-tour="kyc-journey-ledger" />
      <p className="small">
        <a href={appUrl("card-issuer", "apply")}>Back to {CARD.organisation}</a>
      </p>
      <Nav />
    </Screen>
  );
}
