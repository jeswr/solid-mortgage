// AUTHORED-BY Claude Opus 5.5
import { EMPLOYMENT } from "@mortgage/content/mortgage/facts";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { org } from "../org.ts";
import { usePods } from "../pods.tsx";
import { payslips, shortDate, usd } from "../view.ts";

/** Payslips: Ledgerly's own payroll records. None of this goes to a pod. */
export function Pay() {
  useEffect(() => applyDocumentMeta(org, "Pay"), []);
  const pods = usePods();
  const slips =
    pods === null ? [] : payslips(pods.world().calendar, EMPLOYMENT.monthlyGrossIncomeUsd);
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Pay</p>
        <h1>Payslips</h1>
        <p className="lede">
          These stay with Ledgerly. A verification you share says your base pay, not your payslips.
        </p>
      </header>
      <section className="tile wide" aria-labelledby="slips-heading">
        <h2 id="slips-heading" className="sr-only">
          Payslips
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Paid on</th>
                <th scope="col">Gross pay</th>
              </tr>
            </thead>
            <tbody>
              {slips.map((slip) => (
                <tr key={slip.payDate}>
                  <th scope="row">{slip.period}</th>
                  <td>{shortDate(slip.payDate)}</td>
                  <td>{usd(slip.grossUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
