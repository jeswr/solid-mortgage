// AUTHORED-BY Claude Opus 5.5
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-600.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "./app.css";
import { isBusinessKybPage } from "@mortgage/content/business-kyb/pages";
import { trackTourContext } from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { isMovingHousePage } from "@mortgage/content/moving-house/pages";
import { ORGS } from "@mortgage/content/orgs";
import { onEvent, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { PodsProvider, startPods } from "./pods.tsx";

const APP = "bank";
// A page under moving/ belongs to the moving-house demo (src/sections/moving-house/).
const movingHouse = isMovingHousePage(location.pathname, "bank", location.search);
// A page under kyb/ belongs to the business KYB demo (src/sections/business-kyb/).
const kyb = isBusinessKybPage(location.pathname, "bank", location.search);
const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");
const view = createRoot(root);
view.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * The demo this page belongs to. The moving-house and business KYB demos load only on their own
 * pages, so neither adds to the first load of the bank's mortgage screens (acceptance test 15).
 */
async function demoOptions() {
  if (kyb) {
    const k = await import("@mortgage/content/business-kyb/mount");
    return {
      holder: k.BUSINESS_KYB_HOLDER,
      ledger: { compliance: [...k.KYB_COMPLIANCE] },
      lens: k.businessKybLens(),
      tour: k.businessKybTour(),
    };
  }
  if (movingHouse) {
    const moving = await import("@mortgage/content/moving-house/mount");
    return {
      holder: moving.MOVING_HOUSE_HOLDER,
      lens: moving.movingHouseLens(),
      tour: moving.movingHouseTour(),
    };
  }
  return { holder: MORTGAGE_HOLDER, lens: mortgageLens(), tour: mortgageTour() };
}

startPods(APP).then(
  async (info) => {
    view.render(
      <StrictMode>
        <PodsProvider app={APP} info={info}>
          <App />
        </PodsProvider>
      </StrictMode>,
    );
    void mountDemo({
      app: APP,
      ...(await demoOptions()),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
    });
  },
  (error: unknown) => console.error("bank: the pods did not start", error),
);
