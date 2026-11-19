// AUTHORED-BY Claude Opus 5.5
/**
 * Disclosures (tour steps 11 and 17). Each step has two beats: Juniper delivers the document to
 * Alex's pod when this screen opens, and Alex's button records the answer.
 *
 * - Loan Estimate: delivered once the application is on file; "I intend to proceed".
 * - Closing Disclosure: delivered once the loan is clear to close; "I have received this".
 *
 * Both documents are read back from Alex's drawer `mortgage/juniper/` and shown with their TRID
 * dates on the demo calendar.
 */
import { DAY } from "@mortgage/content/mortgage/facts";
import {
  acknowledgeClosingDisclosure,
  deliverClosingDisclosure,
  deliverLoanEstimate,
  intendToProceed,
} from "@mortgage/content/mortgage/journey";
import type { World } from "@mortgage/content/mortgage/world";
import type { ClosingDisclosure, LoanEstimate } from "@mortgage/data-model";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Failure, Loading, Refusal } from "../components.tsx";
import { org } from "../org.ts";
import { addressLine, type DisclosureState, loadDisclosures, refusalOf } from "../pod.ts";
import { act, calendar, worldOn } from "../runtime.ts";
import { usePod } from "../usePod.ts";
import { closingDisclosureRows, type DateRow, loanEstimateRows, termRows } from "../view.ts";

/** First beats in flight, so a re-render or a second mount does not deliver twice. */
const delivering = new Map<string, Promise<void>>();

function deliverOnce(
  key: string,
  day: number,
  beat: (world: World) => Promise<void>,
): Promise<void> {
  let running = delivering.get(key);
  if (running === undefined) {
    running = act(day, beat).finally(() => delivering.delete(key));
    delivering.set(key, running);
  }
  return running;
}

