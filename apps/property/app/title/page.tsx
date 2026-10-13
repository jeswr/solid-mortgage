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
 * The First American-modelled title flow: issue a TitleClearCredential
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Property services · title
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Search the title and issue the clearance credential
        </h1>
        <p className="mt-4 text-muted-foreground">
          The title-clear credential records whether public records show the title as clear or
          clouded, with the effective date through which records were searched.
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
                  The TitleClearCredential is signed with <code>eddsa-rdfc-2022</code> and validated
                  against its SHACL shape before signing.
                </li>
                <li>
                  The <code>mort:titleStatus</code> outcome and searched-through date are signed
                  claims written to your pod.
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
                <li>The persona property and the clear outcome.</li>
                <li>Org involvement — this is not {titleBrand.organization}.</li>
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
