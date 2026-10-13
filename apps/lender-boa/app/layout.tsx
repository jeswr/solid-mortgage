import {
  AppShell,
  DEMO_BORROWER_ACCOUNT,
  demoMetadata,
  headerNavLinkClass,
  orgThemes,
} from "@mortgage/ui";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { site } from "./site";

export const metadata: Metadata = demoMetadata({
  appName: site.appName,
  organization: site.organization,
});

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/prequal", label: "Pre-qualification" },
  { href: "/application", label: "Apply" },
  { href: "/assistant", label: "Apply with assistant" },
  { href: "/freshness", label: "Freshness" },
  { href: "/pipeline", label: "Loan officer pipeline" },
] as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell
          account={DEMO_BORROWER_ACCOUNT}
          appName={site.appName}
          headerActions={
            <nav aria-label="Home loan sections">
              <ul className="flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-sm">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link className={headerNavLinkClass} href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          }
          theme={orgThemes["lender-boa"]}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
