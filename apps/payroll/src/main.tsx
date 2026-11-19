// AUTHORED-BY Claude Opus 5.5
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "./app.css";
import { trackTourContext } from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { ORGS } from "@mortgage/content/orgs";
import { onEvent, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { PodsProvider, startPods } from "./pods.tsx";

const APP = "payroll";
const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");
const view = createRoot(root);
view.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startPods(APP).then(
  (info) => {
    view.render(
      <StrictMode>
        <PodsProvider app={APP} info={info}>
          <App />
        </PodsProvider>
      </StrictMode>,
    );
    void mountDemo({
      app: APP,
      holder: MORTGAGE_HOLDER,
      lens: mortgageLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
      tour: mortgageTour(),
    });
  },
  (error: unknown) => console.error("payroll: the pods did not start", error),
);
