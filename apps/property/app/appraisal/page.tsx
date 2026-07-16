import { AppShell, HonestyPanel, orgThemes } from "@mortgage/ui";
import type { Metadata } from "next";
import { IssueFlow } from "../../components/issue-flow";
import { appraisalDemoPreview } from "../../lib/server/issue";
import { appraisalBrand } from "../site";

export const metadata: Metadata = {
  title: `${appraisalBrand.appName} — Concept Demo (not ${appraisalBrand.organization})`,
};

/**
 * The Cotality-modelled appraisal flow. The appraised value is a DISCLOSED,
 * signed claim (decision 0005) — it is shown in the clear and written into the
 * pod as a plain `schema:value`, never wrapped in a zero-knowledge operand
 * anchor. The only gate is a plain arithmetic consistency check.
 */
export default function AppraisalPage() {
  return (
    <AppShell appName={appraisalBrand.appName} theme={orgThemes["property-appraisal"]}>
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Property services · appraisal
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Appraise the property and issue the credential
        </h1>
        <p className="mt-4 text-muted-foreground">
          The appraised value is disclosed in the credential and never proved in zero-knowledge —
          you never prove a property of a value the credential reveals anyway (decision 0005).
        </p>
        <div className="mt-6">
          <IssueFlow
            apiBase="/property/api"
            brand="appraisal"
            orgLabel={appraisalBrand.organization}
            preview={appraisalDemoPreview()}
          />
        </div>
        <div className="mt-10">
          <HonestyPanel
            real={
              <ul className="list-disc pl-5">
                <li>
                  The AppraisalCredential is signed with <code>eddsa-rdfc-2022</code> and validated
                  against its SHACL shape before signing.
                </li>
                <li>
                  The appraised value is a disclosed, signed claim (<code>schema:value</code>) —
                  written to your pod in the clear, never a zero-knowledge proof.
                </li>
                <li>The Bitstring status-list entry (revocation only) is real.</li>
                <li>
                  The write is authorised by your own Solid session (WAC) — the pod is derived from
                  your token, never from the request (decision 0015).
                </li>
              </ul>
            }
            simulated={
              <ul className="list-disc pl-5">
                <li>The persona figures, the appraiser identity, and the property.</li>
                <li>Org involvement — this is not {appraisalBrand.organization}.</li>
                <li>
                  In the default in-browser demo there is no real login, so the server issuer rail
                  is off and the figures above are a preview.
                </li>
              </ul>
            }
          />
        </div>
      </main>
    </AppShell>
  );
}
