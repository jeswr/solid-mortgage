// AUTHORED-BY Claude Opus 5.5
import { DAY, FIGURE_TAG, INSURANCE } from "@mortgage/content/mortgage/facts";
import { bindInsurance } from "@mortgage/content/mortgage/journey";
import { useCallback } from "react";
import { Link } from "wouter";
import { useAction } from "../action.ts";
import { usePodLog } from "../log.ts";
import { worldOn } from "../pods.ts";
import { bindState, usd } from "../view.ts";
import { Shell } from "./Shell.tsx";

/** Wrenfield's own rate card for this home: the insurer's figures, not data from the pod. */
const TERMS = [
  { label: "Dwelling cover", value: usd(INSURANCE.dwellingCoverageUsd) },
  { label: "Deductible", value: usd(INSURANCE.deductibleUsd) },
  { label: "Lender named as mortgagee", value: INSURANCE.mortgageeClause },
];

export function Quote() {
  const log = usePodLog();
  const state = bindState(log);
  const bind = useCallback(async () => bindInsurance(await worldOn(DAY.insurance)), []);
  const [action, run] = useAction(bind);
  const bound = state === "bound" || action.phase === "done";
  const label =
    action.phase === "running" ? "Binding…" : bound ? "Coverage bound" : "Bind coverage";
  return (
    <Shell stage={2} page="Your quote">
      <p className="eyebrow">Question 2 of 2</p>
      <h1>Your price for a year of cover</h1>
      <p className="price">
        <span className="amount">{usd(INSURANCE.annualPremiumUsd)}</span>
        <span className="per">a year · {usd(INSURANCE.annualPremiumUsd / 12, true)} a month</span>
      </p>
      <p className="tag">{FIGURE_TAG}</p>
      <dl className="terms">
        {TERMS.map((term) => (
          <div key={term.label}>
            <dt>{term.label}</dt>
            <dd>{term.value}</dd>
          </div>
        ))}
      </dl>
      <p className="lede">
        Binding asks your pod to let Wrenfield read the property record and the appraisal, then
        writes the evidence of insurance into your pod once. Your lender reads it there.
      </p>
      <button
        type="button"
        className="cta"
        data-tour="insurer-bind"
        disabled={state !== "ready" || action.phase === "running" || bound}
        onClick={run}
      >
        {label}
      </button>
      {state === "waiting-for-appraisal" && !bound ? (
        <p className="muted">
          The quote uses your copy of the appraisal. It is not in your pod yet, so binding has to
          wait.
        </p>
      ) : null}
      {action.phase === "failed" ? (
        <p className="error" role="alert">
          Binding stopped: {action.message}
        </p>
      ) : null}
      {bound ? (
        <div className="success" role="status">
          <strong>You are covered.</strong> The evidence of insurance is in your pod.{" "}
          <Link href="/evidence">See what was written</Link>
        </div>
      ) : null}
    </Shell>
  );
}
