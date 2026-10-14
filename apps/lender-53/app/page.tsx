import { HonestyPanel, IllustrativeFigure } from "@mortgage/ui";
import { ZK_HONESTY } from "@mortgage/vc-kit";
import { site } from "./site";

export const metadata = {
  title: `Prequalification — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 2's second lender: proof in, illustrative quote out. The decision-0005
 * limitation items stay on the page, collapsed under "Technical details", with
 * the material privacy limit kept visible.
 */
export default function RateQuotePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 2 · Prequalify without disclosing income or credit score
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Second lender's prequalification criteria
      </h1>
      <p className="mt-4 text-muted-foreground">
        Second lender, modelled on {site.organization}. Alex checks its criteria without sending the
        exact income or credit score.
      </p>

      <section aria-labelledby="criteria-heading" className="mt-8">
        <h2 id="criteria-heading" className="text-xl font-semibold text-foreground">
          Criteria
        </h2>
        <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2">
          <li className="rounded-lg border border-border bg-card p-4" data-statement="income">
            <p className="text-sm text-muted-foreground">Monthly gross income</p>
            <p className="mt-1 text-lg font-semibold text-card-foreground">
              <IllustrativeFigure>$7,000 a month or more</IllustrativeFigure>
            </p>
          </li>
          <li className="rounded-lg border border-border bg-card p-4" data-statement="score">
            <p className="text-sm text-muted-foreground">Credit score</p>
            <p className="mt-1 text-lg font-semibold text-card-foreground">
              <IllustrativeFigure>620 or higher</IllustrativeFigure>
            </p>
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="quote-heading"
        className="mt-8 rounded-lg border border-border bg-card p-5"
      >
        <h2 id="quote-heading" className="text-xl font-semibold text-card-foreground">
          Illustrative rate quote
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before
          choosing a loan.
        </p>
        <p className="mt-3 text-muted-foreground" data-quote-locked="">
          When both proofs pass, this lender returns an illustrative rate quote to the Data Vault
          app. It is not an application or an offer of credit.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Prequalification is not credit approval or a commitment to lend. The demo continues with
          the primary lender.
        </p>
      </section>

      <section aria-labelledby="zk-honesty-heading" className="mt-10">
        <h2 id="zk-honesty-heading" className="text-xl font-semibold text-foreground">
          How the proof works
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Data Vault app sends a zero-knowledge proof for each criterion: a cryptographic proof
          that a figure meets a threshold without revealing the figure.
        </p>
        <p className="mt-2 text-sm font-medium text-foreground" data-zk-limitation="">
          Research prototype: not independently audited. Encoded values may allow a verifier to
          guess the underlying figures.
        </p>
        <details className="mt-4 rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-card-foreground">
            Technical details
          </summary>
          <dl className="space-y-3 border-t border-border px-4 py-3">
            {ZK_HONESTY.items.map((item) => (
              <div key={item.id}>
                <dt className="text-sm font-semibold text-card-foreground">{item.title}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{item.body}</dd>
              </div>
            ))}
          </dl>
        </details>
      </section>

      <section aria-labelledby="honesty-heading" className="mt-10">
        <h2 id="honesty-heading" className="sr-only">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>The zero-knowledge proofs and the lender's server-side checks.</li>
              <li>Single-use challenges, the sign-in check and the issuer-signed credentials.</li>
              <li>This lender takes no application.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The lender, its branding, Alex, and every figure.</li>
              <li>The rate quote. Nothing here is an offer or solicitation.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
