import { AppShell, HonestyPanel, headerNavLinkClass, orgThemes } from "@mortgage/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { IssueFlow } from "../../components/issue-flow";
import { titleDemoPreview } from "../../lib/server/issue";
import { titleBrand } from "../site";

export const metadata: Metadata = {
  title: `${titleBrand.appName} — Concept Demo (not ${titleBrand.organization})`,
};

/**
 * The title flow (modelled on First American): issue a TitleClearCredential
 * recording the clear/clouded outcome of a public-records search into the
 * borrower's pod.
 */
export default function TitlePage() {
  return (
    <AppShell
      appName={titleBrand.appName}
      headerActions={
        <nav aria-label="Property services">
          <Link className={headerNavLinkClass} href="/">
            All property services
          </Link>
        </nav>
      }
      theme={orgThemes["property-title"]}
    >
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Review the simulated title search result
        </h1>
        <p className="mt-4 text-muted-foreground">
          Simulated title search result. It is not a title commitment or policy.
        </p>
        <div className="mt-6">
          <IssueFlow
            apiBase="/property/api"
            brand="title"
            orgLabel={titleBrand.organization}
            preview={titleDemoPreview()}
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
                <li>The property and the search outcome.</li>
                <li>The organisation&apos;s involvement: this is not {titleBrand.organization}.</li>
                <li>
                  When issuance is unavailable in this mode, the record above stays a preview.
                </li>
              </ul>
            }
          />
        </div>
      </main>
    </AppShell>
  );
}
