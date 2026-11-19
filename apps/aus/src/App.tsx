// AUTHORED-BY Claude Opus 5.5
/**
 * Castellan Housing Finance: an automated underwriting console. Split view: the casefile list
 * on the left, the selected casefile's report on the right (findings, source checks, delivery).
 * Everything shown is read from Castellan's pod, or from Alex's pod at source under G4's
 * onward clause.
 */
import { DAY } from "@mortgage/content/mortgage/facts";
import { checkAtSource } from "@mortgage/content/mortgage/issuers";
import { ausSourceChecks, CREDENTIALS } from "@mortgage/content/mortgage/journey";
import { PodRequestError } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { ClosingRecord, CredentialPointer, DeliveredDocument } from "@mortgage/data-model";
import { isOrgSlug } from "@mortgage/demo-kit/registry";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { onEvent, podUrl } from "@mortgage/pod-runtime";
import { type ReactNode, useEffect, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useParams } from "wouter";
import { worldOn } from "./demo.ts";
import { org } from "./org.ts";
import { isOk, type Loaded, list, load } from "./pod.ts";
import {
  CASEFILE,
  type CheckColumns,
  checkColumns,
  findingMessages,
  isoDay,
  lastSegment,
  podPath,
  recommendationOf,
} from "./view.ts";

/** The router base: Vite's `base` without its trailing slash ("/aus"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const casefileUrl = (id: string, path = "") => podUrl("aus", `casefiles/${id}/${path}`);

/** Kinds of pod event that change what a screen would read. */
const CHANGES = new Set(["write", "delete", "grant", "revoke"]);

