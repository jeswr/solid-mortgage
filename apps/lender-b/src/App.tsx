// AUTHORED-BY Claude Opus 5.5
/**
 * Copperfield Mortgage (design.md §b.3): a rate-quote landing page. One bold hero, one call to
 * action, then the result and an honest account of what Copperfield received.
 */
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { org } from "./org.ts";
import { HomePage } from "./pages/Home.tsx";
import { ReceivedPage } from "./pages/Received.tsx";
import { ResultPage } from "./pages/Result.tsx";

export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV = [
  { href: "/", label: "Pre-qualify" },
  { href: "/result", label: "Your result" },
  { href: "/received", label: "What we received" },
] as const;

function Bar() {
  const [location] = useLocation();
  return (
    <header className="bar">
      <Link href="/" className="wordmark" aria-label="Copperfield Mortgage, home">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <path
            d="M23 10.5A8 8 0 1 0 23 21.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
          />
        </svg>
        Copperfield
      </Link>
      <nav aria-label="Copperfield">
        <ul>
          {NAV.map((item) => (
            <li key={item.href}>
              <Link href={item.href} aria-current={location === item.href ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      <Bar />
      <main id="main">{children}</main>
      <footer className="footer">
        <p>Copperfield Mortgage · pre-qualification is not a commitment to lend.</p>
        <a href={appUrl("welcome")}>All demo apps</a>
      </footer>
    </>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Not found"), []);
  return (
    <section className="band">
      <h1 className="display">Nothing here.</h1>
      <p>
        <Link href="/">Check if you pre-qualify</Link>
      </p>
    </section>
  );
}

export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Frame>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/result" component={ResultPage} />
            <Route path="/received" component={ReceivedPage} />
            <Route component={NotFound} />
          </Switch>
        </Frame>
      </Router>
    </DemoTrust>
  );
}
