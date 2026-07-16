import { ConceptDemoBanner, ConsentInterstitial, demoMetadata } from "@mortgage/ui";
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
  { href: "/employment", label: "Employment + income" },
  { href: "/assets", label: "Assets" },
  { href: "/credit", label: "Credit score" },
] as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="border-border border-b bg-card">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="font-semibold text-foreground text-lg">{site.appName}</p>
              <p className="text-muted-foreground text-sm">
                GSE-accepted verification suppliers — issuer flows, modelled roles only
              </p>
            </div>
            <nav aria-label="Verification flows">
              <ul className="flex list-none flex-wrap gap-4 p-0 text-sm">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        {children}
        {/* Fixed placement covers EVERY route of this multi-brand zone (R1). */}
        <ConceptDemoBanner organization={site.organization} />
        <ConsentInterstitial appId="verifications" organization={site.organization} />
      </body>
    </html>
  );
}
