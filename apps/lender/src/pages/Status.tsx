// AUTHORED-BY Claude Opus 5.5
/** Status: the loan's milestones from Juniper's own file, and what is waiting on Alex. */
import { DAY } from "@mortgage/content/mortgage/facts";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { Link } from "wouter";
import { Failure, Loading } from "../components.tsx";
import { org } from "../org.ts";
import { loadLoanFile } from "../pod.ts";
import { worldOn } from "../runtime.ts";
import { usePod } from "../usePod.ts";
import { milestones } from "../view.ts";

const YOUR_MOVE_LINK: Record<string, string> = {
  "Apply with your pod": "/",
  "Confirm you received the Closing Disclosure": "/disclosures",
  "Tell us you intend to proceed": "/disclosures",
};

export function StatusPage() {
  useEffect(() => applyDocumentMeta(org, "Status"), []);
  const [state] = usePod(() => loadLoanFile(worldOn(DAY.application)));
  const list = state.status === "ready" ? milestones(state.value) : [];
  const outstanding = list.filter((milestone) => milestone.yourMove !== undefined);
  return (
    <>
      <section className="intro">
        <p className="eyebrow">Loan JHL-1001</p>
        <h1>Where your loan stands</h1>
      </section>
      {state.status === "loading" ? <Loading label="Reading your loan file…" /> : null}
      {state.status === "error" ? <Failure error={state.error} /> : null}
      {state.status === "ready" ? (
        <div className="status">
          <section className="panel" aria-labelledby="milestones-heading">
            <h2 id="milestones-heading">Milestones</h2>
            <ol className="milestones">
              {list.map((milestone) => (
                <li key={milestone.label} className={milestone.done ? "is-done" : undefined}>
                  <span className="milestone-mark" aria-hidden="true">
                    {milestone.done ? "✓" : ""}
                  </span>
                  <span>
                    {milestone.label}
                    <span className="sr-only">{milestone.done ? ": done" : ": not yet"}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section className="panel" aria-labelledby="outstanding-heading">
            <h2 id="outstanding-heading">Waiting on you</h2>
            {outstanding.length === 0 ? (
              <p>Nothing right now. Juniper's team is working on the next step.</p>
            ) : (
              <ul className="todo">
                {outstanding.map((milestone) => (
                  <li key={milestone.label}>
                    <Link href={YOUR_MOVE_LINK[milestone.yourMove ?? ""] ?? "/"}>
                      {milestone.yourMove}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="fine">
              Milestones come from Juniper's own loan file. Your documents stay in your pod.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
