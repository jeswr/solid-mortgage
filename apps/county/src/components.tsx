// AUTHORED-BY Claude Opus 5.5
/** Small pieces every county screen uses: refusals, errors, loading and the catch-up offer. */
import { catchUpTo, type Outcome, stepsBefore, useCatchUp } from "./runtime.ts";

/** Pod-relative form of a pod URL, for display: "/alex/property/subject-property". */
export function podPath(url: string): string {
  return new URL(url).pathname.replace(/^\/pods/, "");
}

export function Refusal({
  status,
  method,
  url,
  why,
}: {
  status: number;
  method: string;
  url: string;
  why?: string;
}) {
  return (
    <div className="refusal" role="alert">
      <strong>Refused by the pod ({status}).</strong> {method} {podPath(url)}
      {why === undefined ? null : <span className="refusal-why"> {why}</span>}
    </div>
  );
}

/** Render a loading, refused or failed outcome; `null` when the outcome is ok. */
export function OutcomeNote({
  outcome,
  why,
}: {
  outcome: Outcome<unknown> | { state: "idle" } | { state: "running" };
  why?: string;
}) {
  switch (outcome.state) {
    case "loading":
      return <p className="muted">Reading the pods…</p>;
    case "refused":
      return <Refusal {...outcome} {...(why === undefined ? {} : { why })} />;
    case "error":
      return (
        <div className="failure" role="alert">
          Something went wrong: {outcome.message}
        </div>
      );
    default:
      return null;
  }
}

/**
 * Free play: when this screen's step needs earlier steps, offer to restart the demo and run
 * them. The tour never needs this; it runs the steps in order.
 */
export function CatchUp({ step, label, needed }: { step: string; label: string; needed: boolean }) {
  const state = useCatchUp();
  if (!needed && !state.running && state.error === undefined) return null;
  const count = stepsBefore(step);
  return (
    <section className="catch-up" aria-labelledby="catch-up-heading">
      <h2 id="catch-up-heading">{state.running ? "Catching up" : "Nothing to work on yet"}</h2>
      {state.running ? null : <p>{label}</p>}
      <p className="muted">
        Exploring on your own? This restarts the demo from its starting data and runs the {count}{" "}
        earlier steps of the journey, in order, against the pods in your browser.
      </p>
      <button
        type="button"
        className="secondary"
        disabled={state.running}
        onClick={() => void catchUpTo(step)}
      >
        {state.running ? "Running…" : "Restart and run the earlier steps"}
      </button>
      <p className="muted" role="status">
        {state.running ? `Running: ${state.beat ?? "starting"}` : ""}
      </p>
      {state.error === undefined ? null : (
        <div className="failure" role="alert">
          The catch-up stopped: {state.error}
        </div>
      )}
    </section>
  );
}
