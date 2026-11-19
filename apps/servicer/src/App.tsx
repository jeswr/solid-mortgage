// AUTHORED-BY Claude Opus 5.5
import { DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import { Account } from "./screens/Account.tsx";
import { Connect } from "./screens/Connect.tsx";
import { Escrow } from "./screens/Escrow.tsx";
import { Insurance } from "./screens/Insurance.tsx";
import { Shell } from "./screens/Shell.tsx";
import { Welcome } from "./screens/Welcome.tsx";
import { sections } from "./sections/index.ts";

/** The router base: Vite's `base` without its trailing slash ("/servicer"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function NotFound() {
  return (
    <Shell page="Not found">
      <section className="hero">
        <h1>Page not found</h1>
        <p>
          <Link href="/">Go to your account home</Link>
        </p>
      </section>
    </Shell>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Switch>
          <Route path="/" component={Welcome} />
          <Route path="/connect" component={Connect} />
          <Route path="/account" component={Account} />
          <Route path="/escrow" component={Escrow} />
          <Route path="/insurance" component={Insurance} />
          {sections.map((section) => (
            <Route key={section.path} path={`/${section.path}`} component={section.Component} />
          ))}
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
