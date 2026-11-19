// AUTHORED-BY Claude Opus 5.5
import { DemoTrust } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { useEffect } from "react";
import { type BaseLocationHook, Route, Router, Switch } from "wouter";
import { Layout } from "./components/Layout.tsx";
import { FeedbackPage } from "./feedback/FeedbackPage.tsx";
import { applyMeta, SITE_RECORD } from "./site.ts";

/** The router base: Vite's `base` without its trailing slash ("/feedback"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Home({ search }: { search?: string }) {
  useEffect(() => applyMeta(), []);
  return <FeedbackPage {...(search === undefined ? {} : { search })} />;
}

function NotFound() {
  useEffect(() => applyMeta("Not found"), []);
  return (
    <div className="feedback">
      <h1>Page not found</h1>
      <p>
        <a href={appUrl("feedback")}>Give feedback</a> or go{" "}
        <a href={appUrl("welcome")}>back to the demos</a>.
      </p>
    </div>
  );
}

export interface AppProps {
  /** Swaps the browser location for another (tests pass wouter's `memoryLocation`). */
  hook?: BaseLocationHook;
  /** Overrides the query string the page reads (tests). */
  search?: string;
}

export function App({ hook, search }: AppProps) {
  return (
    <DemoTrust org={SITE_RECORD}>
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Layout>
          <Switch>
            <Route path="/">
              <Home {...(search === undefined ? {} : { search })} />
            </Route>
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Router>
    </DemoTrust>
  );
}
