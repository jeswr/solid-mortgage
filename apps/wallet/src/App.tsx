// AUTHORED-BY Claude Opus 5.5
import { DEFAULT_HOLDER, HOLDERS, type HolderId } from "@mortgage/demo-kit/registry";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { type ReactNode, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { Icon, type IconName } from "./components/Icon.tsx";
import { recordHolder } from "./holder.ts";
import { org } from "./org.ts";
import { useWallet, WalletProvider } from "./runtime.tsx";
import { Activity } from "./screens/Activity.tsx";
import { DocumentDetail, Documents } from "./screens/Documents.tsx";
import { Home } from "./screens/Home.tsx";
import { Inbox } from "./screens/Inbox.tsx";
import { Prove } from "./screens/Prove.tsx";
import { Requests } from "./screens/Requests.tsx";
import { Sharing } from "./screens/Sharing.tsx";
import { sections } from "./sections/index.ts";

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

/**
 * The simulated sign-in line: the registry's persona (Alex) while the wallet shows Alex's pod,
 * else the holder it shows ("Jordan Blake, for Northwind Logistics LLC").
 */
function HolderTrustBanner() {
  const { holder } = useWallet();
  if (holder === org.actsAs) return <TrustBanner />;
  const shown = HOLDERS[holder];
  return (
    <TrustBanner
      signedInAs={
        shown.operator === undefined
          ? { name: shown.name }
          : { name: shown.operator, role: `for ${shown.name}` }
      }
    />
  );
}

/** Keeps the shown holder in the address bar as the visitor moves between screens. */
function HolderInUrl({ demoHolder }: { demoHolder: HolderId }) {
  const { holder } = useWallet();
  const [location] = useLocation();
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-record after each route change.
  useEffect(() => recordHolder(holder, demoHolder), [holder, demoHolder, location]);
  return null;
}

/**
 * `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`).
 * `holder` is the holder shown first and `demoHolder` the current demo's (src/holder.ts).
 */
export function App({
  hook,
  started,
  holder = DEFAULT_HOLDER,
  demoHolder = DEFAULT_HOLDER,
}: {
  hook?: BaseLocationHook;
  started: Promise<unknown>;
  holder?: HolderId;
  demoHolder?: HolderId;
}) {
  return (
    <DemoTrust org={org}>
      <WalletProvider started={started} holder={holder}>
        <HolderTrustBanner />
        <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
          {hook === undefined ? <HolderInUrl demoHolder={demoHolder} /> : null}
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
                {sections.map((section) => (
                  <Route
                    key={section.path}
                    path={`/${section.path}`}
                    component={section.Component}
                  />
                ))}
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
