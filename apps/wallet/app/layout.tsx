import {
  AppShell,
  ConsentInterstitial,
  DEMO_BORROWER_ACCOUNT,
  demoMetadata,
  headerNavLinkClass,
  orgThemes,
} from "@mortgage/ui";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { VaultProvider } from "@/lib/pod/vault-context";
import { site } from "./site";

export const metadata: Metadata = demoMetadata({
  appName: site.appName,
  organization: site.organization,
});

const NAV = [
  { href: "/", label: "Home" },
  { href: "/credentials", label: "Credentials" },
  { href: "/prequal", label: "Prequalify" },
  { href: "/grants", label: "Access permissions" },
  { href: "/ledger", label: "Consent receipts" },
  { href: "/assistant", label: "Assistant" },
] as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell
          account={DEMO_BORROWER_ACCOUNT}
          appName={site.appName}
          headerActions={
            <nav aria-label="Data Vault sections">
              <ul className="flex list-none flex-wrap gap-4 p-0 text-sm">
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
          theme={orgThemes.wallet}
        >
          {/* The simulated-login disclosure strip renders INSIDE the provider,
              above every route — decision 0011 makes it impossible to omit. */}
          <VaultProvider>{children}</VaultProvider>
        </AppShell>
        <ConsentInterstitial appId="wallet" organization={site.organization} />
      </body>
    </html>
  );
}
