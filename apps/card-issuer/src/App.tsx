// AUTHORED-BY Claude Opus 5.5
/**
 * Pennant Card (flows.md section 8, steps 2 to 5): one long application form. "Use verified
 * identity" asks Alex's wallet for a one-time read of the bank's statement; "Check identity" reads
 * it once and checks the signature, the status and the scheme's list; the identity part of the
 * form then collapses, prefilled. "Refresh" asks again, and the pod refuses.
 */
import type { VerifiedIdentity } from "@mortgage/content/reusable-kyc/card";
import { SCHEME } from "@mortgage/content/reusable-kyc/facts";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import {
  cardWorld,
  journey,
  type Outcome,
  onReset,
  presenting,
  useAction,
  usePodState,
} from "./runtime.ts";

/** The router base: Vite's `base` without its trailing slash ("/card-issuer"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CARD_NAME = "Pennant Everyday Card";

function Bar() {
  return (
    <header className="bar">
      <div className="bar-inner">
        <Link href="/" className="wordmark">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="mark">
            <path d="M5 3v18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M6.5 4 18 8.5 6.5 13Z" fill="currentColor" />
          </svg>
          {org.short}
        </Link>
        <nav aria-label="Pennant">
          <Link href="/apply">Apply</Link>
        </nav>
      </div>
    </header>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return <main>{children}</main>;
}

function Home() {
  return (
    <Page title={CARD_NAME}>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="card-art" aria-hidden="true">
          <span className="card-art-name">{org.short}</span>
          <span className="card-art-chip" />
          <span className="card-art-number">•••• 0000</span>
        </div>
        <h1 id="hero-heading">The {CARD_NAME}</h1>
        <p className="lede">
          One card, no annual fee. Apply in a few minutes. If your bank has already checked who you
          are, you can use that instead of uploading documents.
        </p>
        <Link href="/apply" className="button primary">
          Apply now
        </Link>
      </section>
      <p className="muted small">
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

// --- The verified identity, kept for this tab ---------------------------------------------------

/**
 * What the statement said, for the prefilled form. Pennant's pod keeps its record of the check
 * (a digest and the outcome); the fields shown here are kept only in this tab, so they survive
 * the trip to the wallet and back. A restart forgets them.
 */
type Claims = NonNullable<VerifiedIdentity["claims"]>;
const CLAIMS_KEY = "pennant:verified-identity";

function loadClaims(): Claims | undefined {
  try {
    const raw = sessionStorage.getItem(CLAIMS_KEY);
    return raw === null ? undefined : (JSON.parse(raw) as Claims);
  } catch {
    return undefined;
  }
}

function saveClaims(claims: Claims | undefined): void {
  try {
    if (claims === undefined) sessionStorage.removeItem(CLAIMS_KEY);
    else sessionStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  } catch {
    // Storage refused: the form simply shows the record of the check without the fields.
  }
}

// --- Reading Pennant's own record --------------------------------------------------------------

interface ApplyView {
  check?: { checkedAt?: Date; signature?: boolean; status?: boolean; sha256: string };
}

