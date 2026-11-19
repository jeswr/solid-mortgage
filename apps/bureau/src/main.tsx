// AUTHORED-BY Claude Opus 5.5
import "./app.css";
import { trackTourContext } from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { ORGS } from "@mortgage/content/orgs";
import {
  isSmallDollarPage,
  SMALL_DOLLAR_HOLDER,
  smallDollarLens,
  smallDollarTour,
} from "@mortgage/content/small-dollar-lending/mount";
import { onEvent, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { PodsProvider, startPods } from "./pods.tsx";

const APP = "bureau";
// A page under lending/ belongs to the small-dollar lending demo (src/sections/small-dollar-lending/).
const lending = isSmallDollarPage(location.pathname, APP, location.search);
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
      holder: lending ? SMALL_DOLLAR_HOLDER : MORTGAGE_HOLDER,
      lens: lending ? smallDollarLens() : mortgageLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
      tour: lending ? smallDollarTour() : mortgageTour(),
    });
  },
  (error: unknown) => console.error("bureau: the pods did not start", error),
);
