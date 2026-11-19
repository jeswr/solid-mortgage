import { CredentialList } from "@/components/credential-list";
import { site } from "../site";

export const metadata = {
  title: `Credentials — Concept Demo (not ${site.organization})`,
};

/** Scene 1: Alex's verification records, held as signed credentials in the pod and checked on view. */
export default function CredentialsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 1 · Verify income, assets and credit
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Credentials</h1>
      <p className="mt-4 text-muted-foreground">
        A credential is a signed verification record. Data Vault checks each one when you open this
        page. A valid credential is not lender acceptance.
      </p>
      <CredentialList />
    </main>
  );
}
