// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { useEffect, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";

/** The router base: Vite's `base` without its trailing slash ("/_template"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Home() {
  const [clicked, setClicked] = useState(false);
  useEffect(() => applyDocumentMeta(org), []);
  return (
    <main>
      <h1>App template</h1>
      <p className="muted">
        Copy this app to <code>apps/&lt;slug&gt;</code>, set its slug in <code>vite.config.ts</code>
        , replace <code>src/org.ts</code> with its registry entry and give it its own tokens and
        font.
      </p>
      <section className="card" aria-labelledby="example-heading">
        <h2 id="example-heading">An action the tour can drive</h2>
        <p>
          Every actionable element carries a <code>data-tour</code> name. The tour clicks it for “Do
          it for me”.
        </p>
        <button
          type="button"
          className="primary"
          data-tour="template-example"
          onClick={() => setClicked(true)}
        >
          {clicked ? "Done" : "Try the example action"}
        </button>
      </section>
      <p>
        <Link href="/about">About this template</Link> ·{" "}
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </main>
  );
}

function About() {
  useEffect(() => applyDocumentMeta(org, "About"), []);
  return (
    <main>
      <h1>About this template</h1>
      <p>Routes are relative to the app's base, so links work under any URL mode.</p>
      <Link href="/">Back</Link>
    </main>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Not found"), []);
  return (
    <main>
      <h1>Page not found</h1>
      <Link href="/">Go to the start</Link>
    </main>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
