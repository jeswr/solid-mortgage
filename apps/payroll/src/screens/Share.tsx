// AUTHORED-BY Claude Opus 5.5
import { EMPLOYMENT } from "@mortgage/content/mortgage/facts";
import { shareEmployment } from "@mortgage/content/mortgage/journey";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect, useState } from "react";
import { ErrorNote, IssuanceTable, ReadBack } from "../components.tsx";
import { loadIssuances } from "../data.ts";
import { org } from "../org.ts";
import { usePodData, usePods } from "../pods.tsx";
import { shortDate, usd } from "../view.ts";

/** Tour step 2: Alex asks Ledgerly for a signed statement of job and income. */
export function Share() {
  useEffect(() => applyDocumentMeta(org, "Share verified employment"), []);
  const pods = usePods();
  const issued = usePodData((p) => loadIssuances(p.world()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const mine =
    issued.state === "ready"
      ? issued.data.filter((issuance) => issuance.name.startsWith("employment-income"))
      : [];
  const alreadyIssued = mine.some((issuance) => issuance.name === "employment-income");

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Employee self-service</p>
        <h1>Share verified employment</h1>
        <p className="lede">
          Ledgerly signs a statement from Northfield Engineering's payroll record and writes it into
          your pod. Lenders can check it with Ledgerly's public key without calling us.
        </p>
      </header>

      <div className="tiles two">
        <section className="tile" aria-labelledby="fields-heading">
          <h2 id="fields-heading">What the credential says</h2>
          <dl className="fields">
            <div>
              <dt>Employer</dt>
              <dd>{EMPLOYMENT.employerName}</dd>
            </div>
            <div>
              <dt>Job title</dt>
              <dd>{EMPLOYMENT.jobTitle}</dd>
            </div>
            <div>
              <dt>Start date</dt>
              <dd>{shortDate(EMPLOYMENT.startDate)}</dd>
            </div>
            <div>
              <dt>Base pay</dt>
              <dd>{usd(EMPLOYMENT.monthlyGrossIncomeUsd)} a month, gross</dd>
            </div>
          </dl>
          <p className="small">
            Kept by Ledgerly and not shared: payslips, pay history, year-to-date totals, tax and
            bank details.
          </p>
        </section>

        <section className="tile accent" aria-labelledby="where-heading">
          <h2 id="where-heading">Where it goes</h2>
          <ol className="steps">
            <li>
              Ledgerly asks your wallet for one slot: credentials/employment-income (grant G1).
            </li>
            <li>You approve. The slot lets Ledgerly write there and nowhere else.</li>
            <li>
              Ledgerly signs the statement and an anchor for proofs about your income, and writes
              both.
            </li>
          </ol>
          <button
            type="button"
            className="primary"
            data-tour="payroll-sign-send"
            disabled={pods === null || busy || issued.state !== "ready" || alreadyIssued}
            onClick={async () => {
              if (pods === null) return;
              setBusy(true);
              setError(undefined);
              try {
                await pods.runBeat(shareEmployment);
              } catch (caught) {
                setError(caught);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Signing…" : alreadyIssued ? "Already in your pod" : "Sign and send to my pod"}
          </button>
          {error === undefined ? null : <ErrorNote error={error} />}
        </section>
      </div>

      {mine.length === 0 ? null : (
        <section className="tile wide" aria-labelledby="sent-heading">
          <h2 id="sent-heading">Sent to your pod</h2>
          <p className="small">Read from Ledgerly's own issued/ records and status list.</p>
          <IssuanceTable issuances={mine} />
          <ReadBack />
        </section>
      )}
      {issued.state === "failed" ? <ErrorNote error={issued.error} /> : null}
    </div>
  );
}
