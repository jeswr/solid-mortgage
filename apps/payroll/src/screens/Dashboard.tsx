// AUTHORED-BY Claude Opus 5.5
import { EMPLOYMENT } from "@mortgage/content/mortgage/facts";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { Link } from "wouter";
import { Icon } from "../components.tsx";
import { loadIssuances, loadRefreshRequests } from "../data.ts";
import { org } from "../org.ts";
import { type Loaded, usePodData, usePods } from "../pods.tsx";
import { payslips, shortDate, usd } from "../view.ts";

export function Dashboard() {
  useEffect(() => applyDocumentMeta(org), []);
  const pods = usePods();
  const issued = usePodData((p) => loadIssuances(p.world()));
  const requests = usePodData((p) => loadRefreshRequests(p.world()));
  const latest =
    pods === null
      ? undefined
      : payslips(pods.world().calendar, EMPLOYMENT.monthlyGrossIncomeUsd, 1)[0];
  const count = (loaded: Loaded<readonly unknown[]>) =>
    loaded.state === "ready" ? String(loaded.data.length) : "…";
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Northfield Engineering · Employee self-service</p>
        <h1>Good morning, Alex</h1>
      </header>
      <div className="tiles">
        <section className="tile" aria-labelledby="role-heading">
          <h2 id="role-heading">Your role</h2>
          <p className="big">{EMPLOYMENT.jobTitle}</p>
          <p className="small">Since {shortDate(EMPLOYMENT.startDate)}</p>
        </section>
        <section className="tile" aria-labelledby="pay-heading">
          <h2 id="pay-heading">Last payslip</h2>
          <p className="big">{latest === undefined ? "…" : usd(latest.grossUsd)}</p>
          <p className="small">
            {latest === undefined ? "" : `${latest.period}, paid ${shortDate(latest.payDate)}`}
          </p>
          <Link href="/pay">All payslips</Link>
        </section>
        <section className="tile" aria-labelledby="issued-heading">
          <h2 id="issued-heading">Verifications issued</h2>
          <p className="big">{count(issued)}</p>
          <Link href="/verifications">Open the log</Link>
        </section>
        <section className="tile" aria-labelledby="refresh-heading">
          <h2 id="refresh-heading">Refresh requests</h2>
          <p className="big">{count(requests)}</p>
          <p className="small">Answered by Ledgerly's back office</p>
        </section>
        <section className="tile accent wide" aria-labelledby="cta-heading">
          <Icon name="share" />
          <h2 id="cta-heading">Buying a home?</h2>
          <p>
            Lenders ask for proof of employment and income. Send a signed verification to your own
            pod and let them check it there.
          </p>
          <Link href="/share" className="button-link">
            Share verified employment
          </Link>
        </section>
      </div>
    </div>
  );
}
