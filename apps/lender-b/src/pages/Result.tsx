// AUTHORED-BY Claude Opus 5.5
/** Result: Copperfield's own record of the outcome, and an illustrative quote. */
import { FIGURE_TAG } from "@mortgage/content/mortgage/facts";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { useEffect } from "react";
import { Link } from "wouter";
import { org } from "../org.ts";
import { loadResult } from "../pod.ts";
import { world } from "../runtime.ts";
import { usePod } from "../usePod.ts";
import { isQualified, monthlyPayment, usd } from "../view.ts";

/** Copperfield's illustrative example. It knows no price or loan amount: it was never told one. */
const EXAMPLE = { amount: 300_000, months: 360, ratePercent: 6.375 } as const;

export function ResultPage() {
  useEffect(() => applyDocumentMeta(org, "Your result"), []);
  const [state] = usePod(() => loadResult(world()));
  return (
    <section className="band" aria-labelledby="result-heading">
      <h1 id="result-heading" className="display display-sm">
        Your result
      </h1>
      {state.status === "loading" ? <p role="status">Reading our records…</p> : null}
      {state.status === "error" ? (
        <p role="alert">Something went wrong: {state.error.message}</p>
      ) : null}
      {state.status === "ready" && state.value === undefined ? (
        <p>
          We have not received anything from you yet.{" "}
          <a href={appUrl("wallet", "prove", { return: appUrl("lender-b", "received") })}>
            Check if you pre-qualify
          </a>
          .
        </p>
      ) : null}
      {state.status === "ready" && state.value !== undefined ? (
        <>
          <p
            className={
              isQualified(state.value.description) ? "verdict verdict-yes" : "verdict verdict-no"
            }
          >
            {isQualified(state.value.description)
              ? "You pre-qualify."
              : "We could not pre-qualify you."}
          </p>
          <p className="record">{state.value.description}</p>
          {isQualified(state.value.description) ? (
            <div className="quote">
              <p className="quote-rate">
                {EXAMPLE.ratePercent}
                <span>% fixed, 30 years</span>
              </p>
              <p>
                On {usd(EXAMPLE.amount)}: about{" "}
                {usd(monthlyPayment(EXAMPLE.amount, EXAMPLE.ratePercent, EXAMPLE.months))} a month
                in principal and interest.
              </p>
              <p className="tag">{FIGURE_TAG}. Pre-qualification is not pre-approval.</p>
            </div>
          ) : null}
          <p>
            <Link href="/received">See exactly what we received</Link>
          </p>
        </>
      ) : null}
    </section>
  );
}
