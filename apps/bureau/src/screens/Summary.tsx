// AUTHORED-BY Claude Opus 5.5
import { BORROWER, CREDIT, CURRENT_ADDRESS, FIGURE_TAG } from "@mortgage/content/mortgage/facts";
import { shareCreditSummary } from "@mortgage/content/mortgage/journey";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect, useState } from "react";
import { ErrorNote, IssuedTable, ReadBack } from "../components.tsx";
import { loadIssuances } from "../data.ts";
import { org } from "../org.ts";
import { usePodData, usePods } from "../pods.tsx";
import { dollars } from "../view.ts";

/** Tour step 4: the consumer's own credit file summary, sent to the pod on request. */
export function Summary() {
  useEffect(() => applyDocumentMeta(org, "Your credit file summary"), []);
  const pods = usePods();
  const issued = usePodData((p) => loadIssuances(p.world()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const sent = issued.state === "ready" ? issued.data : [];
  const alreadySent = sent.some((issuance) => issuance.name === "credit-summary");

  return (
    <div className="page">
      <h1>Your credit file summary</h1>
      <p>
        Consumer disclosure. Requesting your own summary is a soft inquiry and does not affect your
        score.
      </p>

      <fieldset>
        <legend>Consumer</legend>
        <dl className="form">
          <dt>Name</dt>
          <dd>{BORROWER.name}</dd>
          <dt>Current address</dt>
          <dd>
            {CURRENT_ADDRESS.streetAddress}, {CURRENT_ADDRESS.addressLocality},{" "}
            {CURRENT_ADDRESS.addressRegion} {CURRENT_ADDRESS.postalCode}
          </dd>
          <dt>Social Security number</dt>
          <dd>XXX-XX-{BORROWER.taxIdLast4}</dd>
        </dl>
      </fieldset>

      <fieldset>
        <legend>Summary</legend>
        <dl className="form">
          <dt>Credit score</dt>
          <dd className="figure">{CREDIT.consumerSummaryScore}</dd>
          <dt>Total monthly debt payments</dt>
          <dd className="figure">{dollars(CREDIT.totalMonthlyDebtUsd)}</dd>
        </dl>
        <p className="note">Figures: {FIGURE_TAG}.</p>
      </fieldset>

      <fieldset>
        <legend>Send to your pod</legend>
        <p>
          The signed summary contains the two figures above and nothing else. Quillon also signs an
          anchor for the score, so you can later prove it is above a lender's threshold without
          showing it. Accounts, payment history and inquiries stay in your file at Quillon.
        </p>
        <p>
          A lender does not accept this summary for underwriting. It orders its own report from
          Quillon.
        </p>
        <p>Quillon asks your wallet for one slot, credentials/credit-summary (grant G3).</p>
        <button
          type="button"
          data-tour="bureau-send"
          disabled={pods === null || busy || issued.state !== "ready" || alreadySent}
          onClick={async () => {
            if (pods === null) return;
            setBusy(true);
            setError(undefined);
            try {
              await pods.runBeat(shareCreditSummary);
            } catch (caught) {
              setError(caught);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Sending…" : alreadySent ? "Summary sent" : "Send summary to my pod"}
        </button>
        {error === undefined ? null : <ErrorNote error={error} />}
      </fieldset>

      {sent.length === 0 ? null : (
        <section aria-labelledby="sent-heading">
          <h2 id="sent-heading">Sent</h2>
          <IssuedTable issuances={sent} />
          <ReadBack />
        </section>
      )}
      {issued.state === "failed" ? <ErrorNote error={issued.error} /> : null}
    </div>
  );
}
