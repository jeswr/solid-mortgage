// AUTHORED-BY Claude Opus 5.5
import { BORROWER } from "@mortgage/content/mortgage/facts";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { org } from "./org.ts";
import { usePods } from "./pods.tsx";
import { AccountDetail } from "./screens/AccountDetail.tsx";
import { Accounts } from "./screens/Accounts.tsx";
import { Connected } from "./screens/Connected.tsx";
import { Share } from "./screens/Share.tsx";

/** The router base: Vite's `base` without its trailing slash ("/bank"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV = [
  {
    href: "/",
    label: "Accounts",
    match: (path: string) => path === "/" || path.startsWith("/accounts"),
  },
  { href: "/share", label: "Share", match: (path: string) => path === "/share" },
  {
    href: "/connected",
    label: "Connected services",
    match: (path: string) => path === "/connected",
  },
] as const;

function TopNav() {
  const [location] = useLocation();
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <Link href="/" className="wordmark" aria-label="Alder Bank, accounts">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M12 3c-3 3-4.5 6-4.5 9a4.5 4.5 0 0 0 9 0c0-3-1.5-6-4.5-9zM12 8v13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          Alder Bank
        </Link>
        <nav aria-label="Online banking">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} aria-current={item.match(location) ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="signed-in">
          <span className="sr-only">Signed in as </span>
          {BORROWER.name}
        </p>
      </div>
    </header>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Page not found"), []);
  return (
    <div className="page">
      <h1>We could not find that page</h1>
      <p>
        <Link href="/">Go to your accounts</Link>
      </p>
    </div>
  );
}

function Connecting() {
  const pods = usePods();
  if (pods !== null) return null;
  return (
    <p className="connecting" role="status">
      Connecting to the pods in this browser…
    </p>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <TopNav />
        <main id="main">
          <Connecting />
          <Switch>
            <Route path="/" component={Accounts} />
            <Route path="/accounts/:last4">
              {(params) => <AccountDetail last4={params.last4} />}
            </Route>
            <Route path="/share" component={Share} />
            <Route path="/connected" component={Connected} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <footer className="footer">
          <p>Alder Bank is fictional. Accounts, balances and transactions are simulated.</p>
          <a href={appUrl("welcome")}>All demo apps</a>
        </footer>
      </Router>
    </DemoTrust>
  );
}