function Dates({ rows, caption }: { rows: readonly DateRow[]; caption: string }) {
  return (
    <table className="dates">
      <caption>{caption}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>
              {row.value}
              {row.note === undefined ? null : <span className="dates-note">{row.note}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Terms({
  estimate,
  closing,
}: {
  estimate: LoanEstimate;
  closing?: ClosingDisclosure | undefined;
}) {
  const rows = termRows(estimate, closing);
  return (
    <table className="terms">
      <caption>Loan terms{closing === undefined ? "" : ": estimate and final"}</caption>
      <thead>
        <tr>
          <th scope="col">Term</th>
          <th scope="col">Loan Estimate</th>
          {closing === undefined ? null : <th scope="col">Closing Disclosure</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className={row.changed ? "is-changed" : undefined}>
            <th scope="row">{row.label}</th>
            <td>{row.estimate}</td>
            {row.final === undefined ? null : (
              <td>
                {row.final}
                {row.changed ? <span className="sr-only"> (changed)</span> : null}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Answer = { kind: "idle" } | { kind: "busy" } | { kind: "failed"; error: unknown };

function useAnswer(
  day: number,
  beat: (world: World) => Promise<void>,
  reload: () => Promise<void>,
) {
  const [answer, setAnswer] = useState<Answer>({ kind: "idle" });
  const run = async () => {
    setAnswer({ kind: "busy" });
    try {
      await act(day, beat);
      setAnswer({ kind: "idle" });
      await reload();
    } catch (error) {
      setAnswer({ error, kind: "failed" });
    }
  };
  return [answer, run] as const;
}

function AnswerError({ answer }: { answer: Answer }) {
  if (answer.kind !== "failed") return null;
  const refused = refusalOf(answer.error);
  if (refused?.kind === "refused") return <Refusal {...refused} />;
  return (
    <Failure
      error={answer.error instanceof Error ? answer.error : new Error(String(answer.error))}
    />
  );
}

function EstimateCard({ state, reload }: { state: DisclosureState; reload: () => Promise<void> }) {
  const [answer, proceed] = useAnswer(DAY.loanEstimate, intendToProceed, reload);
  const estimate = state.estimate;
  return (
    <section className="panel disclosure" aria-labelledby="le-heading">
      <header className="disclosure-head">
        <h2 id="le-heading">Loan Estimate</h2>
        <span className={estimate === undefined ? "chip" : "chip chip-on"}>
          {estimate === undefined ? "Not yet issued" : "In your pod"}
        </span>
      </header>
      {!state.submitted ? (
        <p>
          The Loan Estimate follows your application.{" "}
          <Link href="/application">Review and submit it</Link> first.
        </p>
      ) : estimate === undefined ? (
        <Loading label="Delivering your Loan Estimate to your pod…" />
      ) : (
        <>
          <p className="disclosure-property">For {addressLine(estimate.subjectProperty.address)}</p>
          <Dates
            caption="Dates (simulated calendar)"
            rows={loanEstimateRows(calendar(), estimate)}
          />
          <Terms estimate={estimate} />
          <p className="fine">
            Until you say you intend to proceed, Juniper may charge only for the credit report.
          </p>
        </>
      )}
      <button
        type="button"
        className="button button-primary"
        data-tour="lender-intent-to-proceed"
        onClick={proceed}
        disabled={
          estimate === undefined ||
          estimate.intentToProceedDate !== undefined ||
          answer.kind === "busy"
        }
      >
        {estimate?.intentToProceedDate !== undefined
          ? "You said you intend to proceed"
          : answer.kind === "busy"
            ? "Recording…"
            : "I intend to proceed"}
      </button>
      <AnswerError answer={answer} />
    </section>
  );
}

function ClosingCard({ state, reload }: { state: DisclosureState; reload: () => Promise<void> }) {
  const [answer, acknowledge] = useAnswer(
    DAY.closingDisclosure,
    acknowledgeClosingDisclosure,
    reload,
  );
  const closing = state.closing;
  return (
    <section className="panel disclosure" aria-labelledby="cd-heading">
      <header className="disclosure-head">
        <h2 id="cd-heading">Closing Disclosure</h2>
        <span className={closing === undefined ? "chip" : "chip chip-on"}>
          {closing === undefined ? "Not yet issued" : "In your pod"}
        </span>
      </header>
      {!state.clearToClose ? (
        <p>
          Issued once your loan is clear to close. The final terms and costs, for comparison with
          the estimate.
        </p>
      ) : closing === undefined ? (
        <Loading label="Delivering your Closing Disclosure to your pod…" />
      ) : (
        <>
          <Dates
            caption="Dates (simulated calendar)"
            rows={closingDisclosureRows(calendar(), closing)}
          />
          {state.estimate === undefined ? null : (
            <Terms estimate={state.estimate} closing={closing} />
          )}
          <p className="fine">
            You must have this at least three business days before closing, so the date you receive
            it matters.
          </p>
        </>
      )}
      <button
        type="button"
        className="button button-primary"
        data-tour="lender-cd-received"
        onClick={acknowledge}
        disabled={
          closing === undefined || closing.receivedDate !== undefined || answer.kind === "busy"
        }
      >
        {closing?.receivedDate !== undefined
          ? "Receipt confirmed"
          : answer.kind === "busy"
            ? "Recording…"
            : "I have received this"}
      </button>
      <AnswerError answer={answer} />
    </section>
  );
}

export function DisclosuresPage() {
  useEffect(() => applyDocumentMeta(org, "Disclosures"), []);
  const [state, reload] = usePod(() => loadDisclosures(worldOn(DAY.loanEstimate)));
  const [deliveryError, setDeliveryError] = useState<unknown>();
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  // The first beat of steps 11 and 17: Juniper delivers what is due and not yet in the pod.
  useEffect(() => {
    if (state.status !== "ready") return;
    const value = state.value;
    const due: Promise<void>[] = [];
    if (value.submitted && value.estimate === undefined) {
      due.push(deliverOnce("loan-estimate", DAY.loanEstimate, deliverLoanEstimate));
    }
    if (value.clearToClose && value.closing === undefined) {
      due.push(deliverOnce("closing-disclosure", DAY.closingDisclosure, deliverClosingDisclosure));
    }
    if (due.length === 0) return;
    Promise.all(due).then(
      () => reloadRef.current(),
      (error: unknown) => setDeliveryError(error),
    );
  }, [state]);

  const refused = deliveryError === undefined ? undefined : refusalOf(deliveryError);
  return (
    <>
      <section className="intro">
        <p className="eyebrow">Know before you owe</p>
        <h1>Your disclosures</h1>
        <p className="lede">
          Juniper delivers each disclosure into your pod, where you keep it. The dates below are on
          the demo's simulated calendar.
        </p>
      </section>
      {state.status === "loading" ? <Loading label="Reading your pod…" /> : null}
      {state.status === "error" ? <Failure error={state.error} /> : null}
      {refused?.kind === "refused" ? <Refusal {...refused} /> : null}
      {deliveryError !== undefined && refused === undefined ? (
        <Failure
          error={deliveryError instanceof Error ? deliveryError : new Error(String(deliveryError))}
        />
      ) : null}
      {state.status === "ready" ? (
        <div className="disclosures">
          <EstimateCard state={state.value} reload={reload} />
          <ClosingCard state={state.value} reload={reload} />
        </div>
      ) : null}
    </>
  );
}
