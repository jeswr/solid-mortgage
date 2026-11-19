// AUTHORED-BY Claude Opus 5.5
import type { AddressRecord } from "@mortgage/content/moving-house/address";
import { streetLine } from "@mortgage/content/moving-house/facts";
import { issuedVersions, readIssuance } from "@mortgage/content/moving-house/issuer";
import { isSmallBusinessLoanPage } from "@mortgage/content/small-business-loan/mount";
import { HOLDERS } from "@mortgage/demo-kit/holders";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { org } from "./org.ts";
import { journey, type Outcome, stateWorld, useAction, usePodState } from "./runtime.ts";
import { sections } from "./sections/index.ts";

/** The router base: Vite's `base` without its trailing slash ("/state"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Band() {
  return (
    <header className="band">
      <div className="band-inner">
        <p className="band-name">{org.organisation}</p>
        <p className="band-sub">Driver Services · Department of Revenue</p>
      </div>
      <nav aria-label="State services" className="band-nav">
        <Link href="/">All services</Link>
        <Link href="/driver-services">Driver Services</Link>
      </nav>
    </header>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

function Home() {
  return (
    <Page title="Online services">
      <p className="lede">
        Signed in as {org.persona?.name}. Services that need your address read it from your pod,
        under the grant you gave us.
      </p>
      <ul className="services">
        <li>
          <h2>
            <Link href="/driver-services">Driver Services</Link>
          </h2>
          <p>Address on your driver licence, and a new licence credential when it changes.</p>
        </li>
        <li>
          <h2>
            <Link href="/revenue">Department of Revenue</Link>
          </h2>
          <p>
            State tax records use the same address on file as Driver Services. There is no separate
            form. Businesses can ask for a tax compliance credential.
          </p>
        </li>
      </ul>
      <p className="muted">
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

interface DriverServicesView {
  copy: AddressRecord | undefined;
  licence: { version: number; issued: Date } | undefined;
}

async function loadDriverServices(): Promise<DriverServicesView> {
  const world = await stateWorld();
  const { stateLooks } = await journey();
  const copy = await stateLooks(world);
  const latest = (await issuedVersions(world)).at(-1);
  const licence =
    latest === undefined
      ? undefined
      : { issued: (await readIssuance(world, latest)).asOf, version: latest };
  return { copy, licence };
}

const when = (date: Date | undefined) =>
  date === undefined
    ? "–"
    : date.toLocaleString("en-US", {
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        timeZone: "UTC",
      });

function Refused({ outcome }: { outcome: Extract<Outcome<unknown>, { state: "refused" }> }) {
  return (
    <div role="alert" className="alert">
      <p>
        <strong>Refused by the pod ({outcome.status}).</strong> Alex has not shared an address with
        Driver Services. Alex chooses who may read it, in Alex's own wallet.
      </p>
    </div>
  );
}

function DriverServices() {
  const { outcome, reload } = usePodState(loadDriverServices, ["state"]);
  const update = useAction();
  const view = outcome.state === "ok" ? outcome.value : undefined;
  const copy = view?.copy;
  const updatable =
    copy !== undefined &&
    view?.licence !== undefined &&
    copy.generatedAt !== undefined &&
    view.licence.issued.getTime() < copy.generatedAt.getTime();
  return (
    <Page title="Driver Services">
      <p className="lede">Your driver licence, and the address it carries.</p>
      {outcome.state === "loading" ? (
        <p role="status">Connecting to the pods…</p>
      ) : outcome.state === "refused" ? (
        <Refused outcome={outcome} />
      ) : outcome.state === "error" ? (
        <p role="alert" className="alert">
          {outcome.message}
        </p>
      ) : null}
      <ol className="steps">
        <li>
          <h2>Address on file</h2>
          {copy === undefined ? (
            <p className="muted">No address on file.</p>
          ) : (
            <>
              <address data-testid="state-address">
                {streetLine(copy.address)}
                <br />
                {copy.address.locality}, {copy.address.region} {copy.address.postalCode}
              </address>
              <p className="provenance">
                Read from Alex's pod at {when(copy.generatedAt)} under grant H1, effective{" "}
                {copy.validFrom}.
              </p>
            </>
          )}
        </li>
        <li>
          <h2>Proof of address</h2>
          {copy === undefined ? (
            <p className="muted">Nothing read.</p>
          ) : (
            <p>
              The recording receipt in Alex's pod links the recorded warranty deed for this address.
              Driver Services read it under the same grant. No document was uploaded.
            </p>
          )}
        </li>
        <li>
          <h2>Licence</h2>
          {view?.licence === undefined ? (
            <p className="muted">No licence on record.</p>
          ) : (
            <p data-testid="state-licence">
              Licence credential version {view.licence.version}, issued {when(view.licence.issued)}.
              {view.licence.version > 1
                ? ` Version ${view.licence.version - 1} is withdrawn on our status list.`
                : ""}
            </p>
          )}
          <button
            type="button"
            className="primary"
            data-tour="state-update-licence"
            disabled={!updatable || update.outcome.state === "running"}
            onClick={() =>
              void update.run(async () => {
                const { stateUpdatesLicence } = await journey();
                await stateUpdatesLicence(await stateWorld());
                reload();
              })
            }
          >
            {update.outcome.state === "running" ? "Signing…" : "Update licence"}
          </button>
          {update.outcome.state === "ok" ? (
            <p role="status" className="ok">
              A new licence credential with this address is in Alex's pod.
            </p>
          ) : update.outcome.state === "refused" ? (
            <Refused outcome={update.outcome} />
          ) : update.outcome.state === "error" ? (
            <p role="alert" className="alert">
              {update.outcome.message}
            </p>
          ) : !updatable && copy !== undefined ? (
            <p className="muted">The licence already carries the address on file.</p>
          ) : null}
        </li>
      </ol>
    </Page>
  );
}

/**
 * The Department of Revenue's business page belongs to the small business loan, whose customer is
 * Northwind (Jordan Blake signs in for it); every other page is Alex's.
 */
function StateTrustBanner() {
  const [location] = useLocation();
  if (!isSmallBusinessLoanPage(`/state${location}`, "state")) return <TrustBanner />;
  const { name, operator } = HOLDERS.northwind;
  return <TrustBanner signedInAs={{ name: operator ?? name, role: `for ${name}` }} />;
}

function NotFound() {
  return (
    <Page title="Page not found">
      <Link href="/">Go to all services</Link>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <StateTrustBanner />
        <Band />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/driver-services" component={DriverServices} />
          {sections.map((section) => (
            <Route key={section.path} path={`/${section.path}`} component={section.Component} />
          ))}
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
