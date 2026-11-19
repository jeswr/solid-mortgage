// AUTHORED-BY Claude Opus 5.5
/** The desk's own small building blocks: status chips, read results, the action bar. */
import { PodRequestError } from "@mortgage/content/mortgage/world";
import { type ReactNode, useState } from "react";
import type { Loaded } from "./pod.ts";
import { type Gate, podPath } from "./view.ts";

export type Tone = "ok" | "warn" | "bad" | "idle" | "info";

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="mono">{children}</code>;
}

/** What a screen shows when a read did not return the resource. */
export function NotLoaded({ loaded, what }: { loaded: Loaded<unknown> | undefined; what: string }) {
  if (loaded === undefined) return <p className="dim">Loading {what}…</p>;
  switch (loaded.state) {
    case "ok":
      return null;
    case "missing":
      return <p className="dim">No {what} on file yet.</p>;
    case "refused":
      return (
        <p className="refusal" role="status">
          <Chip tone="bad">{loaded.status} refused</Chip> The pod refused to show {what} to Juniper
          ({podPath(loaded.url)}).
        </p>
      );
    case "error":
      return (
        <p className="refusal" role="status">
          <Chip tone="bad">error</Chip> Could not read {what}: {loaded.message}
        </p>
      );
  }
}

export function stateChip(loaded: Loaded<unknown> | undefined): ReactNode {
  if (loaded === undefined) return <Chip tone="idle">…</Chip>;
  if (loaded.state === "ok") return <Chip tone="ok">on file</Chip>;
  if (loaded.state === "missing") return <Chip tone="idle">none</Chip>;
  if (loaded.state === "refused") return <Chip tone="bad">{loaded.status}</Chip>;
  return <Chip tone="bad">error</Chip>;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

function describe(error: unknown): string {
  if (error instanceof PodRequestError)
    return `The pod answered ${error.status} to ${error.method} ${podPath(error.url)}.`;
  return error instanceof Error ? error.message : String(error);
}

/**
 * The action strip at the foot of a tab: whose job it is, the button (the tour's target), and
 * what happened. The button is enabled whenever the loan file allows the action.
 */
export function ActionBar({
  tour,
  label,
  who,
  gate,
  run,
  onDone,
}: {
  tour: string;
  label: string;
  who: string;
  gate: Gate;
  run: () => Promise<string | undefined>;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult>();
  const click = async () => {
    setBusy(true);
    setResult(undefined);
    try {
      const message = await run();
      setResult({ ok: true, ...(typeof message === "string" ? { message } : {}) });
    } catch (error) {
      console.error(`lender-desk: ${label} failed`, error);
      setResult({ message: describe(error), ok: false });
    } finally {
      setBusy(false);
      onDone?.();
    }
  };
  return (
    <div className="action-bar">
      <div className="action-who">
        <span className="dim">Action by</span> {who}
      </div>
      <button
        type="button"
        className="btn-primary"
        data-tour={tour}
        disabled={busy || !gate.allowed}
        aria-describedby={`${tour}-why`}
        onClick={() => void click()}
      >
        {busy ? "Working…" : label}
      </button>
      <span id={`${tour}-why`} className="dim action-why">
        {busy ? "Requests in flight, as Juniper Home Loans." : gate.allowed ? "" : gate.reason}
      </span>
      {result !== undefined && (
        <p className={result.ok ? "action-ok" : "refusal"} role="status">
          {result.ok ? (result.message ?? "Done.") : result.message}
        </p>
      )}
    </div>
  );
}

/** A dense definition table: label / value rows. */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="facts">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const id = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="panel" aria-labelledby={id}>
      <header className="panel-head">
        <h3 id={id}>{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

export const day = (date: Date | undefined): string =>
  date === undefined ? "—" : date.toISOString().slice(0, 10);
