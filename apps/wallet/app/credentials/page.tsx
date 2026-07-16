import { CredentialList } from "@/components/credential-list";
import { site } from "../site";

export const metadata = {
  title: `Credential wallet — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 1's payoff surface: the verifications, held as reusable signed
 * credentials in the borrower's own pod, verified fail-closed on view.
 */
export default function CredentialsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 1 · fill the vault
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Credential wallet
      </h1>
      <p className="mt-4 text-muted-foreground">
        Each verification is a W3C verifiable credential in your pod. Opening this page re-runs the
        full fail-closed verification — signature, issuer key binding, validity window, revocation
        status, and shape — against documents served from the pod itself.
      </p>
      <CredentialList />
    </main>
  );
}
