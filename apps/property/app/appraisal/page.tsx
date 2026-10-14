import { AppShell, HonestyPanel, headerNavLinkClass, orgThemes } from "@mortgage/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { IssueFlow } from "../../components/issue-flow";
import { appraisalDemoPreview } from "../../lib/server/issue";
import { appraisalBrand } from "../site";

export const metadata: Metadata = {
  title: `${appraisalBrand.appName} — Concept Demo (not ${appraisalBrand.organization})`,
};

/**
 * The appraisal flow (modelled on Cotality). The appraised value is a DISCLOSED,
 * signed claim (decision 0005) — it is shown in the clear and written into the
 * pod as a plain `schema:value`, never wrapped in a zero-knowledge operand
 * anchor. The only gate is a plain arithmetic consistency check.
 */
export default function AppraisalPage() {
  return (
    <AppShell
      appName={appraisalBrand.appName}
      headerActions={
        <nav aria-label="Property services">
          <Link className={headerNavLinkClass} href="/">
            All property services
          </Link>
        </nav>
      }
      theme={orgThemes["property-appraisal"]}
    >
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Appraisal
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Review the appraisal
        </h1>
        <p className="mt-4 text-muted-foreground">
          The appraised value is shown in the credential, so it is never proved in zero-knowledge.
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
                  The credential is checked against its data shape, then signed with{" "}
                  <code>eddsa-rdfc-2022</code>.
                </li>
                <li>The status list entry, used only to revoke the credential.</li>
                <li>
                  The write to the borrower&apos;s own pod, authorised by their Solid sign-in.
                </li>
              </ul>
            }
            simulated={
              <ul className="list-disc pl-5">
                <li>The appraiser, the property and all figures.</li>
                <li>
                  The organisation&apos;s involvement: this is not {appraisalBrand.organization}.
                </li>
                <li>Sign-in is simulated here, so the record above is a preview.</li>
              </ul>
            }
          />
        </div>
      </main>
    </AppShell>
  );
}