/** Re-run `read` on mount, when `deps` change, and when the pods change. */
function useRead<T>(read: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onEvent((entry) => {
      if (entry.source !== "pod" || !CHANGES.has(entry.kind)) return;
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((current) => current + 1), 250);
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload on version and caller deps
  useEffect(() => {
    let live = true;
    read()
      .then((result) => {
        if (live) setValue(result);
      })
      .catch((error: unknown) => console.error("aus: read failed", error));
    return () => {
      live = false;
    };
  }, [version, ...deps]);
  return value;
}

function Mark({ pass, children }: { pass: boolean; children: ReactNode }) {
  return (
    <span className={pass ? "mark mark-pass" : "mark mark-fail"}>
      <span aria-hidden="true">{pass ? "■" : "✕"}</span> {children}
    </span>
  );
}

function Missing({ loaded, what }: { loaded: Loaded<unknown> | undefined; what: string }) {
  if (loaded === undefined) return <p className="sys">READING {what.toUpperCase()}…</p>;
  if (loaded.state === "ok") return null;
  if (loaded.state === "missing") return <p className="sys">NO {what.toUpperCase()} ON FILE.</p>;
  if (loaded.state === "refused")
    return (
      <p className="sys sys-fail" role="status">
        REFUSED {loaded.status}: the pod would not show {what} to Castellan ({podPath(loaded.url)}).
      </p>
    );
  return (
    <p className="sys sys-fail" role="status">
      ERROR reading {what}: {loaded.message}
    </p>
  );
}

function CasefileList({ current }: { current?: string }) {
  const casefiles = useRead(() => list(podUrl("aus", "casefiles/")), []);
  const ids = isOk(casefiles)
    ? casefiles.value.filter((url) => url.endsWith("/")).map(lastSegment)
    : [];
  return (
    <nav className="list" aria-label="Casefiles">
      <h2 className="list-head">Casefiles</h2>
      <Missing loaded={casefiles} what="casefiles" />
      {isOk(casefiles) && ids.length === 0 && (
        <p className="sys">QUEUE EMPTY. Awaiting submission.</p>
      )}
      <ul>
        {ids.map((id) => (
          <li key={id}>
            <Link
              href={`/casefiles/${id}`}
              className={id === current ? "case case-on" : "case"}
              aria-current={id === current ? "page" : undefined}
            >
              <span className="mono">{id}</span>
              <span className="case-sub">Juniper Home Loans · purchase</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="list-head">Deliveries</h2>
      <ul>
        <li>
          <Link href={`/deliveries/${CASEFILE}`} className="case">
            <span className="mono">{CASEFILE}</span>
            <span className="case-sub">Loan delivery and purchase</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function ReportTabs({ id, on }: { id: string; on: "findings" | "source-checks" }) {
  return (
    <nav className="report-tabs" aria-label="Casefile report">
      <Link
        href={`/casefiles/${id}`}
        className={on === "findings" ? "rt rt-on" : "rt"}
        aria-current={on === "findings" ? "page" : undefined}
      >
        Findings report
      </Link>
      <Link
        href={`/casefiles/${id}/source-checks`}
        className={on === "source-checks" ? "rt rt-on" : "rt"}
        aria-current={on === "source-checks" ? "page" : undefined}
      >
        Source checks
      </Link>
    </nav>
  );
}

function Findings() {
  const { id } = useParams<{ id: string }>();
  useEffect(() => applyDocumentMeta(org, `Casefile ${id}`), [id]);
  const findings = useRead(() => load(casefileUrl(id, "findings"), DeliveredDocument), [id]);
  const messages = isOk(findings) ? findingMessages(findings.value.description) : [];
  const recommendation = isOk(findings) ? recommendationOf(findings.value.description) : undefined;
  return (
    <section className="report" aria-labelledby="report-title">
      <header className="report-head">
        <h1 id="report-title">
          Casefile <span className="mono">{id}</span>
        </h1>
        <ReportTabs id={id} on="findings" />
      </header>
      <Missing loaded={findings} what="findings" />
      {isOk(findings) && (
        <>
          <dl className="kv">
            <dt>Recommendation</dt>
            <dd className="rec">{recommendation ?? "—"}</dd>
            <dt>Findings id</dt>
            <dd className="mono">{findings.value.identifier ?? "—"}</dd>
            <dt>Returned</dt>
            <dd className="mono">{isoDay(findings.value.issued)}</dd>
            <dt>Submitted by</dt>
            <dd>Juniper Home Loans (the lender, not the borrower)</dd>
          </dl>
          <ol className="messages">
            {messages.map((message) => (
              <li key={message.number} className={`msg msg-${message.kind}`}>
                <span className="msg-no mono">{message.number}</span>
                <span className="msg-kind mono">{message.kind.toUpperCase()}</span>
                <span className="msg-text">{message.text}</span>
              </li>
            ))}
          </ol>
          <p className="sys">
            The findings are a recommendation. The lender's underwriter makes the credit decision.
          </p>
        </>
      )}
    </section>
  );
}

const KINDS = Object.fromEntries(
  Object.values(CREDENTIALS).map((entry) => [`/${entry.path}`, entry]),
);

interface Row {
  pointer: Loaded<CredentialPointer>;
  live?:
    | { state: "checked"; columns: CheckColumns; validFrom?: string }
    | { state: "refused"; status: number }
    | { state: "error"; message: string };
}

/** Step 10. Each credential named in the casefile, checked again where it lives. */
function SourceChecks({ day }: { day: number }) {
  const { id } = useParams<{ id: string }>();
  useEffect(() => applyDocumentMeta(org, `Source checks ${id}`), [id]);
  const rows = useRead(async (): Promise<Loaded<Row[]>> => {
    // The tour's step 10 is this look: Castellan reads its own source checks and findings.
    if (id === CASEFILE) await ausSourceChecks(worldOn(DAY.application)).catch(() => undefined);
    const members = await list(casefileUrl(id, "source-checks/"));
    if (!isOk(members)) return members;
    const world = worldOn(day);
    const result: Row[] = [];
    for (const url of members.value) {
      const pointer = await load(url, CredentialPointer);
      if (!isOk(pointer)) {
        result.push({ pointer });
        continue;
      }
      const kind = KINDS[podPath(pointer.value.url)];
      if (kind === undefined) {
        result.push({ live: { message: "unknown credential kind", state: "error" }, pointer });
        continue;
      }
      try {
        const check = await checkAtSource(world, "aus", pointer.value.url, kind.kind, [
          kind.issuer,
        ]);
        result.push({
          live: {
            columns: checkColumns(check.result),
            state: "checked",
            ...(check.result.credential?.validFrom === undefined
              ? {}
              : { validFrom: check.result.credential.validFrom }),
          },
          pointer,
        });
      } catch (error) {
        result.push({
          live:
            error instanceof PodRequestError && (error.status === 401 || error.status === 403)
              ? { state: "refused", status: error.status }
              : { message: error instanceof Error ? error.message : String(error), state: "error" },
          pointer,
        });
      }
    }
    return { state: "ok", url: members.url, value: result };
  }, [id, day]);
  return (
    <section className="report" aria-labelledby="checks-title">
      <header className="report-head">
        <h1 id="checks-title">
          Casefile <span className="mono">{id}</span>: source checks
        </h1>
        <ReportTabs id={id} on="source-checks" />
      </header>
      <p className="sys">
        Castellan does not take the lender's figures. Each credential is fetched where it lives, in
        the borrower's pod, by reference; its signature is checked against the issuer's published
        key and its status against the issuer's status list.
      </p>
      <Missing loaded={rows} what="source checks" />
      {isOk(rows) && (
        <div className="table-wrap">
          <table className="checks" data-tour="aus-source-checks">
            <caption className="visually-hidden">Credentials checked at source</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Credential URL</th>
                <th scope="col">Issuer</th>
                <th scope="col">Signature</th>
                <th scope="col">Status list</th>
                <th scope="col">As of</th>
                <th scope="col">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {rows.value.map((row, index) => (
                <CheckRow key={row.pointer.url} row={row} index={index} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isOk(rows) && rows.value.length === 0 && <p className="sys">NO CREDENTIALS CHECKED YET.</p>}
    </section>
  );
}

function issuerLabel(webid: string): string {
  const owner = /\/pods\/([^/]+)\/profile\/card#me$/.exec(webid)?.[1];
  return owner !== undefined && isOrgSlug(owner) ? ORGS[owner].organisation : webid;
}

function CheckRow({ row, index }: { row: Row; index: number }) {
  const number = String(index + 1).padStart(2, "0");
  if (!isOk(row.pointer))
    return (
      <tr>
        <td className="mono">{number}</td>
        <td colSpan={6}>
          <Missing loaded={row.pointer} what={lastSegment(row.pointer.url)} />
        </td>
      </tr>
    );
  const pointer = row.pointer.value;
  const live = row.live;
  return (
    <tr>
      <td className="mono">{number}</td>
      <td className="mono">{podPath(pointer.url)}</td>
      <td>{issuerLabel(pointer.issuerIri)}</td>
      {live?.state === "checked" ? (
        <>
          <td>
            <Mark pass={live.columns.signature.outcome === "pass"}>
              {live.columns.signature.text}
            </Mark>
          </td>
          <td>
            <Mark pass={live.columns.status.outcome === "pass"}>{live.columns.status.text}</Mark>
          </td>
          <td className="mono">{isoDay(live.validFrom)}</td>
        </>
      ) : live?.state === "refused" ? (
        <td colSpan={3}>
          <Mark pass={false}>
            REFUSED {live.status}: the pod no longer lets Castellan read this credential at source
          </Mark>
        </td>
      ) : (
        <td colSpan={3}>
          <Mark pass={false}>{live?.state === "error" ? live.message : "not checked"}</Mark>
        </td>
      )}
      <td className="mono">
        {isoDay(pointer.checkedAt)} · {pointer.sha256.slice(0, 10)}…
      </td>
    </tr>
  );
}

function Delivery() {
  const { id } = useParams<{ id: string }>();
  useEffect(() => applyDocumentMeta(org, `Delivery ${id}`), [id]);
  const purchase = useRead(() => load(podUrl("aus", `deliveries/${id}`), DeliveredDocument), [id]);
  const record = useRead(
    async () =>
      isOk(purchase)
        ? load(podUrl("lender", `loans/${id}/closing-record`), ClosingRecord)
        : undefined,
    [id, purchase?.state],
  );
  return (
    <section className="report" aria-labelledby="delivery-title">
      <header className="report-head">
        <h1 id="delivery-title">
          Loan delivery <span className="mono">{id}</span>
        </h1>
      </header>
      <p className="sys">
        The closed loan comes from Juniper, organisation to organisation. Nothing here is read from
        the borrower's pod.
      </p>
      <Missing loaded={purchase} what="purchase confirmation" />
      {isOk(purchase) && (
        <dl className="kv">
          <dt>Purchase</dt>
          <dd className="mono">{purchase.value.identifier ?? "—"}</dd>
          <dt>Confirmed</dt>
          <dd className="mono">{isoDay(purchase.value.issued)}</dd>
          <dt>Detail</dt>
          <dd>{purchase.value.description}</dd>
        </dl>
      )}
      {record !== undefined && <Missing loaded={record} what="closing record" />}
      {isOk(record) && (
        <table className="checks">
          <caption>Post-closing dataset (Juniper's closing record, shared with Castellan)</caption>
          <tbody>
            <tr>
              <th scope="row">Principal</th>
              <td className="mono">
                ${record.value.principalAmount.amountValue.toLocaleString("en-US")}
              </td>
            </tr>
            <tr>
              <th scope="row">Rate / term</th>
              <td className="mono">
                {record.value.interestRatePercent}% / {record.value.loanTermMonths} months
              </td>
            </tr>
            <tr>
              <th scope="row">Closed</th>
              <td className="mono">{isoDay(record.value.closingDate)}</td>
            </tr>
            <tr>
              <th scope="row">Recording</th>
              <td className="mono">{record.value.recordingReference}</td>
            </tr>
            <tr>
              <th scope="row">eNote</th>
              <td className="mono">{record.value.eNoteReference}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

function Home() {
  useEffect(() => applyDocumentMeta(org), []);
  return (
    <section className="report" aria-labelledby="home-title">
      <h1 id="home-title">Automated underwriting</h1>
      <p className="sys">
        Select a casefile. Lenders submit casefiles; Castellan returns findings and, after closing,
        buys the loan.
      </p>
    </section>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Not found"), []);
  return (
    <section className="report" aria-labelledby="nf-title">
      <h1 id="nf-title">Page not found</h1>
      <p>
        <Link href="/">Back to the casefiles</Link>
      </p>
    </section>
  );
}

function CurrentList() {
  const params = useParams<{ id?: string }>();
  return <CasefileList {...(params.id === undefined ? {} : { current: params.id })} />;
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook, day = DAY.application }: { hook?: BaseLocationHook; day?: number }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <div className="console">
        <header className="bar">
          <span className="bar-name">Castellan Housing Finance</span>
          <span className="bar-sys mono">AUS / CONSOLE · service account</span>
          <a className="bar-link" href={appUrl("welcome")}>
            All demo apps
          </a>
        </header>
        <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
          <div className="split">
            <Switch>
              <Route path="/casefiles/:id/:rest*" component={CurrentList} />
              <Route path="/casefiles/:id" component={CurrentList} />
              <Route component={CurrentList} />
            </Switch>
            <main id="main" className="pane">
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/casefiles/:id" component={Findings} />
                <Route path="/casefiles/:id/source-checks">
                  <SourceChecks day={day} />
                </Route>
                <Route path="/deliveries/:id" component={Delivery} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </Router>
      </div>
    </DemoTrust>
  );
}
