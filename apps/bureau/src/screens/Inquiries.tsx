// AUTHORED-BY Claude Opus 5.5
import { ORGS } from "@mortgage/content/orgs";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { ErrorNote } from "../components.tsx";
import { loadIssuances, loadOrders } from "../data.ts";
import { org } from "../org.ts";
import { usePodData } from "../pods.tsx";
import { inquiries, isoDate, organisationOf } from "../view.ts";

/** Who has looked at the consumer's file, from Quillon's own records. */
export function Inquiries() {
  useEffect(() => applyDocumentMeta(org, "Inquiries"), []);
  const log = usePodData(async (pods) => {
    const world = pods.world();
    const [orders, issued] = await Promise.all([loadOrders(world), loadIssuances(world)]);
    return inquiries(
      orders,
      issued.filter((issuance) => issuance.name === "credit-summary"),
      (webid) => organisationOf(webid, ORGS, world.podOrigin),
    );
  });
  return (
    <div className="page">
      <h1>Inquiries</h1>
      <p>
        Hard inquiries are made by lenders when you apply for credit. Soft inquiries, including your
        own requests, do not affect your score.
      </p>
      {log.state === "waiting" ? <p role="status">Loading.</p> : null}
      {log.state === "failed" ? <ErrorNote error={log.error} /> : null}
      {log.state === "ready" && log.data.length === 0 ? <p>No inquiries on file.</p> : null}
      {log.state === "ready" && log.data.length > 0 ? (
        <div className="table-wrap">
          <table>
            <caption>Inquiries on your file</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Inquirer</th>
                <th scope="col">Type</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {log.data.map((inquiry) => (
                <tr key={`${inquiry.kind}-${inquiry.date.toISOString()}`}>
                  <td>{isoDate(inquiry.date)}</td>
                  <th scope="row">{inquiry.who}</th>
                  <td>{inquiry.kind === "hard" ? "Hard" : "Soft"}</td>
                  <td>{inquiry.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
