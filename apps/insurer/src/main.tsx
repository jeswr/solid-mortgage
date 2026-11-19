// AUTHORED-BY Claude Opus 5.5
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "./app.css";
import { trackTourContext } from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import {
  isMotorClaimPage,
  MOTOR_CLAIM_HOLDER,
  motorClaimLens,
  motorClaimTour,
} from "@mortgage/content/motor-claim/mount";
import {
  isMovingHousePage,
  MOVING_HOUSE_HOLDER,
  movingHouseLens,
  movingHouseTour,
} from "@mortgage/content/moving-house/mount";
import { ORGS } from "@mortgage/content/orgs";
import { onEvent, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { APP, startPods } from "./pods.ts";

// A page under moving/ belongs to the moving-house demo (src/sections/moving-house/), one under
// claims/ to the motor claim (src/sections/motor-claim/).
const movingHouse = isMovingHousePage(location.pathname, "insurer", location.search);
const motorClaim = !movingHouse && isMotorClaimPage(location.pathname, "insurer", location.search);
const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");

startPods().catch((error: unknown) => console.error("pods did not start", error));
mountDemo({
  app: APP,
  holder: movingHouse ? MOVING_HOUSE_HOLDER : motorClaim ? MOTOR_CLAIM_HOLDER : MORTGAGE_HOLDER,
  lens: movingHouse ? movingHouseLens() : motorClaim ? motorClaimLens() : mortgageLens(),
  registry: ORGS,
  runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
  tour: movingHouse ? movingHouseTour() : motorClaim ? motorClaimTour() : mortgageTour(),
}).catch((error: unknown) => console.error("the Lens did not mount", error));

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
