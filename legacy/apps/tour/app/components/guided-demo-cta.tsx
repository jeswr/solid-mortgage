"use client";

import { useEffect, useState } from "react";

/**
 * The home page's single primary action (astra-review-1 M2). When the page is served by the
 * local demo server (`pnpm demo`), whose overlay runs the guided steps and the pod activity
 * panel, "Start guided demo" is primary and the chapter walkthrough becomes a text link.
 * Everywhere else the walkthrough is the primary action.
 */
export function GuidedDemoCta({ walkthroughHref }: { walkthroughHref: string }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/__demo/config.json", { cache: "no-store" })
      .then((response) => {
        if (active) setAvailable(response.ok);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!available) {
    return (
      <a
        className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground text-sm transition-opacity hover:opacity-90"
        data-cta-start-tour=""
        href={walkthroughHref}
      >
        Start the walkthrough
      </a>
    );
  }
  return (
    <>
      <a
        className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground text-sm transition-opacity hover:opacity-90"
        data-cta-guided=""
        href="/?guided=1"
      >
        Start guided demo
      </a>
      <a
        className="order-last font-medium text-foreground text-sm underline underline-offset-2 hover:opacity-80"
        data-cta-start-tour=""
        href={walkthroughHref}
      >
        Read the walkthrough
      </a>
    </>
  );
}