async function loadApply(): Promise<ApplyView> {
  const { readCheck } = await import("@mortgage/content/reusable-kyc/card");
  const check = await readCheck(await cardWorld());
  if (check === undefined) return {};
  return {
    check: {
      sha256: check.sha256,
      ...(check.checkedAt === undefined ? {} : { checkedAt: check.checkedAt }),
      ...(check.signatureVerified === undefined ? {} : { signature: check.signatureVerified }),
      ...(check.statusChecked === undefined ? {} : { status: check.statusChecked }),
    },
  };
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

function Refused({
  outcome,
  children,
}: {
  outcome: Extract<Outcome<unknown>, { state: "refused" }>;
  children: ReactNode;
}) {
  return (
    <div role="alert" className="alert">
      <p>
        <strong>Refused by the pod ({outcome.status}).</strong> {children}
      </p>
    </div>
  );
}

const GATES: readonly { key: "signature" | "status" | "listed"; label: string; ok: string }[] = [
  {
    key: "signature",
    label: "Signature",
    ok: "Signed with Alder Bank's key, from its own profile",
  },
  { key: "status", label: "Status", ok: "Not withdrawn on Alder Bank's status list" },
  {
    key: "listed",
    label: "Issuer",
    ok: `Alder Bank is on the ${SCHEME.name} list of issuers Pennant relies on`,
  },
];

function Gates({ result }: { result: VerifiedIdentity["result"] }) {
  return (
    <ul className="gates" aria-label="What Pennant checked">
      {GATES.map((gate) => {
        const passed = result.gates[gate.key] && (gate.key !== "listed" || result.gates.list);
        return (
          <li key={gate.key} className={passed ? "pass" : "fail"} data-gate={gate.key}>
            <strong>{gate.label}</strong>{" "}
            {passed ? gate.ok : (result.errors[0]?.message ?? "Did not pass")}
          </li>
        );
      })}
    </ul>
  );
}

const METHOD_LABEL: Readonly<Record<string, string>> = {
  Documentary: "Documentary check",
  GovernmentList: "Government list check",
  NonDocumentary: "Non-documentary check",
};

/** The long form's identity part: open and empty, or collapsed and prefilled. */
function IdentityFields({ claims, verified }: { claims?: Claims; verified: boolean }) {
  if (verified) {
    return (
      <details className="prefilled" data-testid="card-prefilled">
        <summary>
          <span className="tick" aria-hidden="true">
            ✓
          </span>{" "}
          Identity: prefilled from Alder Bank's statement
        </summary>
        {claims === undefined ? (
          <p className="muted">
            Verified. The details were filled in on the application page; Pennant's record of the
            check is below.
          </p>
        ) : (
          <dl className="claims" data-testid="card-claims">
            <dt>Full name</dt>
            <dd>{claims.name}</dd>
            <dt>Date of birth</dt>
            <dd>{claims.birthDate}</dd>
            <dt>Home address</dt>
            <dd>{claims.address}</dd>
            <dt>Checks</dt>
            <dd>
              <ul className="checks">
                {claims.checks.map((check) => (
                  <li key={`${check.method}-${check.date}`}>
                    {METHOD_LABEL[check.method] ?? check.method}, {check.date}: {check.description}
                  </li>
                ))}
              </ul>
            </dd>
            <dt>Identity document</dt>
            <dd>Not needed. Pennant has no copy of it.</dd>
          </dl>
        )}
      </details>
    );
  }
  return (
    <fieldset className="long-form">
      <legend>Or fill in the form</legend>
      <label>
        Full legal name
        <input name="name" autoComplete="name" />
      </label>
      <label>
        Date of birth
        <input name="birthDate" type="date" autoComplete="bday" />
      </label>
      <label>
        Street address
        <input name="street" autoComplete="street-address" />
      </label>
      <div className="row">
        <label>
          City
          <input name="city" autoComplete="address-level2" />
        </label>
        <label>
          State
          <input name="state" autoComplete="address-level1" />
        </label>
        <label>
          ZIP code
          <input name="zip" autoComplete="postal-code" inputMode="numeric" />
        </label>
      </div>
      <label>
        Identity document
        <select name="document" defaultValue="">
          <option value="" disabled>
            Choose a document
          </option>
          <option>Passport</option>
          <option>Driver licence</option>
          <option>State ID card</option>
        </select>
      </label>
      <label>
        Document number
        <input name="documentNumber" />
      </label>
      <label>
        Photo of the document, front and back
        <input name="documentImages" type="file" multiple disabled />
      </label>
      <p className="muted small">
        Uploads are switched off in this demonstration: the point is not to need them.
      </p>
    </fieldset>
  );
}

function Apply() {
  const { outcome, reload } = usePodState(loadApply, ["card-issuer"]);
  const ask = useAction();
  const check = useAction();
  const refresh = useAction();
  const [result, setResult] = useState<VerifiedIdentity["result"]>();
  const [claims, setClaims] = useState<Claims | undefined>(loadClaims);
  const [refreshed, setRefreshed] = useState<number>();
  useEffect(
    () =>
      onReset(() => {
        saveClaims(undefined);
        setClaims(undefined);
        setResult(undefined);
        setRefreshed(undefined);
      }),
    [],
  );
  const view = outcome.state === "ok" ? outcome.value : undefined;
  const recorded = view?.check;
  const verified = result?.verified ?? (recorded?.signature === true && recorded.status === true);

  const useVerifiedIdentity = (event: MouseEvent<HTMLButtonElement>) => {
    // The tour's cursor clicks with a synthetic event (and the recorder presents): then the
    // wallet approves by itself and comes back. A person approves in the wallet.
    const auto = !event.nativeEvent.isTrusted || presenting();
    void ask.run(async () => {
      const { applyWithVerifiedIdentity } = await journey();
      const request = await applyWithVerifiedIdentity(await cardWorld());
      window.location.assign(
        appUrl("wallet", "kyc/consent", {
          request,
          return: appUrl("card-issuer", "apply"),
          ...(auto ? { auto: "1" } : {}),
        }),
      );
    });
  };

  const checkIdentity = () =>
    void check.run(async () => {
      const { checkVerifiedIdentity } = await journey();
      const identity = await checkVerifiedIdentity(await cardWorld());
      setResult(identity.result);
      if (identity.claims !== undefined) {
        saveClaims(identity.claims);
        setClaims(identity.claims);
      }
      reload();
    });

  const refreshIdentity = () =>
    void refresh.run(async () => {
      const { askAgain } = await journey();
      setRefreshed(await askAgain(await cardWorld()));
    });

  return (
    <Page title="Apply">
      <h1>Apply for the {CARD_NAME}</h1>
      <p className="lede">
        Applying as {org.persona?.name}. Every card issuer must know who it is lending to.
      </p>
      {outcome.state === "loading" ? <p role="status">Connecting to the pods…</p> : null}
      {outcome.state === "error" ? (
        <p role="alert" className="alert">
          {outcome.message}
        </p>
      ) : null}

      <section className="panel" aria-labelledby="identity-heading">
        <h2 id="identity-heading">1. Your identity</h2>
        {verified ? null : (
          <div className="choice">
            <h3>Use a verified identity</h3>
            <p>
              If your bank has already checked who you are, it can sign a statement of those checks.
              Pennant reads it once, with your permission, and checks it. Nothing to upload.
            </p>
            <div className="actions">
              <button
                type="button"
                className="button primary"
                data-tour="card-use-verified-identity"
                disabled={ask.outcome.state === "running"}
                onClick={useVerifiedIdentity}
              >
                {ask.outcome.state === "running" ? "Asking your wallet…" : "Use verified identity"}
              </button>
              <button
                type="button"
                className="button secondary"
                data-tour="card-check-identity"
                disabled={check.outcome.state === "running"}
                onClick={checkIdentity}
              >
                {check.outcome.state === "running" ? "Checking…" : "Check identity"}
              </button>
            </div>
            {ask.outcome.state === "ok" ? (
              <p role="status" className="muted">
                Request sent. Taking you to your wallet…
              </p>
            ) : ask.outcome.state === "refused" ? (
              <Refused outcome={ask.outcome}>Pennant could not deliver its request.</Refused>
            ) : ask.outcome.state === "error" ? (
              <p role="alert" className="alert">
                {ask.outcome.message}
              </p>
            ) : null}
            {check.outcome.state === "refused" ? (
              <Refused outcome={check.outcome}>
                Alex has not let Pennant read the statement. Press Use verified identity and approve
                in the wallet.
              </Refused>
            ) : check.outcome.state === "error" ? (
              <p role="alert" className="alert">
                {check.outcome.message}
              </p>
            ) : null}
          </div>
        )}
        {result !== undefined ? <Gates result={result} /> : null}
        {result !== undefined && !result.verified ? (
          <p role="alert" className="alert" data-testid="card-not-verified">
            The statement did not pass. Pennant will ask for the form instead.
          </p>
        ) : null}
        <IdentityFields verified={verified} {...(claims === undefined ? {} : { claims })} />
      </section>

      {recorded !== undefined ? (
        <section className="panel" aria-labelledby="record-heading">
          <h2 id="record-heading">2. What Pennant keeps</h2>
          <p data-testid="card-record">
            A record of the check in Pennant's own pod, made {when(recorded.checkedAt)}: signature{" "}
            {recorded.signature === true ? "verified" : "not verified"}, status{" "}
            {recorded.status === true ? "checked" : "not checked"}, and a digest of the statement (
            <code>{recorded.sha256.slice(0, 12)}…</code>). Not a copy.
          </p>
          <div className="actions">
            <button
              type="button"
              className="button secondary"
              data-tour="card-refresh-identity"
              disabled={refresh.outcome.state === "running"}
              onClick={refreshIdentity}
            >
              {refresh.outcome.state === "running" ? "Asking again…" : "Refresh"}
            </button>
          </div>
          {refreshed !== undefined && refreshed !== 200 ? (
            <div role="alert" className="alert" data-testid="card-refresh-refused">
              <p>
                <strong>Refused by the pod ({refreshed}).</strong> One-time grant, closed by Alex's
                wallet after Pennant's first read. Pennant keeps its record of the check; it cannot
                read the statement again.
              </p>
            </div>
          ) : refreshed === 200 ? (
            <p role="status" className="ok">
              Read again (200).
            </p>
          ) : refresh.outcome.state === "error" ? (
            <p role="alert" className="alert">
              {refresh.outcome.message}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="panel" aria-labelledby="money-heading">
        <h2 id="money-heading">{recorded === undefined ? "2" : "3"}. Income and housing</h2>
        <label>
          Annual income (USD)
          <input name="income" inputMode="numeric" />
        </label>
        <label>
          Monthly housing payment (USD)
          <input name="housing" inputMode="numeric" />
        </label>
        <p className="muted small">The demonstration ends at the identity check.</p>
      </section>
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found">
      <h1>Page not found</h1>
      <Link href="/">Go to the {CARD_NAME}</Link>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Bar />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/apply" component={Apply} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
