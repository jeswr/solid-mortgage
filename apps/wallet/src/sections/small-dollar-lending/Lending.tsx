// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn's small-dollar lending screens (flows.md section 4), for Maya: her pod and the credentials
 * the issuers wrote into it, the threshold proofs to two lenders (made on this device), her grants
 * with the withdrawal that ends Finchly's access, and the journey ledger with totals counted from
 * the pod's request log.
 */
import "./lending.css";
import { ORGS } from "@mortgage/content/orgs";
import { PERSON } from "@mortgage/content/small-dollar-lending/facts";
import { isLendingGrantCode, LENDING_GRANTS } from "@mortgage/content/small-dollar-lending/grants";
import { type LendingTotals, lendingTotals } from "@mortgage/content/small-dollar-lending/ledger";
import {
  SMALL_DOLLAR_DRAWERS,
  SMALL_DOLLAR_HOLDER,
  smallDollarLens,
} from "@mortgage/content/small-dollar-lending/mount";
import { TOUR } from "@mortgage/content/small-dollar-lending/tour";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { isOrgSlug, type OrgSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { defineJourneyLedger, type JourneyLedger } from "@mortgage/lens";
import { onEvent, onReset } from "@mortgage/pod-runtime";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Screen } from "../../App.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../../components/ui.tsx";
import { usePodData, useWallet } from "../../runtime.tsx";

const journey = () => import("@mortgage/content/small-dollar-lending/journey");
const prequalification = () => import("@mortgage/content/small-dollar-lending/prequalification");

const BACK = { href: "/lending", label: "Your pod" };

const orgName = (slug: string) => (isOrgSlug(slug) ? ORGS[slug].organisation : slug);

