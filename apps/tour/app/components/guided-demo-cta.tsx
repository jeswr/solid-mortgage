"use client";

import { useEffect, useState } from "react";

/**
 * "Guided click-through" button, shown only when the page is served by the local demo
 * server (`pnpm demo`), whose overlay runs the guided steps and the pod activity panel.
 */
export function GuidedDemoCta() {
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

  if (!available) return null;
  return (
    <a
      className="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-slate-950 text-sm transition-opacity hover:opacity-90"
      data-cta-guided=""
      href="/?guided=1"
    >
      Guided click-through
    </a>
  );
}
