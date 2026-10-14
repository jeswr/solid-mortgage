import { HonestyPanel } from "@mortgage/ui";
import { VaultHome } from "@/components/vault-home";
import { site } from "./site";

/**
 * The Data Vault home: Alex's pod, read live. Copy follows docs/glossary.md
 * (no encryption or ownership claims — access control only).
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
        Alex&apos;s mortgage documents and verification records are stored in a Solid pod: a
        personal data store with access permissions. Choose a section below.
      </p>

      <VaultHome />

      <section aria-labelledby="honesty-heading" className="mt-10">
        <h2 className="sr-only" id="honesty-heading">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>The Solid pod and its demo documents.</li>
              <li>Signed credentials, access control lists and consent records.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>Sign-in. You browse as Alex, with no real personal data.</li>
              <li>{site.organization}&apos;s involvement and branding.</li>
              <li>All organisations and figures.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
