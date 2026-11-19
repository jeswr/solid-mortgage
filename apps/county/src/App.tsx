// AUTHORED-BY Claude Opus 5.5
import { DAY } from "@mortgage/content/mortgage/facts";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useSearch } from "wouter";
import { CatchUp, OutcomeNote, Refusal } from "./components.tsx";
import {
  probeQueueAnonymously,
  type RecordView,
  readRecord,
  readRegister,
  readSubmissions,
  urls,
} from "./data.ts";
import { org } from "./org.ts";
import { journey, useAction, useCatchUp, usePodState, worldOn } from "./runtime.ts";
import { sections } from "./sections/index.ts";
import { matches, recordedOn, type SearchField } from "./view.ts";

/** The router base: Vite's `base` without its trailing slash ("/county"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Crumbs({ trail }: { trail: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        <li>
          <Link href="/">Recorder's Office</Link>
        </li>
        {trail.map((crumb) => (
          <li key={crumb.label}>
            {crumb.href === undefined ? (
              <span aria-current="page">{crumb.label}</span>
            ) : (
              <Link href={crumb.href}>{crumb.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Page({
  title,
  trail,
  children,
}: {
  title: string;
  trail: { href?: string; label: string }[];
  children: ReactNode;
}) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return (
    <>
      <Crumbs trail={trail} />
      <h1>{title}</h1>
      {children}
    </>
  );
}

function Home() {
  useEffect(() => applyDocumentMeta(org), []);
  return (
    <>
      <h1>Recorder's Office</h1>
      <p>
        The Recorder keeps the public land records of Marlow County: deeds, mortgages, releases and
        plats. Recorded documents are public records and anyone may search them.
      </p>
      <ul className="link-list">
        <li>
          <Link href="/search">Search recorded documents</Link> — by name, parcel number or
          instrument number. No account needed.
        </li>
        <li>
          <Link href="/intake">eRecording intake</Link> — submissions from settlement agents, for
          recording staff.
        </li>
      </ul>
      <h2>Office hours</h2>
      <p>Monday to Friday, 8:00 a.m. to 4:30 p.m. Closed on federal holidays.</p>
    </>
  );
}

function Intake() {
  const queue = usePodState(async () => {
    const [submissions, register] = await Promise.all([readSubmissions(), readRegister()]);
    return { register, submissions };
  }, ["county"]);
  const action = useAction();
  const catchingUp = useCatchUp().running;
  const value = queue.outcome.state === "ok" ? queue.outcome.value : undefined;
  const recorded = value !== undefined && value.register.length > 0;
  return (
    <Page title="eRecording intake" trail={[{ label: "eRecording intake" }]}>
      <p>
        Signed in as {org.persona?.name}. Settlement agents submit deeds and mortgages
        electronically; recording staff review each package and record it.
      </p>
      <OutcomeNote outcome={queue.outcome} />
      {value === undefined ? null : (
        <>
          <h2>Submissions received</h2>
          <table className="bordered">
            <caption className="sr-only">eRecording submissions</caption>
            <thead>
              <tr>
                <th scope="col">Received (UTC)</th>
                <th scope="col">Submitter</th>
                <th scope="col">Package</th>
              </tr>
            </thead>
            <tbody>
              {value.submissions.length === 0 ? (
                <tr>
                  <td colSpan={3}>No submissions in the queue.</td>
                </tr>
              ) : (
                value.submissions.map((submission) => (
                  <tr key={submission.url}>
                    <td>{recordedOn(submission.received)}</td>
                    <td>{submission.from}</td>
                    <td>{submission.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="record-box">
            <h2>Record the package from Sextant Title &amp; Escrow</h2>
            <p>
              Recording assigns each instrument a number and enters it in the public register. The
              county reads nothing from the buyer's own data store: the register is public by law.
            </p>
            <button
              type="button"
              className="gov-button"
              data-tour="county-record"
              disabled={recorded || catchingUp || action.outcome.state === "running"}
              onClick={() =>
                action.run(async () =>
                  (await journey()).recordWithCounty(await worldOn(DAY.closing)),
                )
              }
            >
              {action.outcome.state === "running" ? "Recording…" : recorded ? "Recorded" : "Record"}
            </button>
            <OutcomeNote outcome={action.outcome} />
          </div>
          {recorded ? (
            <>
              <h2>Instruments recorded</h2>
              <RecordTable records={value.register} />
            </>
          ) : null}
          <CatchUp
            needed={!recorded}
            step="county-record"
            label="In the journey the package arrives after the closing (step 18). Recording before the signing would put the steps out of order."
          />
        </>
      )}
    </Page>
  );
}

function RecordTable({ records }: { records: RecordView[] }) {
  return (
    <table className="bordered">
      <caption className="sr-only">Recorded instruments</caption>
      <thead>
        <tr>
          <th scope="col">Instrument number</th>
          <th scope="col">Document type</th>
          <th scope="col">Recorded (UTC)</th>
          <th scope="col">Grantor</th>
          <th scope="col">Grantee</th>
          <th scope="col">Parcel</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.reference}>
            <td>
              <Link href={`/records/${record.reference}`}>{record.reference}</Link>
            </td>
            <td>{record.name}</td>
            <td>{recordedOn(record.recordedAt)}</td>
            <td>{record.grantors.join("; ")}</td>
            <td>{record.grantees.join("; ")}</td>
            <td>{record.parcel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const FIELDS: { value: SearchField; label: string }[] = [
  { label: "Any field", value: "any" },
  { label: "Grantor or grantee name", value: "name" },
  { label: "Parcel number", value: "parcel" },
  { label: "Instrument number", value: "instrument" },
];

function Search() {
  const params = new URLSearchParams(useSearch());
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [field, setField] = useState<SearchField>((params.get("field") as SearchField) ?? "any");
  const [submitted, setSubmitted] = useState({ field, query });
  const register = usePodState(() => readRegister(), ["county"]);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted({ field, query });
  };
  const results =
    register.outcome.state === "ok"
      ? register.outcome.value.filter((record) => matches(record, submitted.query, submitted.field))
      : [];
  return (
    <Page title="Search recorded documents" trail={[{ label: "Search" }]}>
      <p className="public-note">
        Public records. This search reads the county register without signing in, as any member of
        the public would.
      </p>
      <form className="search-form" onSubmit={onSubmit}>
        <div className="form-row">
          <label htmlFor="q">Search for</label>
          <input
            id="q"
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="field">Search in</label>
          <select
            id="field"
            name="field"
            value={field}
            onChange={(event) => setField(event.target.value as SearchField)}
          >
            {FIELDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="gov-button">
          Search
        </button>
      </form>
      <OutcomeNote outcome={register.outcome} />
      {register.outcome.state === "ok" ? (
        <>
          <p role="status">
            {results.length} {results.length === 1 ? "document" : "documents"} found
            {submitted.query.trim() === "" ? "" : ` for “${submitted.query.trim()}”`}.
          </p>
          {results.length > 0 ? <RecordTable records={results} /> : null}
        </>
      ) : null}
      <PrivateQueue />
    </Page>
  );
}

/** What the public cannot read: the clerk's eRecording queue, asked for without signing in. */
function PrivateQueue() {
  const probe = useAction();
  const [status, setStatus] = useState<number>();
  return (
    <section className="private-note" aria-labelledby="private-heading">
      <h2 id="private-heading">Not public</h2>
      <p>
        Submissions waiting in the eRecording queue are not public records until they are recorded.
      </p>
      <button
        type="button"
        className="secondary"
        disabled={probe.outcome.state === "running"}
        onClick={() =>
          probe.run(async () => {
            setStatus(await probeQueueAnonymously());
          })
        }
      >
        Try to open the eRecording queue without signing in
      </button>
      {status === undefined ? null : status === 401 || status === 403 ? (
        <Refusal
          status={status}
          method="GET"
          url={urls.inbox()}
          why="Only recording staff may read the queue."
        />
      ) : (
        <p role="status">The pod answered {status}.</p>
      )}
    </section>
  );
}

