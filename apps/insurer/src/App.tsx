// AUTHORED-BY Claude Opus 5.5
import { DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import { Evidence } from "./screens/Evidence.tsx";
import { Property } from "./screens/Property.tsx";
import { Quote } from "./screens/Quote.tsx";
import { Shell } from "./screens/Shell.tsx";
import { Start } from "./screens/Start.tsx";
import { sections } from "./sections/index.ts";

/** The router base: Vite's `base` without its trailing slash ("/insurer"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function NotFound() {
  return (
    <Shell stage={undefined} page="Not found">
      <h1>We could not find that page</h1>
      <Link href="/" className="cta">
        Back to the start
      </Link>
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
          <Route path="/" component={Start} />
          <Route path="/property" component={Property} />
          <Route path="/quote" component={Quote} />
          <Route path="/evidence" component={Evidence} />
          {sections.map((section) => (
            <Route key={section.path} path={`/${section.path}`} component={section.Component} />
          ))}
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
