// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { ORDER_NUMBER } from "./data.ts";
import { org } from "./org.ts";
import { Board, Field, OrderDetail, Review } from "./pages.tsx";

/** The router base: Vite's `base` without its trailing slash ("/appraisal"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ORDER = `/orders/${ORDER_NUMBER}`;
const NAV = [
  { href: "/", label: "Board" },
  { href: ORDER, label: `Order ${ORDER_NUMBER}` },
  { href: `${ORDER}/field`, label: "Field" },
  { href: `${ORDER}/review`, label: "Review" },
] as const;

function Toolbar() {
  const [location] = useLocation();
  return (
    <header className="toolbar">
      <div className="brand">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path d="M12 2v13" stroke="currentColor" strokeWidth="2.5" />
          <path d="M7 15h10l-5 7z" fill="currentColor" />
        </svg>
        <span className="brand-name">Plumbline</span>
        <span className="brand-sub">Dispatch</span>
      </div>
      <nav aria-label="Plumbline">
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
      <a className="toolbar-out" href={appUrl("welcome")}>
        All demo apps
      </a>
    </header>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Not found"), []);
  return (
    <>
      <h1>No such screen</h1>
      <p>
        <Link href="/">Back to the order board</Link>
      </p>
    </>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Toolbar />
        <main className="workspace">
          <Switch>
            <Route path="/" component={Board} />
            <Route path={ORDER} component={OrderDetail} />
            <Route path={`${ORDER}/field`} component={Field} />
            <Route path={`${ORDER}/review`} component={Review} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </Router>
    </DemoTrust>
  );
}
