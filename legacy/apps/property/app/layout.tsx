import { demoMetadata } from "@mortgage/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { site } from "./site";

// The property app hosts two branded flows, so the root layout commits to
// NEITHER org theme — each route wraps its own `AppShell` (with the flow's
// banner + header + footer) and error/hub routes render their own banner.
export const metadata: Metadata = demoMetadata({
  appName: site.appName,
  organization: site.organization,
});

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
