// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { Icon } from "./components.tsx";
import { org } from "./org.ts";
import { usePods } from "./pods.tsx";
import { Dashboard } from "./screens/Dashboard.tsx";
import { Pay } from "./screens/Pay.tsx";
import { Share } from "./screens/Share.tsx";
import { Verifications } from "./screens/Verifications.tsx";

/** The router base: Vite's `base` without its trailing slash ("/payroll"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV = [
  { href: "/", icon: "home", label: "Dashboard" },
  { href: "/pay", icon: "pay", label: "Pay" },
  { href: "/share", icon: "share", label: "Share" },
  { href: "/verifications", icon: "shield", label: "Verifications" },
] as const;

function Rail() {
  const [location] = useLocation();
  return (
    <nav className="rail" aria-label="Ledgerly">
      <span className="mark" aria-hidden="true">
        L
      </span>
      <ul>
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="rail-link"
              aria-current={location === item.href ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Not found"), []);
  return (
    <div className="page">
      <h1>We could not find that page</h1>
      <p>
        <Link href="/">Back to your dashboard</Link>
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
        <div className="shell">
          <Rail />
          <div className="workspace">
            <header className="topbar">
              <span className="brand">
                Ledgerly <span className="brand-sub">Payroll</span>
              </span>
              <span className="employer">Northfield Engineering</span>
              <a className="all-apps" href={appUrl("welcome")}>
                All demo apps
              </a>
            </header>
            <main id="main">
              <Connecting />
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/pay" component={Pay} />
                <Route path="/share" component={Share} />
                <Route path="/verifications" component={Verifications} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </Router>
    </DemoTrust>
  );
}
