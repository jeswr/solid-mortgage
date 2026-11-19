// AUTHORED-BY Claude Opus 5.5
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "./app.css";
import { trackTourContext } from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { ORGS } from "@mortgage/content/orgs";
import { onEvent, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { APP, startPods } from "./pods.ts";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");

startPods().catch((error: unknown) => console.error("pods did not start", error));
mountDemo({
  app: APP,
  holder: MORTGAGE_HOLDER,
  lens: mortgageLens(),
  registry: ORGS,
  runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
  tour: mortgageTour(),
}).catch((error: unknown) => console.error("the Lens did not mount", error));

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
