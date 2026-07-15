import { ConceptDemoBanner } from "@mortgage/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { site } from "./site";

const title = `${site.appName} — Concept Demo (not ${site.organization})`;
const description = `This is not ${site.organization}. Concept demonstration only; not an offer of credit.`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ConceptDemoBanner organization={site.organization} />
      </body>
    </html>
  );
}