function RecordDetail({ params }: { params: { reference: string } }) {
  const record = usePodState(() => readRecord(params.reference), ["county"], [params.reference]);
  const title = `Instrument ${params.reference}`;
  return (
    <Page title={title} trail={[{ href: "/search", label: "Search" }, { label: title }]}>
      <OutcomeNote outcome={record.outcome} />
      {record.outcome.state !== "ok" ? null : record.outcome.value === undefined ? (
        <p>No document is recorded under this number.</p>
      ) : (
        <table className="bordered detail">
          <tbody>
            <tr>
              <th scope="row">Document type</th>
              <td>{record.outcome.value.name}</td>
            </tr>
            <tr>
              <th scope="row">Instrument number</th>
              <td>{record.outcome.value.reference}</td>
            </tr>
            <tr>
              <th scope="row">Recorded (UTC)</th>
              <td>{recordedOn(record.outcome.value.recordedAt)}</td>
            </tr>
            <tr>
              <th scope="row">Grantor</th>
              <td>{record.outcome.value.grantors.join("; ")}</td>
            </tr>
            <tr>
              <th scope="row">Grantee</th>
              <td>{record.outcome.value.grantees.join("; ")}</td>
            </tr>
            <tr>
              <th scope="row">Parcel number</th>
              <td>{record.outcome.value.parcel}</td>
            </tr>
          </tbody>
        </table>
      )}
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found" trail={[{ label: "Page not found" }]}>
      <p>
        The page you requested does not exist. <Link href="/">Return to the Recorder's Office</Link>
        .
      </p>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <header className="gov-header">
          <div className="gov-inner">
            <p className="gov-name">
              <Link href="/">Marlow County, Ohio</Link>
            </p>
            <p className="gov-office">Office of the County Recorder</p>
          </div>
          <nav aria-label="County" className="gov-nav">
            <ul className="gov-inner">
              <li>
                <Link href="/">Recorder home</Link>
              </li>
              <li>
                <Link href="/search">Search records</Link>
              </li>
              <li>
                <Link href="/intake">eRecording intake</Link>
              </li>
              <li>
                <a href={appUrl("welcome")}>All demo apps</a>
              </li>
            </ul>
          </nav>
        </header>
        <main className="gov-inner gov-main">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/intake" component={Intake} />
            <Route path="/search" component={Search} />
            <Route path="/records/:reference" component={RecordDetail} />
            {sections.map((section) => (
              <Route key={section.path} path={`/${section.path}`} component={section.Component} />
            ))}
            <Route component={NotFound} />
          </Switch>
        </main>
        <footer className="gov-footer">
          <p className="gov-inner">Marlow County Recorder · 100 Courthouse Square · Marlow, OH</p>
        </footer>
      </Router>
    </DemoTrust>
  );
}
