// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn's moving-house screens (flows.md section 2): Alex's one address record and its data
 * product description, changing it once, choosing who should know (the standing grants H1 to H6),
 * who has read it, withdrawing a grant, and the journey ledger with totals counted from the log.
 */
import "./moving-house.css";
import type { AddressRecord, DataProduct } from "@mortgage/content/moving-house/address";
import {
  type AddressValue,
  fullAddress,
  NEW_ADDRESS,
  NEW_ADDRESS_AS_SAVED,
  OLD_ADDRESS,
  samePremises,
  streetLine,
} from "@mortgage/content/moving-house/facts";
import {
  codeOf,
  HOLDER_GRANTS,
  HOLDERS,
  type Holder,
  holderGrants,
  PURPOSE_TEXT,
  UNTIL_LABEL,
} from "@mortgage/content/moving-house/grants";
import { type MovingHouseTotals, movingHouseTotals } from "@mortgage/content/moving-house/ledger";
import { MOVING_HOUSE_HOLDER, movingHouseLens } from "@mortgage/content/moving-house/mount";
import { TOUR } from "@mortgage/content/moving-house/tour";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { defineJourneyLedger, type JourneyLedger } from "@mortgage/lens";
import { onEvent, onReset } from "@mortgage/pod-runtime";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Screen } from "../../App.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../../components/ui.tsx";
import { usePodData, useWallet } from "../../runtime.tsx";

const journey = () => import("@mortgage/content/moving-house/journey");

const BACK = { href: "/moving", label: "Your address" };

