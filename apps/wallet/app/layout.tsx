import { AppShell, ConsentInterstitial, demoMetadata, orgThemes } from "@mortgage/ui";
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
  { href: "/", label: "Vault" },
  { href: "/credentials", label: "Credentials" },
  { href: "/prequal", label: "ZK pre-qual" },
  { href: "/grants", label: "Access grants" },
  { href: "/ledger", label: "Receipt ledger" },
] as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell
          appName={site.appName}
          headerActions={
            <nav aria-label="Data Vault sections">
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
