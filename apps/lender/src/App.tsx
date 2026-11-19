// AUTHORED-BY Claude Opus 5.5
/**
 * Juniper Home Loans, borrower portal (design.md §b.3): a fintech wizard. A milestone tracker
 * across the top, one roomy panel per stage, generous whitespace.
 */
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { org } from "./org.ts";
import { ApplicationPage } from "./pages/Application.tsx";
import { ClosingPage } from "./pages/Closing.tsx";
import { DisclosuresPage } from "./pages/Disclosures.tsx";
import { ManualPage } from "./pages/Manual.tsx";
import { StartPage } from "./pages/Start.tsx";
import { StatusPage } from "./pages/Status.tsx";

/** The router base: Vite's `base` without its trailing slash ("/lender"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const STAGES = [
  { href: "/", label: "Start" },
  { href: "/application", label: "Application" },
  { href: "/disclosures", label: "Disclosures" },
  { href: "/status", label: "Status" },
  { href: "/closing", label: "Closing" },
] as const;

function Tracker() {
  const [location] = useLocation();
  const current = STAGES.findIndex((stage) =>
    stage.href === "/"
      ? location === "/" || location === "/manual"
      : location.startsWith(stage.href),
  );
  return (
    <nav className="tracker" aria-label="Your loan, step by step">
      <ol>
        {STAGES.map((stage, index) => (
          <li
            key={stage.href}
            className={index === current ? "is-current" : index < current ? "is-past" : undefined}
          >
            <Link href={stage.href} aria-current={index === current ? "step" : undefined}>
              <span className="tracker-dot" aria-hidden="true">
                {index + 1}
              </span>
              <span className="tracker-label">{stage.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="masthead">
        <Link href="/" className="brand" aria-label="Juniper Home Loans, start">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="currentColor" />
            <path
              d="M8 17 16 9l8 8"
              fill="none"
              stroke="var(--sand)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="21" r="3.2" fill="var(--sand)" />
          </svg>
          <span>
            Juniper <span className="brand-sub">Home Loans</span>
          </span>
        </Link>
        <p className="masthead-loan">
          Loan <span className="mono">JHL-1001</span> · 14 Larch Lane
        </p>
      </header>
      <Tracker />
      <main id="main">{children}</main>
      <footer className="foot">
        <a href={appUrl("wallet")}>Your pod (Cairn)</a>
        <a href={appUrl("welcome")}>All demo apps</a>
      </footer>
    </div>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Not found"), []);
  return (
    <section className="panel">
      <h1>We could not find that page</h1>
      <p>
        <Link href="/">Back to the start</Link>
      </p>
    </section>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Shell>
          <Switch>
            <Route path="/" component={StartPage} />
            <Route path="/manual" component={ManualPage} />
            <Route path="/application" component={ApplicationPage} />
            <Route path="/disclosures" component={DisclosuresPage} />
            <Route path="/status" component={StatusPage} />
            <Route path="/closing" component={ClosingPage} />
            <Route component={NotFound} />
          </Switch>
        </Shell>
      </Router>
    </DemoTrust>
  );
}
