// AUTHORED-BY Claude Opus 5.5
/**
 * Alder Bank's personal loans page in the lending story (flows.md section 4, step 9). Alder's model
 * checks the credit file only: when the page opens, it asks Quillon for Maya's score under her
 * authorisation (grant A1), declines below the cut-off, and delivers a notice of adverse action,
 * with its reasons and the score it used, into her pod. Alder keeps its own decision record; it may
 * write into `loans/alder/`, never read it.
 */
import "./lending.css";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import { podUrl, statusOf } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { lendingPages } from "@mortgage/content/small-dollar-lending/browser";
import { CREDIT, DAY, PERSON, POLICY } from "@mortgage/content/small-dollar-lending/facts";
import { createPodHooks } from "@mortgage/demo-kit/react";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { note, onEvent, onReset, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import { useEffect } from "react";

const LENDER = "bank" as const;
const org = ORGS[LENDER];

const { usePodState } = createPodHooks({ events: { onEvent, onReset }, refusalOf });
const worldOf = lendingPages({ note, podFetch, ready, setDay }, LENDER);
const journey = () => import("@mortgage/content/small-dollar-lending/journey");

const NOTICE = "loans/alder/adverse-action";

async function decideOnOpen() {
  const { alderDecides, ADVERSE_ACTION_REASONS } = await journey();
  const world = await worldOf(DAY.apply);
  const notice = await alderDecides(world);
  const readBack = await statusOf(world.fetchAs(LENDER), podUrl(world, "maya", NOTICE));
  return { notice, readBack, reasons: ADVERSE_ACTION_REASONS };
}

export function LendingLoans() {
  useEffect(() => applyDocumentMeta(org, "Personal loans"), []);
  // Only Maya's pod is watched: the decision writes to ours, and must not run itself again.
  const { outcome } = usePodState(decideOnOpen, ["maya"]);
  const view = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <div className="sd-section">
      <h1>Personal loans</h1>
      <p>
        {PERSON.name} · Pre-qualified on income and returned payments, subject to a credit check by
        Quillon.
      </p>
      {outcome.state === "loading" ? (
        <p role="status">Asking Quillon for the score, under Maya's authorisation…</p>
      ) : null}
      {outcome.state === "refused" ? (
        <p role="alert" className="sd-alert">
          <strong>Refused by the pod ({outcome.status}).</strong> Maya has not authorised a credit
          check for Alder Bank, so Quillon cannot answer. She does that when she pre-qualifies.
        </p>
      ) : null}
      {outcome.state === "error" ? (
        <p role="alert" className="sd-alert">
          {outcome.message}
        </p>
      ) : null}
      {view !== undefined ? (
        <section className="sd-card" aria-labelledby="sd-decision">
          <h2 id="sd-decision">
            Our decision: {view.notice === undefined ? "approved" : "declined"}
          </h2>
          <dl>
            <dt>Model</dt>
            <dd>Credit file only. The cash-flow summary is not part of it.</dd>
            <dt>Score used</dt>
            <dd>
              {CREDIT.creditScoreValue} (FICO 8, from Quillon); cut-off {POLICY.bureauMinimumScore}
            </dd>
            <dt>Reasons</dt>
            <dd data-testid="bank-lending-reasons">{view.reasons.join("; ")}</dd>
          </dl>
          {view.notice !== undefined ? (
            <p className="sd-ok" data-testid="bank-lending-notice">
              Notice of adverse action delivered to {PERSON.name}'s pod at <code>/{NOTICE}</code>,
              with these reasons, the score and where it came from.
            </p>
          ) : null}
          <p data-testid="bank-lending-read-back">
            Our read of that notice: the pod answers <strong>{view.readBack}</strong>.{" "}
            {view.readBack === 200 ? "Readable." : "Grant A1 lets us deliver, never read."}
          </p>
        </section>
      ) : null}
    </div>
  );
}
