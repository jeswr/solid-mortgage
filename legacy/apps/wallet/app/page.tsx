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
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {site.appName}
      </h1>
      <p className="mt-4 text-muted-foreground">
        Alex&apos;s pod is a personal data store with access permissions. It holds Alex&apos;s
        mortgage documents and credentials.
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
