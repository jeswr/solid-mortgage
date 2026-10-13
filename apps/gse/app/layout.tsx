import { AppShell, demoMetadata, headerNavLinkClass, orgThemes } from "@mortgage/ui";
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
  { href: "/underwriting", label: "Underwriting console" },
] as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell
          appName={site.appName}
          headerActions={
            <nav aria-label="Underwriting sections">
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
          theme={orgThemes.gse}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
