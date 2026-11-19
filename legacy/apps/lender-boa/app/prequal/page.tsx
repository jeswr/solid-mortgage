import { HonestyPanel, IllustrativeFigure } from "@mortgage/ui";
import { ZK_HONESTY } from "@mortgage/vc-kit";
import { QUOTE_CAUTION } from "../../lib/format";
import { ILLUSTRATIVE_RATE_QUOTE } from "../../lib/server/statements";
import { site } from "../site";

export const metadata = {
  title: `Prequalification — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 2: the lender-side ZK prequalification page. The borrower's wallet
 * proves the two threshold statements against `/api/prequal/challenge` +
 * `/api/prequal/verify`; the hidden values never reach this page or those
 * routes. The decision-0005 limitation items stay on the page, collapsed
 * under "Technical details", with the material privacy limit kept visible.
 */
export default function PrequalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 2 · Check prequalification criteria
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Prequalification criteria
      </h1>
      <p className="mt-4 text-muted-foreground">
        Alex checks the lender's prequalification criteria without sending the exact income or
        credit score.
      </p>

      <section aria-labelledby="statements-heading" className="mt-8">
        <h2 id="statements-heading" className="text-xl font-semibold text-foreground">
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
        <p className="mt-3 text-sm text-muted-foreground">
          If Alex meets both criteria, the lender returns an illustrative rate quote of{" "}
          <IllustrativeFigure>
            {`${ILLUSTRATIVE_RATE_QUOTE.interestRatePercent}%`}
          </IllustrativeFigure>
          . Prequalification is not credit approval or a commitment to lend.
        </p>
        <p className="mt-2 text-sm text-muted-foreground" data-quote-caution="">
          {QUOTE_CAUTION}
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
          <div className="border-t border-border px-4 py-3">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>The Data Vault app signs in and gets a single-use challenge per criterion.</li>
              <li>It builds each proof in the browser. The figure stays on the device.</li>
              <li>
                It sends each proof with an issuer-signed credential that ties it to the
                verification provider's data.
              </li>
              <li>
                The lender checks the challenge, signatures, revocation status, sign-in identity and
                the proof. Any failed check rejects the proof.
              </li>
            </ol>
            <h3 className="mt-4 text-sm font-semibold text-card-foreground">Limitations</h3>
            <dl className="mt-2 space-y-3">
              {ZK_HONESTY.items.map((item) => (
                <div key={item.id}>
                  <dt className="text-sm font-semibold text-card-foreground">{item.title}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
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
              <li>Single-use challenges and the sign-in check.</li>
              <li>The issuer-signed credentials and revocation checks.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The lender, its branding, and every rate or figure.</li>
              <li>Alex and Alex's credentials.</li>
              <li>Any offer of credit. There is none.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
