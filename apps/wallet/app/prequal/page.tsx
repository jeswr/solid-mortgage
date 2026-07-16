import { HonestyPanel, IllustrativeFigure } from "@mortgage/ui";
import { ZK_HONESTY } from "@mortgage/vc-kit";
import { PrequalClient } from "@/components/prequal-client";
import { site } from "../site";

export const metadata = {
  title: `Zero-knowledge pre-qualification — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 2, HOLDER side (decision 0012 rail 1): the vault produces the Tier A
 * proofs in this browser and VP-POSTs them to both competing lenders. The
 * hidden values never leave the device; the lenders learn only that both
 * statements hold.
 */
export default function PrequalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 2 · shop without undressing
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Prove you qualify — to two lenders at once
      </h1>
      <p className="mt-4 text-muted-foreground">
        Your vault proves <IllustrativeFigure>income ≥ $7,000 / month</IllustrativeFigure> and{" "}
        <IllustrativeFigure>credit score ≥ 620</IllustrativeFigure> with zero-knowledge proofs
        produced right here in your browser, from the credentials and issuer-signed operand anchors
        in your pod. No values revealed. No credit pull. No PII left behind.
      </p>

      <PrequalClient />

      <section aria-labelledby="zk-honesty-heading" className="mt-10">
        <h2 className="text-xl font-semibold text-foreground" id="zk-honesty-heading">
          Zero-knowledge honesty panel
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{ZK_HONESTY.headline}</p>
        <dl className="mt-4 space-y-4">
          {ZK_HONESTY.items.map((item) => (
            <div className="rounded-lg border border-border bg-card p-4" key={item.id}>
              <dt className="text-sm font-semibold text-card-foreground">{item.title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="honesty-heading" className="mt-10">
        <h2 className="sr-only" id="honesty-heading">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>
                The UltraHonk proofs — produced in this browser, hidden values as private witness.
              </li>
              <li>
                The issuer-signed operand anchors read from your pod (a bare proof is forgeable).
              </li>
              <li>The single-use challenge nonces minted by each lender&apos;s rail.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The lenders, their branding, and every rate or figure shown.</li>
              <li>
                The login: this in-browser session cannot mint DPoP proofs — the live lender rail
                says so with a 401, honestly surfaced below.
              </li>
              <li>Any suggestion of an offer of credit — there is none.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
