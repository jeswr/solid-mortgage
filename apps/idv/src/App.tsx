// AUTHORED-BY Claude Opus 5.5
/**
 * Trueline Identity: a phone-first identity funnel (flows.md section 4, step 2). Three camera-frame
 * steps and a progress ring; one check, then a signed identity credential written into Maya's pod
 * under the write-only slot she approves. Trueline keeps a pointer to what it issued, never a copy,
 * and the pod refuses it any read of Maya's credentials.
 */
import { podUrl, statusOf } from "@mortgage/content/mortgage/world";
import { DAY, PERSON } from "@mortgage/content/small-dollar-lending/facts";
import { CREDENTIAL_PATHS } from "@mortgage/content/small-dollar-lending/grants";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import { appWorld, journey, type Outcome, useAction, usePodState } from "./runtime.ts";

/** The router base: Vite's `base` without its trailing slash ("/idv"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** The funnel's three frames, in order. */
export const FRAMES = [
  { label: "Photo ID", note: "Front of a state driver licence, read on this device" },
  { label: "Selfie", note: "Matched to the photo on the licence" },
  { label: "Liveness", note: "A short turn of the head, so a photo of a photo fails" },
] as const;

function Top() {
  return (
    <header className="top">
      <Link href="/" className="mark">
        <span aria-hidden="true" className="mark-dot" />
        {org.organisation}
      </Link>
      <span className="top-note">Verify once. Reuse everywhere.</span>
    </header>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return (
    <main className="screen">
      <h1>{title}</h1>
      {children}
    </main>
  );
}

function Home() {
  return (
    <Page title="Identity, checked once">
      <p className="lede">
        A one-time identity check. The result is a credential in your own pod, signed by{" "}
        {org.organisation}, that any lender can check against our published key. We keep a record
        that we issued it. Not your documents.
      </p>
      <Link href="/check" className="go">
        Start the check
      </Link>
      <p className="small">
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

interface CheckView {
  /** Has Trueline recorded an issuance to Maya? */
  issued: boolean;
  /** The pod's answer when Trueline tries to read the credential it wrote. */
  readBack: number;
}

async function loadCheck(): Promise<CheckView> {
  const world = await appWorld();
  const fetcher = world.fetchAs("idv");
  const issued = (await statusOf(fetcher, podUrl(world, "idv", "issued/maya-identity"))) === 200;
  const readBack = await statusOf(fetcher, podUrl(world, "maya", CREDENTIAL_PATHS.identity));
  return { issued, readBack };
}

/** The progress ring: how many of the three frames are done. */
function Ring({ done }: { done: number }) {
  const r = 26;
  const length = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 64 64" role="img" aria-label={`${done} of 3 steps done`}>
      <circle cx="32" cy="32" r={r} className="ring-track" />
      <circle
        cx="32"
        cy="32"
        r={r}
        className="ring-fill"
        strokeDasharray={`${(length * done) / 3} ${length}`}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" className="ring-text">
        {done}/3
      </text>
    </svg>
  );
}

function Refused({ outcome }: { outcome: Extract<Outcome<unknown>, { state: "refused" }> }) {
  return (
    <p role="alert" className="alert">
      <strong>Refused by the pod ({outcome.status}).</strong> Maya has not approved Trueline's write
      slot.
    </p>
  );
}

function Check() {
  const { outcome, reload } = usePodState(loadCheck, ["idv", "maya"]);
  const verify = useAction();
  const view = outcome.state === "ok" ? outcome.value : undefined;
  const issued = view?.issued === true;
  const done = issued ? 3 : verify.outcome.state === "running" ? 2 : 0;
  return (
    <Page title="Identity check">
      <div className="funnel-head">
        <Ring done={done} />
        <p>
          For <strong>{PERSON.name}</strong>. Three frames, about a minute. Nothing leaves this
          device but the result.
        </p>
      </div>
      {outcome.state === "loading" ? <p role="status">Connecting to the pods…</p> : null}
      {outcome.state === "error" ? (
        <p role="alert" className="alert">
          {outcome.message}
        </p>
      ) : null}
      <ol className="frames">
        {FRAMES.map((frame, index) => (
          <li key={frame.label} className={index < done ? "frame frame-done" : "frame"}>
            <span className="frame-corner" aria-hidden="true" />
            <h2>{frame.label}</h2>
            <p>{frame.note}</p>
            <span className="frame-state">{index < done ? "Matched" : "Waiting"}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="go"
        data-tour="idv-verify"
        disabled={issued || verify.outcome.state === "running"}
        onClick={() =>
          void verify.run(async () => {
            const { verifyIdentity } = await journey();
            await verifyIdentity(await appWorld(DAY.apply));
            reload();
          })
        }
      >
        {verify.outcome.state === "running" ? "Checking…" : issued ? "Verified" : "Verify identity"}
      </button>
      {verify.outcome.state === "refused" ? <Refused outcome={verify.outcome} /> : null}
      {verify.outcome.state === "error" ? (
        <p role="alert" className="alert">
          {verify.outcome.message}
        </p>
      ) : null}
      <section className="result" aria-labelledby="result-heading">
        <h2 id="result-heading">Result</h2>
        {issued ? (
          <p role="status" data-testid="idv-issued">
            Identity credential signed and written to Maya's pod at{" "}
            <code>/{CREDENTIAL_PATHS.identity}</code>. Our own record keeps where it went and its
            digest, not a copy.
          </p>
        ) : (
          <p>No credential issued yet.</p>
        )}
        {view !== undefined ? (
          <p className="small" data-testid="idv-read-back">
            Our read of that credential: the pod answers <strong>{view.readBack}</strong>.{" "}
            {view.readBack === 200
              ? "Readable."
              : "Maya's slot lets us write once; it never lets us read."}
          </p>
        ) : null}
      </section>
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found">
      <Link href="/">Back to the start</Link>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Top />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/check" component={Check} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
