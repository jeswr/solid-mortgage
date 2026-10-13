import {
  AppShell,
  ConsentInterstitial,
  DEMO_BORROWER_ACCOUNT,
  demoMetadata,
  headerNavLinkClass,
  orgThemes,
} from "@mortgage/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { site } from "./site";

export const metadata: Metadata = demoMetadata({
  appName: site.appName,
  organization: site.consentOrganizations,
});

/** In-page sections of the single-page closing scene. */
const NAV = [
  { href: "#timeline-title", label: "Timeline" },
  { href: "#ceremony-title", label: "Signing ceremony" },
  { href: "#transfer-title", label: "Servicing transfer" },
  { href: "#ledger-title", label: "Consent ledger" },
] as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell
          account={DEMO_BORROWER_ACCOUNT}
          appName={site.eCloseName}
          headerActions={
            <nav aria-label="Closing sections">
              <ul className="flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-sm">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <a className={headerNavLinkClass} href={item.href}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          }
          theme={orgThemes["closing-eclose"]}
        >
          {children}
        </AppShell>
        <ConsentInterstitial appId="closing" organization={site.consentOrganizations} />
      </body>
    </html>
  );
}
