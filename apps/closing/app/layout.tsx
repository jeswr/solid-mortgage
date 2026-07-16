import { AppShell, ConsentInterstitial, demoMetadata, orgThemes } from "@mortgage/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { site } from "./site";

export const metadata: Metadata = demoMetadata({
  appName: site.appName,
  organization: site.consentOrganizations,
});

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell appName={site.eCloseName} theme={orgThemes["closing-eclose"]}>
          {children}
        </AppShell>
        <ConsentInterstitial appId="closing" organization={site.consentOrganizations} />
      </body>
    </html>
  );
}
