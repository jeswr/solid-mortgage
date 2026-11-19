// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { type ReactNode, useEffect } from "react";
import { Link } from "wouter";
import { org } from "../org.ts";
import { FUNNEL } from "../view.ts";

/** The funnel frame: wordmark, progress dots, one question per screen. */
export function Shell({
  stage,
  page,
  children,
}: {
  /** Index into FUNNEL, or undefined off the funnel (not found). */
  stage: number | undefined;
  page?: string;
  children: ReactNode;
}) {
  useEffect(() => applyDocumentMeta(org, page), [page]);
  return (
    <div className="frame">
      <header className="masthead">
        <Link href="/" className="wordmark" aria-label="Wrenfield Mutual, start">
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
            <rect width="32" height="32" rx="16" fill="var(--sky)" />
            <path d="M8 17 16 9l8 8v7H8z" fill="#fff" />
            <circle cx="22" cy="10" r="4" fill="var(--sun)" />
          </svg>
          <span>Wrenfield</span>
        </Link>
        {stage === undefined ? null : (
          <nav aria-label="Progress">
            <ol className="dots">
              {FUNNEL.map((step, index) => (
                <li
                  key={step.path}
                  className={index < stage ? "done" : index === stage ? "here" : undefined}
                  aria-current={index === stage ? "step" : undefined}
                >
                  <span className="dot" aria-hidden="true" />
                  <span className="dot-label">{step.label}</span>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </header>
      <main className="funnel">{children}</main>
      <footer className="fineprint">
        Wrenfield Mutual · Homeowner's insurance · Figures are illustrative, not an offer.
      </footer>
    </div>
  );
}

/** An abstract house: circles and a roof line, in the brand's sky and sun. */
export function Illustration() {
  return (
    <svg className="art" viewBox="0 0 240 150" aria-hidden="true">
      <circle cx="70" cy="80" r="62" fill="var(--sky-soft)" />
      <circle cx="182" cy="44" r="26" fill="var(--sun)" />
      <path d="M60 104 120 52l60 52v34H60z" fill="var(--sky)" />
      <rect x="106" y="108" width="28" height="30" rx="14" fill="var(--sun)" />
      <path d="M30 138h190" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** A refusal from Alex's pod, shown as such. */
export function Refusal({ status, children }: { status: number; children: ReactNode }) {
  return (
    <div className="refusal" role="status">
      <strong>Refused by Alex's pod ({status})</strong>
      <p>{children}</p>
    </div>
  );
}
