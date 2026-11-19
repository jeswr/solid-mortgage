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
  organization: site.organization,
});

/** In-page sections of the single-page rate-quote flow. */
const NAV = [
  { href: "#criteria-heading", label: "Criteria" },
  { href: "#quote-heading", label: "Rate quote" },
  { href: "#zk-honesty-heading", label: "How the proof works" },
] as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell
          account={DEMO_BORROWER_ACCOUNT}
          appName={site.appName}
          headerActions={
            <nav aria-label="Rate quote sections">
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
          theme={orgThemes["lender-53"]}
        >
          {children}
        </AppShell>
        <ConsentInterstitial appId="lender-53" organization={site.organization} />
      </body>
    </html>
  );
}
