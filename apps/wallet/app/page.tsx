import { HonestyPanel } from "@mortgage/ui";
import { VaultHome } from "@/components/vault-home";
import { site } from "./site";

/**
 * The Data Vault home (scene 1's landing): the borrower's pod, custodied but
 * never readable by the host — the decision-0003 trust inversion, named
 * explicitly in the copy below.
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Solid Mortgage Showcase
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {site.appName}
      </h1>
      <p className="mt-4 text-muted-foreground">
        Your mortgage documents, verifications and consents in a pod you control. The trust
        inversion is the point: a carrier once fined over location-data sharing now custodies a
        vault it <strong>cannot read</strong> — user-held keys, every access consented and
        receipted.
      </p>

      <VaultHome />

      <section aria-labelledby="honesty-heading" className="mt-10">
        <h2 className="sr-only" id="honesty-heading">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>
                The Solid pod serving this vault — a real sparq WASM Solid server running in your
                browser, seeded with the demo persona&apos;s documents.
              </li>
              <li>
                The signed verifiable credentials and their fail-closed verification, the WAC
                access-control documents, and the DPV consent receipts.
              </li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The login: you are bound to a demo persona — no real account, no real PII.</li>
              <li>{site.organization}&apos;s involvement, branding, and any custody product.</li>
              <li>Every organisation, rate and figure across the demo.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
