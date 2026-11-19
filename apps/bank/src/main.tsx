// AUTHORED-BY Claude Opus 5.5
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-600.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "./app.css";
import { trackTourContext } from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import {
  isMovingHousePage,
  MOVING_HOUSE_HOLDER,
  movingHouseLens,
  movingHouseTour,
} from "@mortgage/content/moving-house/mount";
import { ORGS } from "@mortgage/content/orgs";
import {
  isReusableKycPage,
  REUSABLE_KYC_HOLDER,
  reusableKycLens,
  reusableKycTour,
} from "@mortgage/content/reusable-kyc/mount";
import { onEvent, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { PodsProvider, startPods } from "./pods.tsx";

const APP = "bank";
// A page under moving/ belongs to the moving-house demo (src/sections/moving-house/).
const movingHouse = isMovingHousePage(location.pathname, "bank", location.search);
// A page under kyc/ belongs to the reusable-KYC demo (src/sections/reusable-kyc/).
const reusableKyc = isReusableKycPage(location.pathname, "bank", location.search);
const demo = reusableKyc
  ? { holder: REUSABLE_KYC_HOLDER, lens: reusableKycLens(), tour: reusableKycTour() }
  : movingHouse
    ? { holder: MOVING_HOUSE_HOLDER, lens: movingHouseLens(), tour: movingHouseTour() }
    : { holder: MORTGAGE_HOLDER, lens: mortgageLens(), tour: mortgageTour() };
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
      ...demo,
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
    });
  },
  (error: unknown) => console.error("bank: the pods did not start", error),
);
