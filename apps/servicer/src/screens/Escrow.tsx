// AUTHORED-BY Claude Opus 5.5
import { EscrowAccountStatement } from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { usePodLog } from "../log.ts";
import { podUrl } from "../pods.ts";
import { usePodResource } from "../read.ts";
import { connection, ESCROW_PATH, escrowRows, longDate, usd } from "../view.ts";
import { Outcome } from "./Outcome.tsx";
import { NotConnected, Shell } from "./Shell.tsx";

const asStatement = (url: string, dataset: DatasetCore) =>
  new EscrowAccountStatement(url, dataset, DataFactory);

function Statement({ statement }: { statement: EscrowAccountStatement }) {
  const { rows, yearly } = escrowRows(statement);
  return (
    <section className="panel" aria-labelledby="escrow-heading">
      <p className="kicker">Delivered to your pod · {longDate(statement.issued)}</p>
      <h2 id="escrow-heading">{statement.name}</h2>
      <p className="big">
        {usd(statement.monthlyEscrowPaymentUsd)} <span className="unit">a month into escrow</span>
      </p>
      <div className="table-wrap">
        <table>
          <caption>What your escrow account pays each year</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Per year</th>
              <th scope="col">Per month</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                <td>{usd(row.yearly)}</td>
                <td>{usd(row.monthly)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{usd(yearly)}</td>
              <td>{usd(Math.round((yearly / 12) * 100) / 100)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export function Escrow() {
  const log = usePodLog();
  const connected = connection(log) === "connected";
  const statement = usePodResource(podUrl("alex", ESCROW_PATH), connected, asStatement);
  return (
    <Shell page="Escrow">
      <section className="hero">
        <h1>Escrow: taxes and insurance</h1>
        <p>We pay your property taxes and homeowner's insurance from your escrow account.</p>
      </section>
      {connected ? (
        <Outcome read={statement} what="your escrow statement">
          {(value) => <Statement statement={value} />}
        </Outcome>
      ) : (
        <NotConnected />
      )}
    </Shell>
  );
}
