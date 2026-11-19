// AUTHORED-BY Claude Opus 5.5
/**
 * Halyard LEI Services, a fictional business register (business KYB demo, flows.md section 3,
 * steps 2, 3, 4 and 9). Search-first: the home page is a search of the register; an entity's
 * record is three tabs of definition lists (entity, officers, ownership), each with the credential
 * the register signs into the entity's own pod. Identifiers are set in monospace.
 */
import {
  ENTITY,
  OFFICERS,
  OWNERS_AFTER,
  OWNERS_BEFORE,
  type Owner,
  percent,
} from "@mortgage/content/business-kyb/facts";
import type { RegisterCredential } from "@mortgage/content/business-kyb/register";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { org } from "./org.ts";
import {
  journey,
  type Outcome,
  register,
  registryWorld,
  useAction,
  usePodState,
} from "./runtime.ts";

/** The router base: Vite's `base` without its trailing slash ("/registry"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LEGAL_FORM_WORDS: Record<string, string> = {
  Corp: "Corporation",
  LLC: "Limited liability company",
  LLP: "Limited liability partnership",
};

function Mast() {
  return (
    <header className="mast">
      <div className="mast-inner">
        <p className="mast-name">
          <Link href="/">{org.organisation}</Link>
        </p>
        <p className="mast-sub">Business register · Legal entity identifiers</p>
      </div>
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

// --- Search ------------------------------------------------------------------------------------

const ENTRIES = [
  {
    city: `${ENTITY.address.addressLocality}, ${ENTITY.address.addressRegion}`,
    form: LEGAL_FORM_WORDS[ENTITY.legalForm] ?? ENTITY.legalForm,
    lei: ENTITY.lei,
    name: ENTITY.legalName,
  },
];

function Search() {
  const [query, setQuery] = useState("");
  const words = query.trim().toLowerCase();
  const found = ENTRIES.filter(
    (entry) =>
      words === "" ||
      entry.name.toLowerCase().includes(words) ||
      entry.lei.toLowerCase().includes(words),
  );
  return (
    <Page title="Search the register">
      <p className="lede">
        Signed in as {org.persona?.name}, {org.persona?.role}. Find an entity by legal name or by
        LEI. Every LEI on this register is illustrative: it starts 9999, a prefix no issuer uses.
      </p>
      <search>
        <form className="search" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="register-search">Legal name or LEI</label>
          <input
            id="register-search"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
      </search>
      <ul className="results" aria-label="Results">
        {found.map((entry) => (
          <li key={entry.lei}>
            <Link href="/entity">{entry.name}</Link>
            <p>
              <span className="mono">{entry.lei}</span> · {entry.form} · {entry.city}
            </p>
          </li>
        ))}
        {found.length === 0 ? <li className="muted">No entity matches “{query}”.</li> : null}
      </ul>
      <p className="muted small">
        <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

// --- The record --------------------------------------------------------------------------------

const TABS: [string, string][] = [
  ["/entity", "Entity"],
  ["/officers", "Officers"],
  ["/ownership", "Ownership"],
];

function Tabs() {
  const [location] = useLocation();
  return (
    <nav aria-label="Record" className="tabs">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={location === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Problem({ outcome }: { outcome: Outcome<unknown> }) {
  if (outcome.state === "refused") {
    return (
      <p role="alert" className="alert">
        <strong>Refused by the pod ({outcome.status}).</strong> The register may write into
        Northwind's credentials drawer only through Northwind's own pod rules.
      </p>
    );
  }
  if (outcome.state === "error") {
    return (
      <p role="alert" className="alert">
        {outcome.message}
      </p>
    );
  }
  return null;
}

async function versionsOf(name: RegisterCredential): Promise<number[]> {
  const world = await registryWorld();
  return (await register()).issuedVersions(world, name);
}

function useVersions(name: RegisterCredential) {
  return usePodState(() => versionsOf(name), ["registry"]);
}

function Issued({ versions, label }: { versions: number[]; label: string }) {
  const latest = versions.at(-1);
  if (latest === undefined) {
    return <p className="muted">Not yet issued to Northwind.</p>;
  }
  return (
    <p data-testid={`registry-issued-${label}`}>
      Version {latest} is in Northwind's pod, signed by {org.organisation}.
      {latest > 1
        ? ` Version${latest > 2 ? "s" : ""} ${versions.slice(0, -1).join(", ")} withdrawn on our status list.`
        : ""}
    </p>
  );
}

function IssueButton({
  target,
  label,
  disabled,
  run,
}: {
  target: string;
  label: string;
  disabled: boolean;
  run: () => Promise<unknown>;
}) {
  const action = useAction();
  return (
    <>
      <div className="actions">
        <button
          type="button"
          className="primary"
          data-tour={target}
          disabled={disabled || action.outcome.state === "running"}
          onClick={() => void action.run(run)}
        >
          {action.outcome.state === "running" ? "Signing…" : label}
        </button>
      </div>
      {action.outcome.state === "ok" ? (
        <p role="status" className="ok">
          Signed and written to Northwind's pod.
        </p>
      ) : (
        <Problem outcome={action.outcome as Outcome<unknown>} />
      )}
    </>
  );
}

function Entity() {
  const { outcome, reload } = useVersions("org-identity");
  const versions = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <Page title={ENTITY.legalName}>
      <Tabs />
      <section className="panel" aria-labelledby="entity-heading">
        <h2 id="entity-heading">Entity</h2>
        <dl className="record">
          <dt>Legal name</dt>
          <dd>{ENTITY.legalName}</dd>
          <dt>Legal form</dt>
          <dd>{LEGAL_FORM_WORDS[ENTITY.legalForm]}</dd>
          <dt>Registered address</dt>
          <dd>
            {ENTITY.address.streetAddress}, {ENTITY.address.addressLocality},{" "}
            {ENTITY.address.addressRegion} {ENTITY.address.postalCode}
          </dd>
          <dt>LEI</dt>
          <dd>
            <span className="mono" data-testid="registry-lei">
              {ENTITY.lei}
            </span>{" "}
            <span className="muted small">Illustrative (ISO 17442 shape, prefix 9999)</span>
          </dd>
          <dt>Status</dt>
          <dd>Active</dd>
        </dl>
        <div className="issue">
          <h2>Organisational identity credential</h2>
          {outcome.state === "loading" ? <p role="status">Reading the register…</p> : null}
          <Problem outcome={outcome} />
          {versions !== undefined ? <Issued versions={versions} label="org-identity" /> : null}
          <IssueButton
            target="registry-issue-identity"
            label="Issue identity credential"
            disabled={versions === undefined || versions.length > 0}
            run={async () => {
              await (await journey()).issueIdentity(await registryWorld());
              reload();
            }}
          />
        </div>
      </section>
    </Page>
  );
}

function Officers() {
  const { outcome, reload } = useVersions("officer-authorisation");
  const versions = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <Page title={ENTITY.legalName}>
      <Tabs />
      <section className="panel" aria-labelledby="officers-heading">
        <h2 id="officers-heading">Officers</h2>
        {OFFICERS.map((officer) => (
          <dl className="record" key={officer.name}>
            <dt>Name</dt>
            <dd>{officer.name}</dd>
            <dt>Role</dt>
            <dd>{officer.jobTitle}</dd>
            <dt>May act for the entity</dt>
            <dd>Yes: signatory</dd>
          </dl>
        ))}
        <div className="issue">
          <h2>Officer authorisation credential</h2>
          {outcome.state === "loading" ? <p role="status">Reading the register…</p> : null}
          <Problem outcome={outcome} />
          {versions !== undefined ? (
            <Issued versions={versions} label="officer-authorisation" />
          ) : null}
          <IssueButton
            target="registry-issue-officers"
            label="Issue officer authorisation"
            disabled={versions === undefined || versions.length > 0}
            run={async () => {
              await (await journey()).issueOfficers(await registryWorld());
              reload();
            }}
          />
        </div>
      </section>
    </Page>
  );
}

function OwnersTable({ owners, caption }: { owners: readonly Owner[]; caption: string }) {
  return (
    <table className="table" data-testid="registry-owners">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Owner</th>
          <th scope="col">Share</th>
          <th scope="col">Basis points</th>
        </tr>
      </thead>
      <tbody>
        {owners.map((owner) => (
          <tr key={owner.name}>
            <th scope="row">{owner.name}</th>
            <td>{percent(owner.bps)}</td>
            <td className="num">{owner.bps}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Ownership() {
  const { outcome, reload } = useVersions("beneficial-ownership");
  const versions = outcome.state === "ok" ? outcome.value : undefined;
  const latest = versions?.at(-1) ?? 0;
  const owners = latest >= 2 ? OWNERS_AFTER : OWNERS_BEFORE;
  return (
    <Page title={ENTITY.legalName}>
      <Tabs />
      <section className="panel" aria-labelledby="ownership-heading">
        <h2 id="ownership-heading">Ownership</h2>
        <OwnersTable
          owners={owners}
          caption={latest >= 2 ? "Direct owners, after the recorded transfer" : "Direct owners"}
        />
        <div className="issue">
          <h2>Beneficial ownership credential</h2>
          <p className="muted small">
            Signed with an anchor for zero-knowledge proofs: a commitment to the whole owner table,
            and one per owner holding 25% or more.
          </p>
          {outcome.state === "loading" ? <p role="status">Reading the register…</p> : null}
          <Problem outcome={outcome} />
          {versions !== undefined ? (
            <Issued versions={versions} label="beneficial-ownership" />
          ) : null}
          <IssueButton
            target="registry-issue-ownership"
            label="Issue ownership credential"
            disabled={versions === undefined || versions.length > 0}
            run={async () => {
              await (await journey()).issueOwnership(await registryWorld());
              reload();
            }}
          />
        </div>
      </section>
      {latest >= 1 ? (
        <section className="panel" aria-labelledby="transfer-heading">
          <h2 id="transfer-heading">Recorded transfer</h2>
          <dl className="record">
            <dt>Seller</dt>
            <dd>Marcus Webb, 18%</dd>
            <dt>Buyer</dt>
            <dd>Jordan Blake, from 42% to 60%</dd>
          </dl>
          <div className="issue">
            <p className="muted small">
              Recording it signs a new ownership credential and withdraws the old one on our status
              list. Banks holding a grant read the new one; the old one fails its status check.
            </p>
            <IssueButton
              target="registry-record-sale"
              label="Record the sale"
              disabled={latest !== 1}
              run={async () => {
                await (await journey()).recordSale(await registryWorld());
                reload();
              }}
            />
          </div>
        </section>
      ) : null}
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found">
      <Link href="/">Search the register</Link>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Mast />
        <Switch>
          <Route path="/" component={Search} />
          <Route path="/entity" component={Entity} />
          <Route path="/officers" component={Officers} />
          <Route path="/ownership" component={Ownership} />
          <Route component={NotFound} />
        </Switch>
        <footer className="foot">
          <p>
            {org.organisation} is fictional. Every entity, person and identifier on this register is
            simulated.
          </p>
        </footer>
      </Router>
    </DemoTrust>
  );
}
