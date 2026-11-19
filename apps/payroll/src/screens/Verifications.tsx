// AUTHORED-BY Claude Opus 5.5
import { ORGS } from "@mortgage/content/orgs";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { ErrorNote, IssuanceTable, ReadBack } from "../components.tsx";
import { loadIssuances, loadRefreshRequests } from "../data.ts";
import { org } from "../org.ts";
import { usePodData } from "../pods.tsx";
import { organisationOf, podPath, shortDate } from "../view.ts";

/** Every verification Ledgerly issued, its status-list entry, and refresh requests from lenders. */
export function Verifications() {
  useEffect(() => applyDocumentMeta(org, "Verifications issued"), []);
  const issued = usePodData((p) => loadIssuances(p.world()));
  const requests = usePodData((p) => loadRefreshRequests(p.world()));
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Verifications</p>
        <h1>Verifications issued</h1>
        <p className="lede">
          Ledgerly's own log. Each row is a record of a signature, with the entry in Ledgerly's
          public status list that says whether it still stands. The credentials themselves are in
          your pod.
        </p>
      </header>

      <section className="tile wide" aria-labelledby="log-heading">
        <h2 id="log-heading">Issued</h2>
        {issued.state === "waiting" ? <p className="small">Reading Ledgerly's records…</p> : null}
        {issued.state === "failed" ? <ErrorNote error={issued.error} /> : null}
        {issued.state === "ready" && issued.data.length === 0 ? (
          <p className="empty">Nothing issued yet. Start from Share verified employment.</p>
        ) : null}
        {issued.state === "ready" && issued.data.length > 0 ? (
          <>
            <IssuanceTable issuances={issued.data} />
            <ReadBack />
          </>
        ) : null}
      </section>

      <section className="tile wide" aria-labelledby="refresh-heading">
        <h2 id="refresh-heading">Refresh requests</h2>
        <p className="small">
          A lender may ask for the verification to be re-issued close to closing (your grant G1
          allows it). Ledgerly's back office answers from the payroll record, writes a new
          credential into the same slot and revokes the old one in the status list.
        </p>
        {requests.state === "failed" ? <ErrorNote error={requests.error} /> : null}
        {requests.state === "ready" && requests.data.length === 0 ? (
          <p className="empty">No refresh requests.</p>
        ) : null}
        {requests.state === "ready" && requests.data.length > 0 ? (
          <ul className="requests">
            {requests.data.map((request) => (
              <li key={request.url}>
                <span className={`pill ${request.answered ? "pill-done" : "pill-open"}`}>
                  {request.answered ? "Answered automatically" : "Waiting"}
                </span>
                <span>
                  <strong>{organisationOf(request.from, ORGS, new URL(request.url).origin)}</strong>{" "}
                  · {shortDate(request.published)}
                </span>
                <span>{request.summary}</span>
                <span className="mono small">{request.about.map(podPath).join(", ")}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
