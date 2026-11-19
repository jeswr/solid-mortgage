// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ComponentType, useEffect } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch, useLocation } from "wouter";
import { OutcomeNote } from "./components.tsx";
import { FILE_NUMBER, type FileState, readFile } from "./data.ts";
import { org } from "./org.ts";
import {
  ClosingRoom,
  Commitment,
  FILE_PATH,
  flagsOf,
  Ledger,
  Overview,
  Policy,
  Recording,
  TitleSearch,
} from "./pages.tsx";
import { usePodState } from "./runtime.ts";
import { checklist } from "./view.ts";

/** The router base: Vite's `base` without its trailing slash ("/title"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SECTIONS: {
  path: string;
  label: string;
  page: string;
  Component: ComponentType<{ file: FileState }>;
}[] = [
  { Component: Overview, label: "File overview", page: "File overview", path: "" },
  { Component: TitleSearch, label: "Title search", page: "Title search", path: "/search" },
  { Component: Commitment, label: "Commitment", page: "Commitment", path: "/commitment" },
  { Component: ClosingRoom, label: "Closing room", page: "Closing room", path: "/closing" },
  { Component: Ledger, label: "Disbursement ledger", page: "Disbursement ledger", path: "/ledger" },
  { Component: Recording, label: "Recording", page: "Recording", path: "/recording" },
  { Component: Policy, label: "Policies", page: "Policies", path: "/policy" },
];

function FileTree() {
  const [location] = useLocation();
  return (
    <nav aria-label="File" className="tree">
      <p className="tree-root">Files</p>
      <ul>
        <li>
          <span className="tree-folder">{FILE_NUMBER}</span>
          <ul>
            {SECTIONS.map((section) => {
              const href = `${FILE_PATH}${section.path}`;
              return (
                <li key={href}>
                  <Link href={href} aria-current={location === href ? "page" : undefined}>
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      </ul>
    </nav>
  );
}

function Side({ file }: { file: FileState }) {
  const items = checklist(flagsOf(file));
  return (
    <aside className="side" aria-label="Parties and checklist">
      <h2>Parties</h2>
      <dl className="parties">
        <dt>Escrow officer</dt>
        <dd>{org.persona?.name}</dd>
        <dt>Lender</dt>
        <dd>{file.order?.customer ?? "Not yet ordered"}</dd>
        <dt>Buyer</dt>
        <dd>{file.commitment?.proposedInsured[0] ?? "See commitment"}</dd>
        <dt>Seller</dt>
        <dd>{file.commitment?.vestedOwner ?? "See commitment"}</dd>
      </dl>
      <h2>Checklist</h2>
      <ul className="checklist">
        {items.map((item) => (
          <li key={item.label} className={item.done ? "done" : ""}>
            <span aria-hidden="true">{item.done ? "✓" : "○"}</span> {item.label}
            <span className="sr-only">{item.done ? " (done)" : " (open)"}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Room({ section }: { section: (typeof SECTIONS)[number] }) {
  useEffect(() => applyDocumentMeta(org, section.page), [section.page]);
  const file = usePodState(readFile, ["title", "lender", "county"]);
  return (
    <div className="room">
      <FileTree />
      <div className="viewer">
        {file.outcome.state === "ok" ? (
          <section.Component file={file.outcome.value} />
        ) : (
          <article className="paper">
            <OutcomeNote outcome={file.outcome} />
          </article>
        )}
      </div>
      {file.outcome.state === "ok" ? (
        <Side file={file.outcome.value} />
      ) : (
        <aside className="side" />
      )}
    </div>
  );
}

function FileList() {
  useEffect(() => applyDocumentMeta(org, "Open files"), []);
  const file = usePodState(readFile, ["title", "lender"]);
  return (
    <article className="paper narrow">
      <p className="kicker">Sextant Title &amp; Escrow</p>
      <h1>Open files</h1>
      <OutcomeNote outcome={file.outcome} />
      {file.outcome.state === "ok" ? (
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">File</th>
              <th scope="col">Lender</th>
              <th scope="col">Loan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Link href={FILE_PATH}>{FILE_NUMBER}</Link>
              </td>
              <td>{file.outcome.value.order?.customer ?? "Awaiting the lender's order"}</td>
              <td>{file.outcome.value.order?.loanNumber ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </article>
  );
}

function NotFound() {
  useEffect(() => applyDocumentMeta(org, "Not found"), []);
  return (
    <article className="paper narrow">
      <h1>No such document</h1>
      <p>
        <Link href="/">Back to the open files</Link>
      </p>
    </article>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <header className="masthead">
          <Link href="/" className="wordmark">
            Sextant <span>Title &amp; Escrow</span>
          </Link>
          <a href={appUrl("welcome")} className="masthead-out">
            All demo apps
          </a>
        </header>
        <main>
          <Switch>
            <Route path="/" component={FileList} />
            {SECTIONS.map((section) => (
              <Route key={section.path} path={`${FILE_PATH}${section.path}`}>
                <Room section={section} />
              </Route>
            ))}
            <Route component={NotFound} />
          </Switch>
        </main>
      </Router>
    </DemoTrust>
  );
}
