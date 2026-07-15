import { AppShell, demoMetadata, orgThemes } from "@mortgage/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { site } from "./site";

export const metadata: Metadata = demoMetadata({
  appName: site.appName,
  organization: site.organization,
  variant: "own",
});

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell appName={site.appName} theme={orgThemes.tour} variant="own">
          {children}
        </AppShell>
      </body>
    </html>
  );
}
