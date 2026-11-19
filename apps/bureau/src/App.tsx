// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { CLERK, org } from "./org.ts";
import { usePods } from "./pods.tsx";
import { Inquiries } from "./screens/Inquiries.tsx";
import { Orders } from "./screens/Orders.tsx";
import { Summary } from "./screens/Summary.tsx";

/** The router base: Vite's `base` without its trailing slash ("/bureau"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Index() {
  useEffect(() => applyDocumentMeta(org, "Consumer disclosures"), []);
  return (
    <div className="page">
      <h1>Consumer disclosures</h1>
      <p>Quillon Credit Bureau keeps credit files and sells credit reports to lenders.</p>
      <ul className="index">
        <li>
          <Link href="/summary">Your credit file summary</Link>. Free; does not affect your score.
        </li>
        <li>
          <Link href="/inquiries">Inquiries on your file</Link>.
        </li>
      </ul>
      <h2>Business</h2>
      <ul className="index">
        <li>
          <Link href="/orders">Report orders</Link>. Order desk.
        </li>
      </ul>
    </div>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Not found"), []);
  return (
    <div className="page">
      <h1>Page not found</h1>
      <p>
        <Link href="/">Consumer disclosures</Link>
      </p>
    </div>
  );
}

function Connecting() {
  const pods = usePods();
  if (pods !== null) return null;
  return <p role="status">Connecting to the pods in this browser.</p>;
}

/** The orders view is the clerk's; every other page is the consumer's (the registry persona). */
function Banner() {
  const [location] = useLocation();
  return location.startsWith("/orders") ? <TrustBanner signedInAs={CLERK} /> : <TrustBanner />;
}

function Header() {
  const [location] = useLocation();
  const business = location.startsWith("/orders");
  return (
    <header className="masthead">
      <p className="name">
        <Link href="/">Quillon Credit Bureau</Link>
      </p>
      <nav aria-label="Quillon">
        <Link href="/summary" aria-current={location === "/summary" ? "page" : undefined}>
          Credit file summary
        </Link>{" "}
        |{" "}
        <Link href="/inquiries" aria-current={location === "/inquiries" ? "page" : undefined}>
          Inquiries
        </Link>{" "}
        |{" "}
        <Link href="/orders" aria-current={business ? "page" : undefined}>
          Orders (business)
        </Link>
      </nav>
    </header>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Banner />
        <div className="sheet">
          <Header />
          <main id="main">
            <Connecting />
            <Switch>
              <Route path="/" component={Index} />
              <Route path="/summary" component={Summary} />
              <Route path="/orders" component={Orders} />
              <Route path="/inquiries" component={Inquiries} />
              <Route component={NotFound} />
            </Switch>
          </main>
          <footer className="footer">
            Quillon Credit Bureau is fictional; every file and figure here is simulated.{" "}
            <a href={appUrl("welcome")}>All demo apps</a>
          </footer>
        </div>
      </Router>
    </DemoTrust>
  );
}
