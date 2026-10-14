import { CredentialList } from "@/components/credential-list";
import { site } from "../site";

export const metadata = {
  title: `Verification records — Concept Demo (not ${site.organization})`,
};

/** Scene 1: Alex's verification records, held as signed credentials in the pod and checked on view. */
export default function CredentialsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 1 · Verify income, assets and credit
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Verification records
      </h1>
      <p className="mt-4 text-muted-foreground">
        Each record is a verifiable credential: a digitally signed verification report that any
        party can check without calling the issuer. A valid credential is not lender acceptance.
      </p>
      <CredentialList />
    </main>
  );
}
