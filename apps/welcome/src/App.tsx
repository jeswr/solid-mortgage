// AUTHORED-BY Claude Opus 5.5
import { DemoTrust } from "@mortgage/demo-kit/trust";
import { type BaseLocationHook, Route, Router, Switch } from "wouter";
import { Layout } from "./components/Layout.tsx";
import { demoById } from "./demos.ts";
import { Home } from "./pages/Home.tsx";
import { Honesty } from "./pages/Honesty.tsx";
import { Ledger } from "./pages/Ledger.tsx";
import { NotFound } from "./pages/NotFound.tsx";
import { Watch } from "./pages/Watch.tsx";
import { SITE_RECORD } from "./site.ts";

/** The router base: Vite's `base` without its trailing slash ("/welcome"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface AppProps {
  /** Swaps the browser location for another (tests pass wouter's `memoryLocation`). */
  hook?: BaseLocationHook;
  /** Overrides the check for published videos (tests). */
  probe?: (url: string) => Promise<boolean>;
}

export function App({ hook, probe }: AppProps) {
  const probeProp = probe === undefined ? {} : { probe };
  return (
    <DemoTrust org={SITE_RECORD}>
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Layout>
          <Switch>
            <Route path="/">
              <Home {...probeProp} />
            </Route>
            <Route path="/watch/:demo">
              {(params) => {
                const demo = demoById(params.demo);
                return demo === undefined ? <NotFound /> : <Watch demo={demo} {...probeProp} />;
              }}
            </Route>
            <Route path="/honesty" component={Honesty} />
            <Route path="/ledger" component={Ledger} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Router>
    </DemoTrust>
  );
}
