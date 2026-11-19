// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { type ReactNode, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { Icon, type IconName } from "./components/Icon.tsx";
import { org } from "./org.ts";
import { WalletProvider } from "./runtime.tsx";
import { Activity } from "./screens/Activity.tsx";
import { DocumentDetail, Documents } from "./screens/Documents.tsx";
import { Home } from "./screens/Home.tsx";
import { Inbox } from "./screens/Inbox.tsx";
import { Prove } from "./screens/Prove.tsx";
import { Requests } from "./screens/Requests.tsx";
import { Sharing } from "./screens/Sharing.tsx";

/** The router base: Vite's `base` without its trailing slash ("/wallet"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TABS: readonly { href: string; label: string; icon: IconName }[] = [
  { href: "/", icon: "home", label: "Home" },
  { href: "/documents", icon: "cards", label: "Documents" },
  { href: "/requests", icon: "bell", label: "Requests" },
  { href: "/sharing", icon: "key", label: "Sharing" },
  { href: "/inbox", icon: "tray", label: "Inbox" },
];

function TabBar() {
  const [location] = useLocation();
  const active = (href: string) =>
    href === "/" ? location === "/" : location === href || location.startsWith(`${href}/`);
  return (
    <nav className="tabbar" aria-label="Wallet">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="tab"
          aria-current={active(tab.href) ? "page" : undefined}
        >
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** A screen inside the device: its title bar, content and the tab bar. */
export function Screen({
  title,
  page,
  children,
  back,
}: {
  title: string;
  /** The document title's page part; defaults to `title`, `null` for the app's own title. */
  page?: string | null;
  children: ReactNode;
  back?: { href: string; label: string };
}) {
  useEffect(
    () => (page === null ? applyDocumentMeta(org) : applyDocumentMeta(org, page ?? title)),
    [page, title],
  );
  return (
    <>
      <header className="titlebar">
        {back === undefined ? (
          <span className="brand" aria-hidden="true">
            <Icon name="cairn" /> Cairn
          </span>
        ) : (
          <Link href={back.href} className="back">
            <Icon name="chevron-left" /> {back.label}
          </Link>
        )}
        <h1>{title}</h1>
      </header>
      <main className="content" id="main">
        {children}
      </main>
    </>
  );
}

function NotFound() {
  return (
    <Screen title="Nothing here" page="Not found">
      <section className="card">
        <p>This screen is not part of Cairn.</p>
        <Link href="/" className="button primary">
          Go to your pod
        </Link>
      </section>
    </Screen>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook, started }: { hook?: BaseLocationHook; started: Promise<unknown> }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <WalletProvider started={started}>
        <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
          <div className="device">
            <div className="device-screen">
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/documents" component={Documents} />
                <Route path="/documents/:name">
                  {(params) => <DocumentDetail name={params.name} />}
                </Route>
                <Route path="/requests" component={Requests} />
                <Route path="/sharing" component={Sharing} />
                <Route path="/activity" component={Activity} />
                <Route path="/inbox" component={Inbox} />
                <Route path="/prove" component={Prove} />
                <Route component={NotFound} />
              </Switch>
              <TabBar />
            </div>
          </div>
        </Router>
      </WalletProvider>
    </DemoTrust>
  );
}
