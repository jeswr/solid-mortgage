// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { org } from "../org.ts";
import { TABS } from "../view.ts";

/** The account portal frame: charcoal bar, top tabs, a dashboard below. */
export function Shell({ page, children }: { page?: string; children: ReactNode }) {
  const [location] = useLocation();
  useEffect(() => applyDocumentMeta(org, page), [page]);
  return (
    <div className="portal">
      <header className="bar">
        <div className="bar-inner">
          <Link href="/" className="brand" aria-label="Marigold Loan Servicing, welcome">
            <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
              <g fill="var(--marigold)">
                <circle cx="16" cy="9" r="4" />
                <circle cx="23" cy="16" r="4" />
                <circle cx="16" cy="23" r="4" />
                <circle cx="9" cy="16" r="4" />
              </g>
              <circle cx="16" cy="16" r="3" fill="var(--marigold-deep)" />
            </svg>
            <span>
              Marigold <span className="brand-sub">Loan Servicing</span>
            </span>
          </Link>
          <p className="account-chip">Loan JHL-1001</p>
        </div>
        <nav aria-label="Account sections" className="tabs">
          <ul>
            {TABS.map((tab) => (
              <li key={tab.path}>
                <Link href={tab.path} aria-current={location === tab.path ? "page" : undefined}>
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="board">{children}</main>
      <footer className="legal">
        Marigold Loan Servicing · Questions about a payment: +1-614-555-0123 (fictional)
      </footer>
    </div>
  );
}

/** A refusal from Alex's pod, shown as such. */
export function Refusal({ status, children }: { status: number; children: ReactNode }) {
  return (
    <div className="refusal" role="status">
      <strong>Alex's pod refused this read ({status})</strong>
      <p>{children}</p>
    </div>
  );
}

/** Shown on screens that need the pod before Alex has connected it. */
export function NotConnected() {
  return (
    <section className="panel empty">
      <h2>Your pod is not connected yet</h2>
      <p>
        Marigold reads your contact details, proof of insurance and autopay instruction from your
        pod once you allow it.
      </p>
      <Link href="/connect" className="button">
        Connect your pod
      </Link>
    </section>
  );
}
