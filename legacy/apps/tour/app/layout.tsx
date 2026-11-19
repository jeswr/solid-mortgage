import { AppShell, ConsentInterstitial, demoMetadata, orgThemes } from "@mortgage/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Launcher } from "./components/launcher";
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
        <AppShell
          appName={site.appName}
          headerActions={
            <nav aria-label="Tour sections" className="flex items-center gap-4 text-sm">
              <a className="text-muted-foreground hover:text-foreground" href="/#ecosystem">
                Ecosystem
              </a>
              <a className="text-muted-foreground hover:text-foreground" href="/#chapters">
                Chapters
              </a>
              <a className="text-muted-foreground hover:text-foreground" href="/apps">
                Apps
              </a>
              <a className="text-muted-foreground hover:text-foreground" href="/examiner">
                Examiner View
              </a>
            </nav>
          }
          theme={orgThemes.tour}
          variant="own"
        >
          {children}
        </AppShell>
        <Launcher />
        <ConsentInterstitial appId="tour" organization={site.organization} variant="own" />
      </body>
    </html>
  );
}
