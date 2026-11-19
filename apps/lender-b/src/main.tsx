// AUTHORED-BY Claude Opus 5.5
import "@fontsource/archivo-black/400.css";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/600.css";
import "./app.css";
import { trackTourContext } from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { ORGS } from "@mortgage/content/orgs";
import { onEvent, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { APP, start } from "./runtime.ts";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

start().then(
  (calendar) =>
    mountDemo({
      app: APP,
      calendar: { dayOf: (date) => calendar.dayOf(date), label: (day) => calendar.label(day) },
      holder: MORTGAGE_HOLDER,
      lens: mortgageLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
      tour: mortgageTour(),
    }),
  (error: unknown) => console.error("Copperfield: the pod runtime did not start", error),
);
