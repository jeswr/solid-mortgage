// AUTHORED-BY Claude Opus 5.5
import { ORGS } from "@mortgage/content/orgs";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect, useState } from "react";
import { ErrorNote, Refusal } from "../components.tsx";
import { checkAuthorisation, loadOrders, type Order } from "../data.ts";
import { org } from "../org.ts";
import { usePodData, usePods } from "../pods.tsx";
import { organisationOf, podAnswer, podPath, stamp } from "../view.ts";

function delivered(order: Order): string {
  if (order.report !== undefined) return `Delivered ${stamp(order.report.issued)}`;
  return order.taken ? "In progress" : "Not started";
}

/** Quillon checks an order's authorisation at source, on demand. */
function AuthorisationCheck({ url }: { url: string }) {
  const pods = usePods();
  const [status, setStatus] = useState<number | undefined>();
  return (
    <>
      <button
        type="button"
        className="small"
        aria-label={`Check at source: ${podPath(url)}`}
        disabled={pods === null}
        onClick={async () => {
          if (pods !== null) setStatus(await checkAuthorisation(pods.world(), url));
        }}
      >
        Check at source
      </button>
      {status === undefined ? null : status === 403 || status === 401 ? (
        <Refusal status={status} what="authorisation" />
      ) : (
        <p role="status">{podAnswer(status, "authorisation")}</p>
      )}
    </>
  );
}

/** The business view: lenders' report orders, as the order desk sees them. */
export function Orders() {
  useEffect(() => applyDocumentMeta(org, "Orders"), []);
  const pods = usePods();
  const orders = usePodData((p) => loadOrders(p.world()));
  const origin = pods?.world().podOrigin ?? "";
  const nameOf = (webid: string) => organisationOf(webid, ORGS, origin);
  return (
    <div className="page wide">
      <h1>Orders</h1>
      <p>
        Report orders from lenders, read from Quillon's inbox. A report goes from Quillon to the
        lender. It does not pass through the consumer's pod.
      </p>
      {orders.state === "waiting" ? <p role="status">Loading.</p> : null}
      {orders.state === "failed" ? <ErrorNote error={orders.error} /> : null}
      {orders.state === "ready" && orders.data.length === 0 ? <p>No orders.</p> : null}
      {orders.state === "ready" && orders.data.length > 0 ? (
        <div className="table-wrap">
          <table className="orders">
            <caption>Credit report orders</caption>
            <thead>
              <tr>
                <th scope="col">Received</th>
                <th scope="col">Lender</th>
                <th scope="col">Loan</th>
                <th scope="col">Permissible purpose</th>
                <th scope="col">Authorisation</th>
                <th scope="col">Report</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((order) => (
                <tr key={order.url}>
                  <td>{stamp(order.received)}</td>
                  <th scope="row">{nameOf(order.from)}</th>
                  <td>{order.loanNumber ?? "none"}</td>
                  <td>{order.report?.permissiblePurpose ?? "Not yet assessed"}</td>
                  <td>
                    {order.authorisation === undefined ? (
                      "None named"
                    ) : (
                      <>
                        <span className="mono">{podPath(order.authorisation)}</span>
                        <AuthorisationCheck url={order.authorisation} />
                      </>
                    )}
                  </td>
                  <td>
                    {order.report === undefined ? (
                      "none"
                    ) : (
                      <>
                        {order.report.reportNumber}
                        <span className="sub">
                          Tri-merge: {order.report.scores.map((score) => score.score).join(", ")}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{delivered(order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
