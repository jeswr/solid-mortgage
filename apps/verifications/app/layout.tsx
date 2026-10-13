import {
  BrandHeader,
  brandCssProperties,
  ConceptDemoBanner,
  ConsentInterstitial,
  DEMO_BORROWER_ACCOUNT,
  demoMetadata,
  headerNavLinkClass,
  orgThemes,
} from "@mortgage/ui";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
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

/** Suite-level frame: the shared Proofline brand on the neutral credit-flow palette. */
const SUITE_THEME = orgThemes["verifications-credit"];

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div
          className="min-h-dvh bg-background text-foreground [&_:is(h1,h2,h3)]:[font-family:var(--font-heading)]"
          style={
            { ...brandCssProperties(SUITE_THEME), fontFamily: "var(--font-brand)" } as CSSProperties
          }
        >
          <BrandHeader
            account={DEMO_BORROWER_ACCOUNT}
            appName={site.appName}
            framing="GSE-accepted verification suppliers — issuer flows, modelled roles only"
            headerActions={
              <nav aria-label="Verification flows">
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
            theme={SUITE_THEME}
          />
          {children}
        </div>
        {/* Fixed placement covers EVERY route of this multi-brand zone (R1). */}
        <ConceptDemoBanner organization={site.organization} />
        <ConsentInterstitial appId="verifications" organization={site.organization} />
      </body>
    </html>
  );
}
