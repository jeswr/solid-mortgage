import { HonestyPanel, IllustrativeFigure } from "@mortgage/ui";
import { ZK_HONESTY } from "@mortgage/vc-kit";
import { PrequalClient } from "@/components/prequal-client";
import { site } from "../site";

export const metadata = {
  title: `Prequalification — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 2, holder side: the Data Vault builds the threshold proofs in this
 * browser and presents them to both lenders. Mechanics and the mandatory
 * decision-0005 limitation items sit in the "Technical details" disclosure;
 * the material privacy limitation stays visible (review H2, M4).
 */
export default function PrequalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 2 · Prequalification
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Check prequalification criteria
      </h1>
      <p className="mt-4 text-muted-foreground">
        Check two lenders&apos; prequalification criteria using proofs derived from Alex&apos;s
        credentials. The demo checks two criteria:
      </p>
      <ul className="mt-2 list-disc pl-5 text-muted-foreground">
        <li>
          <IllustrativeFigure>Income of $7,000 a month or more</IllustrativeFigure>
        </li>
        <li>
          <IllustrativeFigure>Credit score of 620 or higher</IllustrativeFigure>
        </li>
      </ul>

      <p className="mt-6 rounded-lg border border-border bg-card p-4 text-sm" data-zk-limitation="">
        <strong>Prototype limitation:</strong> encoded values may reveal the underlying figures
        through guessing. The cryptography has not been independently audited.
      </p>

      <PrequalClient />

      <details className="mt-6 rounded-lg border border-border bg-card" data-zk-technical="">
        <summary className="cursor-pointer px-4 py-3 font-medium text-card-foreground text-sm">
          Technical details: how the proof works
        </summary>
        <dl className="space-y-4 border-border border-t px-4 py-3">
          {ZK_HONESTY.items.map((item) => (
            <div key={item.id}>
              <dt className="text-sm font-semibold text-card-foreground">{item.title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{item.body}</dd>
            </div>
          ))}
        </dl>
      </details>

      <section aria-labelledby="honesty-heading" className="mt-6">
        <h2 className="sr-only" id="honesty-heading">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>Zero-knowledge proofs generated in this browser.</li>
              <li>Issuer-signed value encodings read from Alex&apos;s pod.</li>
              <li>A single-use challenge from each lender.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The lenders, their branding, and every rate shown.</li>
              <li>
                Sign-in. Without a real sign-in, a lender&apos;s service may refuse the proofs.
              </li>
              <li>Any offer of credit. There is none.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