function Nav() {
  const links: [string, string][] = [
    ["/lending", "Your pod"],
    ["/lending/sharing", "Grants"],
    ["/lending/ledger", "Journey ledger"],
  ];
  return (
    <nav aria-label="Small-dollar lending" className="sd-nav">
      {links.map(([href, label]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
      {/* The prove screen is served cross-origin isolated: reach it with a full navigation. */}
      <a href={appUrl("wallet", "lending/prove")}>Prove to lenders</a>
    </nav>
  );
}

/** Step 1 (and every issuer step after it): Maya's pod, its drawers and its credentials. */
export function LendingHome() {
  const vault = usePodData(async (world) => {
    const { openVault, readCredentials } = await journey();
    const view = await openVault(world);
    return { ...view, cards: await readCredentials(world) };
  });
  const data = vault.data;
  return (
    <Screen title="Your pod" page="Your pod">
      {vault.error !== undefined ? <Problem error={vault.error} /> : null}
      {data === undefined && vault.error === undefined ? <Loading what="your pod" /> : null}
      {data !== undefined ? (
        <>
          <p className="muted small">
            {PERSON.name}'s pod. Organisations write into it under a slot you approve; lenders read
            only what you grant.
          </p>
          <section className="card" aria-labelledby="sd-drawers">
            <h2 id="sd-drawers">Drawers</h2>
            <ul className="sd-drawers" data-testid="sd-drawers">
              {SMALL_DOLLAR_DRAWERS.map((drawer) => (
                <li key={drawer.path}>
                  {drawer.label}
                  <span className="muted small">{drawer.path}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card" aria-labelledby="sd-credentials">
            <h2 id="sd-credentials">Credentials</h2>
            {data.cards.length === 0 ? (
              <Empty>None yet. Your credentials drawer is empty.</Empty>
            ) : (
              <ul className="sd-cards" data-testid="sd-credentials">
                {data.cards.map((card) => (
                  <li key={card.path} className="sd-credential">
                    <OrgBadge slug={card.issuer as OrgSlug} />
                    <div>
                      <strong>{orgName(card.issuer)}</strong>
                      {card.lines.map((line) => (
                        <p key={line} className="small">
                          {line}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
      <Nav />
    </Screen>
  );
}

/** Step 6: prove each lender's thresholds, on this device. */
export function LendingProve() {
  const { run, runApart } = useWallet();
  const questions = usePodData(async (world) => {
    const { LENDER_STATEMENTS, PREQUALIFYING_LENDERS, STATEMENT_SOURCES, statementLabel } =
      await prequalification();
    const { statusOf, podUrl } = await import("@mortgage/content/mortgage/world");
    const maya = world.fetchAs(SMALL_DOLLAR_HOLDER.id);
    const rows = [];
    for (const lender of PREQUALIFYING_LENDERS) {
      const statements = [];
      for (const statement of LENDER_STATEMENTS[lender]) {
        const source = STATEMENT_SOURCES[statement.field];
        const ready =
          source !== undefined &&
          (await statusOf(maya, podUrl(world, SMALL_DOLLAR_HOLDER.id, source.anchor))) === 200;
        statements.push({ issuer: source?.issuer, label: statementLabel(statement), ready });
      }
      rows.push({ lender, statements });
    }
    return rows;
  });
  const [state, setState] = useState<"idle" | "proving" | "granting" | "done">("idle");
  const [error, setError] = useState<unknown>();
  const [proved, setProved] = useState<Record<string, boolean>>({});
  const ready =
    questions.data?.every((row) => row.statements.every((statement) => statement.ready)) === true;
  const isolated = globalThis.crossOriginIsolated === true;

  const prove = async () => {
    setState("proving");
    setError(undefined);
    try {
      // The proofs grant nothing, so they run outside the grant queue; A1 is a grant.
      const quotes = await runApart(async (world) => (await journey()).prequalifyWithBoth(world));
      setProved(Object.fromEntries(quotes.map((quote) => [quote.lender, quote.qualified])));
      setState("granting");
      await run(async (world) => (await journey()).authoriseAlderCheck(world));
      setState("done");
    } catch (caught) {
      setError(caught);
      setState("idle");
    }
  };

  return (
    <Screen title="Prove to two lenders" page="Prove to lenders" back={BACK}>
      <p className="lede">
        Finchly and Alder Bank each ask a few questions. Cairn answers each with a proof made on
        this device: a lender learns yes or no and who vouches for it, never the figure.
      </p>
      {questions.error !== undefined ? <Problem error={questions.error} /> : null}
      {questions.data === undefined && questions.error === undefined ? (
        <Loading what="your proof anchors" />
      ) : null}
      {questions.data?.map((row) => (
        <section key={row.lender} className="card" aria-labelledby={`sd-asks-${row.lender}`}>
          <h2 id={`sd-asks-${row.lender}`}>
            <OrgBadge slug={row.lender} /> {orgName(row.lender)} asks
          </h2>
          <ul className="sd-questions">
            {row.statements.map((statement) => (
              <li key={statement.label}>
                <span>{statement.label}?</span>
                <span className="muted small">
                  {statement.ready
                    ? `Anchor signed by ${orgName(statement.issuer ?? "")}`
                    : "No anchor in your pod yet"}
                </span>
              </li>
            ))}
          </ul>
          {proved[row.lender] ? (
            <p className="sd-yes" data-testid={`sd-proved-${row.lender}`}>
              Checked by {ORGS[row.lender].short}: yes to every question. Quote kept in its own pod.
            </p>
          ) : null}
        </section>
      ))}
      {error !== undefined ? <Problem error={error} /> : null}
      <button
        type="button"
        className="button primary wide"
        data-tour="wallet-lending-prove"
        disabled={!ready || state === "proving" || state === "granting"}
        onClick={prove}
      >
        {state === "proving"
          ? "Making proofs on this device…"
          : state === "granting"
            ? "Recording grant A1…"
            : "Prove to two lenders"}
      </button>
      <p className="small muted" role="status">
        {state === "done"
          ? `Done. Two quotes, nothing handed over. Grant A1 lets Quillon answer Alder's credit check: ${LENDING_GRANTS.A1.description.toLowerCase()}.`
          : `This page proves with ${isolated ? "several threads" : "one thread"}.`}
      </p>
      <Nav />
    </Screen>
  );
}

type GrantRow = Awaited<ReturnType<Awaited<ReturnType<typeof journey>>["readGrants"]>>[number];

/** Steps 7 to 12 from Maya's side: every grant, and the withdrawal of Finchly's. */
export function LendingSharing() {
  const { run } = useWallet();
  const grants = usePodData(async (world) => (await journey()).readGrants(world));
  const [state, setState] = useState<{ running: boolean; error?: unknown; done?: boolean }>({
    running: false,
  });
  const rows: GrantRow[] = grants.data ?? [];
  const withdraw = () => {
    setState({ running: true });
    run(async (world) => (await journey()).withdrawFinchly(world)).then(
      () => setState({ done: true, running: false }),
      (error: unknown) => setState({ error, running: false }),
    );
  };
  return (
    <Screen title="Grants" page="Lending grants" back={BACK}>
      {grants.error !== undefined ? <Problem error={grants.error} /> : null}
      {grants.data === undefined && grants.error === undefined ? (
        <Loading what="your grants" />
      ) : null}
      {grants.data !== undefined && rows.length === 0 ? (
        <Empty>No organisation holds a grant yet.</Empty>
      ) : null}
      <ul className="sd-grants">
        {rows.map((row) => {
          const spec = isLendingGrantCode(row.code) ? LENDING_GRANTS[row.code] : undefined;
          const to = spec !== undefined && isOrgSlug(spec.to) ? spec.to : undefined;
          return (
            <li key={row.code} className="card" data-testid={`sd-grant-${row.code.toLowerCase()}`}>
              <div className="sd-grant-head">
                {to === undefined ? null : <OrgBadge slug={to} />}
                <strong>{to === undefined ? row.code : ORGS[to].organisation}</strong>
                <span className="sd-code">{row.code}</span>
                <span className={`sd-state sd-state-${row.state}`}>{row.state}</span>
              </div>
              <p className="small">
                {spec?.description} · {spec?.endLabel}
              </p>
              {row.code === "L1" && row.state === "active" ? (
                <button
                  type="button"
                  className="button revoke"
                  data-tour="wallet-lending-revoke-finchly"
                  disabled={state.running}
                  onClick={withdraw}
                >
                  Withdraw Finchly
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done ? (
        <div className="notice success" role="status">
          <strong>Grant withdrawn</strong>
          <p>
            Finchly Loans can no longer read anything in your pod. The withdrawal is in your consent
            records, and Finchly has been told.
          </p>
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

function Totals({ totals }: { totals: LendingTotals }) {
  const items: [keyof LendingTotals, number, string][] = [
    ["issuers", totals.issuers, "issuers"],
    ["lenders", totals.lenders, "lenders"],
    ["paymentServices", totals.paymentServices, "payment service"],
    ["credentials", totals.credentials, "credentials"],
    ["reads", totals.reads, "reads by organisations"],
    ["denied", totals.denied, totals.denied === 1 ? "refused read" : "refused reads"],
  ];
  return (
    <ul className="sd-totals" aria-label="Totals counted from the log">
      {items.map(([key, value, label]) => (
        <li key={key} data-metric={`small-dollar-lending.${key}`} data-value={value}>
          <strong>{value}</strong> {label}
        </li>
      ))}
    </ul>
  );
}

/** The journey ledger, with totals counted from the same log. */
export function LendingLedger() {
  const entries = useLog();
  const totals = lendingTotals(entries);
  const mount = useRef<HTMLDivElement>(null);
  const ledger = useRef<JourneyLedger | null>(null);
  const pushed = useRef(0);
  useEffect(() => {
    defineJourneyLedger();
    const element = document.createElement("journey-ledger") as JourneyLedger;
    const calendar = createDemoCalendar();
    element.configure(
      {
        ...smallDollarLens(),
        app: "wallet",
        calendar: { dayOf: (d) => calendar.dayOf(d), label: (d) => calendar.label(d) },
        holder: SMALL_DOLLAR_HOLDER,
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
    <Screen title="Journey ledger" page="Lending journey ledger" back={BACK}>
      <p className="muted small">
        Counted from the pod's request log, not typed in: who wrote into your pod, who read it, and
        the grant that allowed each read.
      </p>
      <Totals totals={totals} />
      <div ref={mount} className="sd-ledger" data-tour="sd-journey-ledger" />
      <Nav />
    </Screen>
  );
}
