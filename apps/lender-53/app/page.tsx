import { HonestyPanel, IllustrativeFigure } from "@mortgage/ui";
import { ZK_HONESTY } from "@mortgage/vc-kit";
import { site } from "./site";

export const metadata = {
  title: `Competing zero-knowledge rate quote — Concept Demo (not ${site.organization})`,
};

/** Scene 2's deliberately thin second verifier: proof in, quote out. */
export default function RateQuotePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 2 · compare without disclosure
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Get a competing rate quote without sharing your numbers
      </h1>
      <p className="mt-4 text-muted-foreground">
        Present two zero-knowledge proofs from your Data Vault. This shopping surface learns only
        that both thresholds hold. It makes no credit pull, reads no pod data, and stores no PII.
      </p>

      <section aria-labelledby="criteria-heading" className="mt-8">
        <h2 id="criteria-heading" className="text-xl font-semibold text-foreground">
          Pre-qualification criteria
        </h2>
        <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2">
          <li className="rounded-lg border border-border bg-card p-4" data-statement="income">
            <p className="text-sm text-muted-foreground">Monthly gross income</p>
            <p className="mt-1 text-lg font-semibold text-card-foreground">
              <IllustrativeFigure>at least $7,000 / month</IllustrativeFigure>
            </p>
          </li>
          <li className="rounded-lg border border-border bg-card p-4" data-statement="score">
            <p className="text-sm text-muted-foreground">Credit score</p>
            <p className="mt-1 text-lg font-semibold text-card-foreground">
              <IllustrativeFigure>at least 620</IllustrativeFigure>
            </p>
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="quote-heading"
        className="mt-8 rounded-lg border border-border bg-card p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quote unlocked after successful proof
        </p>
        <h2 id="quote-heading" className="mt-1 text-xl font-semibold text-card-foreground">
          30-year fixed concept quote
        </h2>
        <p className="mt-3 text-3xl font-semibold text-primary">
          <IllustrativeFigure>6.000% interest · 6.190% APR</IllustrativeFigure>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The API returns this competing illustrative quote only after both anchored proofs pass.
          This is not an application and not an offer of credit.
        </p>
      </section>

      <section aria-labelledby="zk-honesty-heading" className="mt-10">
        <h2 id="zk-honesty-heading" className="text-xl font-semibold text-foreground">
          Zero-knowledge honesty panel
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{ZK_HONESTY.headline}</p>
        <dl className="mt-4 space-y-4">
          {ZK_HONESTY.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-4">
              <dt className="text-sm font-semibold text-card-foreground">{item.title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="honesty-heading" className="mt-10">
        <h2 id="honesty-heading" className="sr-only">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>Live Tier A proofs and all nine fail-closed server-side verification gates.</li>
              <li>Single-use nonces, DPoP WebID binding, and issuer-signed operand anchors.</li>
              <li>No application flow and no pod read beyond the presented proof material.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The lender, its branding, borrower personas, and every displayed figure.</li>
              <li>The rate quote and any suggestion of an offer or solicitation.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