function useAddress() {
  return usePodData(async (world) => (await journey()).openAddress(world));
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

function AddressLines({ address }: { address: AddressValue }) {
  return (
    <address className="mh-address">
      {streetLine(address)}
      <br />
      {address.locality}, {address.region} {address.postalCode}
    </address>
  );
}

function Nav() {
  const links: [string, string][] = [
    ["/moving/address", "Change address"],
    ["/moving/who", "Who should know"],
    ["/moving/readers", "Who has read it"],
    ["/moving/sharing", "Standing grants"],
    ["/moving/ledger", "Journey ledger"],
  ];
  return (
    <nav aria-label="Moving house" className="mh-nav">
      {links.map(([href, label]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

function ProductCard({ product }: { product: DataProduct }) {
  const consumers = [...product.policies].sort();
  return (
    <section className="card" aria-labelledby="mh-product">
      <h2 id="mh-product">Described as a data product</h2>
      <dl className="fields">
        <div className="field">
          <dt>Owner</dt>
          <dd>{MOVING_HOUSE_HOLDER.name}</dd>
        </div>
        <div className="field">
          <dt>Purpose</dt>
          <dd>{product.purpose}</dd>
        </div>
        <div className="field">
          <dt>Consumers</dt>
          <dd data-testid="mh-consumers">
            {consumers.length === 0
              ? "None yet"
              : `${consumers.length}: ${consumers
                  .map((policy) => policy.split("/").pop()?.toUpperCase())
                  .join(", ")}`}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function RecordCard({ record }: { record: AddressRecord }) {
  const evidence = [...record.derivedFrom];
  return (
    <section className="card" aria-labelledby="mh-record">
      <h2 id="mh-record">Your address</h2>
      <AddressLines address={record.address} />
      <dl className="fields">
        <div className="field">
          <dt>Effective</dt>
          <dd>{record.validFrom}</dd>
        </div>
        <div className="field">
          <dt>Evidence</dt>
          <dd>
            {evidence.length === 0 ? "None linked" : "Recording receipt from closing (the deed)"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** Step 1: "Your address". */
export function MovingHome() {
  const { data, error } = useAddress();
  return (
    <Screen title="Your address" page="Your address">
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? <Loading what="your address" /> : null}
      {data !== undefined ? (
        <>
          <p className="muted small">
            One record in your pod. Organisations read it under a grant you give; none keeps its own
            form.
          </p>
          <RecordCard record={data.record} />
          <ProductCard product={data.product} />
        </>
      ) : null}
      <Nav />
    </Screen>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  name: keyof AddressValue;
  value: string;
  onChange: (name: keyof AddressValue, value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="mh-input">
      <span>{label}</span>
      <input
        name={name}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </label>
  );
}

/** Steps 2 and 9: change the address once; later, correct the unit. */
export function MovingAddress() {
  const { data, error } = useAddress();
  const { go, state } = useRun();
  const [form, setForm] = useState<AddressValue>(NEW_ADDRESS_AS_SAVED);
  const set = (name: keyof AddressValue, value: string) =>
    setForm((previous) => {
      const next = { ...previous, [name]: value };
      if (name === "unit" && value.trim() === "") delete (next as { unit?: string }).unit;
      return next;
    });
  const current = data?.record.address;
  const moved = current !== undefined && samePremises(current, NEW_ADDRESS);
  const correctable = moved && current?.unit !== undefined;
  const save = (event: FormEvent) => {
    event.preventDefault();
    go("saved", async (world) => (await journey()).saveNewAddress(world, form));
  };
  return (
    <Screen title="Change address" page="Change address" back={BACK}>
      {error !== undefined ? <Problem error={error} /> : null}
      {data === undefined && error === undefined ? <Loading what="your address" /> : null}
      {current !== undefined && !moved ? (
        <form className="card" onSubmit={save} aria-labelledby="mh-change">
          <h2 id="mh-change">New address</h2>
          <p className="muted small">Was: {fullAddress(OLD_ADDRESS)}</p>
          <div className="mh-form">
            <Input label="Number" name="number" value={form.number} onChange={set} />
            <Input
              label="Street"
              name="street"
              value={form.street}
              onChange={set}
              autoComplete="address-line1"
            />
            <Input label="Unit" name="unit" value={form.unit ?? ""} onChange={set} />
            <Input label="Town" name="locality" value={form.locality} onChange={set} />
            <Input label="State" name="region" value={form.region} onChange={set} />
            <Input
              label="ZIP"
              name="postalCode"
              value={form.postalCode}
              onChange={set}
              autoComplete="postal-code"
            />
          </div>
          <p className="small">
            Effective today. Proof of address: the recording receipt from closing, already in your
            pod.
          </p>
          <button
            type="submit"
            className="button primary wide"
            data-tour="wallet-mh-save-address"
            disabled={state.running}
          >
            {state.running ? "Saving…" : "Save address"}
          </button>
        </form>
      ) : null}
      {data !== undefined && moved ? <RecordCard record={data.record} /> : null}
      {correctable ? (
        <section className="card" aria-labelledby="mh-correct">
          <h2 id="mh-correct">Correct the unit</h2>
          <p>
            14 Larch Lane is a house: the unit “{current?.unit}” came from the old flat. The
            corrected address is {fullAddress(NEW_ADDRESS)}.
          </p>
          <button
            type="button"
            className="button primary wide"
            data-tour="wallet-mh-correct-unit"
            disabled={state.running}
            onClick={() => go("corrected", async (world) => (await journey()).correctUnit(world))}
          >
            {state.running ? "Saving…" : "Save correction"}
          </button>
        </section>
      ) : null}
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status">
          <strong>{state.done === "saved" ? "Address saved" : "Correction saved"}</strong>
          <p>One write to your pod. Organisations with a standing grant are told it changed.</p>
        </div>
      ) : null}
      <Nav />
    </Screen>
  );
}

interface GrantRow {
  holder: Holder;
  state: "active" | "expired" | "revoked" | "none";
}

async function loadGrants(world: Parameters<Parameters<typeof usePodData>[0]>[0]) {
  const records = await holderGrants(world);
  return HOLDERS.map<GrantRow>((holder) => {
    const record = records.find((r) => r.code === codeOf(holder));
    return { holder, state: record?.state ?? "none" };
  });
}

function HolderLine({ holder, children }: { holder: Holder; children?: ReactNode }) {
  const record = ORGS[holder];
  return (
    <div className="card-head">
      <OrgBadge slug={holder} />
      <div>
        <p>
          <strong>{record.organisation}</strong>
        </p>
        <p className="muted small">{HOLDER_GRANTS[codeOf(holder)].use}</p>
      </div>
      {children}
    </div>
  );
}

/** Step 3: who should know. */
export function MovingWho() {
  const grants = usePodData(loadGrants);
  const { go, state } = useRun();
  const [chosen, setChosen] = useState<Set<Holder>>(new Set(HOLDERS));
  const pending = grants.data?.filter((row) => row.state !== "active") ?? [];
  const toggle = (holder: Holder) =>
    setChosen((previous) => {
      const next = new Set(previous);
      if (next.has(holder)) next.delete(holder);
      else next.add(holder);
      return next;
    });
  const selected = HOLDERS.filter(
    (holder) => chosen.has(holder) && pending.some((row) => row.holder === holder),
  );
  return (
    <Screen title="Who should know" page="Who should know" back={BACK}>
      <p className="muted small">
        Each organisation you tick may read your address, for one purpose: “{PURPOSE_TEXT}”, until
        you withdraw it. They read the record in your pod; nothing is sent as a form.
      </p>
      {grants.error !== undefined ? <Problem error={grants.error} /> : null}
      {grants.data === undefined && grants.error === undefined ? (
        <Loading what="your grants" />
      ) : null}
      {grants.data !== undefined ? (
        <fieldset className="card mh-choose">
          <legend>Organisations</legend>
          {grants.data.map((row) => (
            <label key={row.holder} className="mh-choice">
              <input
                type="checkbox"
                checked={row.state === "active" || chosen.has(row.holder)}
                disabled={row.state === "active" || state.running}
                onChange={() => toggle(row.holder)}
              />
              <HolderLine holder={row.holder}>
                <span className="mh-code">{codeOf(row.holder)}</span>
              </HolderLine>
              {row.state === "active" ? <span className="mh-state">Can read</span> : null}
            </label>
          ))}
          <button
            type="button"
            className="button primary wide"
            data-tour="wallet-mh-approve"
            disabled={selected.length === 0 || state.running}
            onClick={() =>
              go("approved", async (world) =>
                (await journey()).approveWhoShouldKnow(world, selected),
              )
            }
          >
            {state.running ? "Approving…" : "Approve"}
          </button>
        </fieldset>
      ) : null}
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status">
          <strong>Standing grants given</strong>
          <p>Each organisation was told in its inbox. Ends: {UNTIL_LABEL.toLowerCase()}.</p>
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

function Totals({ totals }: { totals: MovingHouseTotals }) {
  const items: [string, number, string][] = [
    ["records", totals.records, totals.records === 1 ? "record" : "records"],
    ["organisations", totals.organisations, "organisations"],
    ["reads", totals.reads, "reads of your address"],
    ["denied", totals.denied, totals.denied === 1 ? "refused read" : "refused reads"],
  ];
  return (
    <ul className="mh-totals" aria-label="Totals counted from the log">
      {items.map(([key, value, label]) => (
        <li key={key} data-metric={`moving-house.${key}`} data-value={value}>
          <strong>{value}</strong> {label}
        </li>
      ))}
    </ul>
  );
}

/** Step 7: who has read the address. */
export function MovingReaders() {
  const totals = movingHouseTotals(useLog());
  const grants = usePodData(loadGrants);
  return (
    <Screen title="Who has read it" page="Who has read your address" back={BACK}>
      <p className="muted small">
        From the pod's request log: each read was checked against your grants by the pod.
      </p>
      <Totals totals={totals} />
      <ul className="mh-list">
        {HOLDERS.map((holder) => {
          const reads = totals.readers[holder] ?? 0;
          const state = grants.data?.find((row) => row.holder === holder)?.state;
          return (
            <li key={holder} className="card" data-testid={`mh-reader-${holder}`}>
              <HolderLine holder={holder}>
                <span className="mh-count">
                  {reads} {reads === 1 ? "read" : "reads"}
                </span>
              </HolderLine>
              {state === "revoked" ? <p className="small">Grant withdrawn.</p> : null}
            </li>
          );
        })}
      </ul>
      <Nav />
    </Screen>
  );
}

/** Step 8: the standing grants, each one withdrawable. */
export function MovingSharing() {
  const grants = usePodData(loadGrants);
  const { go, state } = useRun();
  const shown = grants.data?.filter((row) => row.state !== "none") ?? [];
  return (
    <Screen title="Standing grants" page="Standing grants" back={BACK}>
      {grants.error !== undefined ? <Problem error={grants.error} /> : null}
      {grants.data === undefined && grants.error === undefined ? (
        <Loading what="your grants" />
      ) : null}
      {grants.data !== undefined && shown.length === 0 ? (
        <Empty>No organisation can read your address yet.</Empty>
      ) : null}
      <ul className="mh-list">
        {shown.map((row) => (
          <li key={row.holder} className="card" data-testid={`mh-grant-${row.holder}`}>
            <HolderLine holder={row.holder}>
              <span className="mh-code">{codeOf(row.holder)}</span>
            </HolderLine>
            <p className="small">
              Reads your address · {PURPOSE_TEXT} ·{" "}
              {row.state === "active" ? UNTIL_LABEL : "Withdrawn"}
            </p>
            {row.state === "active" ? (
              <button
                type="button"
                className="button revoke"
                data-tour={row.holder === "bank" ? "wallet-mh-revoke-bank" : undefined}
                disabled={state.running}
                onClick={() =>
                  go(row.holder, async (world) =>
                    (await journey()).withdrawAddressGrant(world, row.holder),
                  )
                }
              >
                Withdraw {ORGS[row.holder].short}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {state.error !== undefined ? <Problem error={state.error} /> : null}
      {state.done !== undefined ? (
        <div className="notice success" role="status">
          <strong>Grant withdrawn</strong>
          <p>
            {ORGS[state.done as Holder]?.organisation ?? "The organisation"} can no longer read your
            address. The withdrawal is in your consent records.
          </p>
        </div>
      ) : null}
      <Nav />
    </Screen>
  );
}

/** Step 10: the journey ledger, with totals counted from the same log. */
export function MovingLedger() {
  const entries = useLog();
  const totals = movingHouseTotals(entries);
  const mount = useRef<HTMLDivElement>(null);
  const ledger = useRef<JourneyLedger | null>(null);
  const pushed = useRef(0);
  useEffect(() => {
    defineJourneyLedger();
    const element = document.createElement("journey-ledger") as JourneyLedger;
    const calendar = createDemoCalendar();
    element.configure(
      {
        ...movingHouseLens(),
        app: "wallet",
        calendar: { dayOf: (d) => calendar.dayOf(d), label: (d) => calendar.label(d) },
        holder: MOVING_HOUSE_HOLDER,
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
        Counted from the pod's request log, not typed in: every read of your address and the grant
        that allowed it.
      </p>
      <Totals totals={totals} />
      <div ref={mount} className="mh-ledger" data-tour="mh-journey-ledger" />
      <Nav />
    </Screen>
  );
}
