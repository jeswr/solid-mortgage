import { HonestyPanel, IllustrativeFigure } from "@mortgage/ui";
import { ZK_HONESTY } from "@mortgage/vc-kit";
import { site } from "../site";

export const metadata = {
  title: `Zero-knowledge pre-qualification — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 2: the lender-side ZK pre-qualification surface. The borrower's
 * wallet proves the two threshold statements against this app's VP-POST rail
 * (`/api/prequal/challenge` + `/api/prequal/verify`); nothing about the
 * hidden values ever reaches this page or those routes.
 */
export default function PrequalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 2 · shop without undressing
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Prove you qualify — without sharing your income or credit score
      </h1>
      <p className="mt-4 text-muted-foreground">
        Your Data Vault presents zero-knowledge proofs of two statements. This lender learns that
        both hold — and nothing else. No credit pull. No documents. No PII stored.
      </p>

      <section aria-labelledby="statements-heading" className="mt-8">
        <h2 id="statements-heading" className="text-xl font-semibold text-foreground">
          What you prove
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
        <p className="mt-3 text-sm text-muted-foreground">
          Qualifying unlocks an illustrative rate quote such as{" "}
          <IllustrativeFigure>6.875%</IllustrativeFigure> — presented only as a sample of the
          shopping experience.
        </p>
      </section>

      <section aria-labelledby="underneath-heading" className="mt-10">
        <h2 id="underneath-heading" className="text-xl font-semibold text-foreground">
          What happens underneath
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Your wallet authenticates with DPoP-bound Solid-OIDC and requests a single-use challenge
            nonce for each statement.
          </li>
          <li>
            The proof is produced in your browser with the sparq <code>filter_int</code> circuits —
            the hidden value never leaves your device.
          </li>
          <li>
            The wallet POSTs each proof together with its issuer-signed operand-anchor credential (a
            bare proof is forgeable; the anchor is what makes it evidence).
          </li>
          <li>
            This lender re-verifies everything server-side, fail closed: challenge, statement,
            anchor signature and revocation status, holder binding, anchor–operand equality, and the
            UltraHonk proof itself. Any failure rejects.
          </li>
        </ol>
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
              <li>The zero-knowledge proofs and their nine-gate server-side verification.</li>
              <li>The single-use challenge nonces and DPoP-bound Solid-OIDC holder binding.</li>
              <li>The issuer-signed operand-anchor credentials and revocation checks.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The lender, its branding, and every rate or figure shown.</li>
              <li>The borrower personas and their credentials.</li>
              <li>Any suggestion of an offer of credit — there is none.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
