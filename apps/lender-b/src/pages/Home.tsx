// AUTHORED-BY Claude Opus 5.5
/**
 * "Check if you pre-qualify": Copperfield publishes two thresholds and asks for a proof of each.
 * The call to action opens Alex's wallet on its Prove screen (a full navigation: that route is
 * cross-origin isolated), which answers both lenders' challenges.
 */
import { PREQUALIFICATION } from "@mortgage/content/mortgage/facts";
import { MORT } from "@mortgage/data-model";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { useEffect } from "react";
import { Link } from "wouter";
import { org } from "../org.ts";
import { loadResult } from "../pod.ts";
import { world } from "../runtime.ts";
import { usePod } from "../usePod.ts";
import { isQualified, statementText } from "../view.ts";

const ASKS = [
  { bound: PREQUALIFICATION.minimumMonthlyIncomeUsd, field: MORT.monthlyGrossIncomeUsd, op: "ge" },
  { bound: PREQUALIFICATION.minimumCreditScore, field: MORT.creditScoreValue, op: "ge" },
];

export function HomePage() {
  useEffect(() => applyDocumentMeta(org), []);
  const [result] = usePod(() => loadResult(world()));
  const qualified =
    result.status === "ready" &&
    result.value !== undefined &&
    isQualified(result.value.description);
  return (
    <>
      <section className="hero">
        <p className="kicker">Pre-qualification in one step</p>
        <h1 className="display">
          Two yes-or-no questions. <span className="copper">Zero documents.</span>
        </h1>
        <p className="hero-lede">
          Your wallet proves the answers. We never see your income, your score or your files, and we
          get no access to your pod.
        </p>
        <a
          className="cta"
          href={appUrl("wallet", "prove", { return: appUrl("lender-b", "received") })}
        >
          Check if you pre-qualify
        </a>
        {qualified ? (
          <p className="hero-note">
            You already pre-qualified. <Link href="/result">See your quote</Link>.
          </p>
        ) : null}
      </section>
      <section className="band" aria-labelledby="asks-heading">
        <h2 id="asks-heading" className="band-title">
          What we ask
        </h2>
        <ol className="asks">
          {ASKS.map((ask) => (
            <li key={ask.field}>
              <span className="asks-q">{statementText(ask)}?</span>
              <span className="asks-a">Yes or no. That is all we learn.</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="band band-dark" aria-labelledby="how-heading">
        <h2 id="how-heading" className="band-title">
          How it works
        </h2>
        <ol className="how">
          <li>
            <strong>We publish a challenge.</strong> The two thresholds and a single-use number.
          </li>
          <li>
            <strong>Your wallet proves each answer</strong> from credentials your employer's payroll
            provider and the credit bureau signed.
          </li>
          <li>
            <strong>We check the proofs</strong> against those issuers' signatures and keep only the
            answer.
          </li>
        </ol>
      </section>
    </>
  );
}
