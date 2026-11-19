"use client";

import { ConceptDemoBanner } from "@mortgage/ui";
import { site } from "./site";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            margin: "0 auto",
            maxWidth: "48rem",
            padding: "6rem 1.5rem",
          }}
        >
          <h1>Something went wrong</h1>
          <p>This concept demonstration could not load this route.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
        <ConceptDemoBanner organization={site.consentOrganizations} />
      </body>
    </html>
  );
}
