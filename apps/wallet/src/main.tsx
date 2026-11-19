// AUTHORED-BY Claude Opus 5.5
// The signing library vc-kit pins uses the Buffer global; its stand-in must load first.
import "@mortgage/vc-kit/browser/buffer";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/800.css";
import "./app.css";
import {
  BUSINESS_KYB_HOLDER,
  businessKybLens,
  businessKybTour,
  isBusinessKybPage,
  KYB_COMPLIANCE,
} from "@mortgage/content/business-kyb/mount";
import {
  isMedicationPage,
  MEDICATION_HOLDER,
  medicationLens,
  medicationTour,
} from "@mortgage/content/medication-handover/mount";
import { mortgageSeed, trackTourContext } from "@mortgage/content/mortgage/browser";
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
import {
  isSmallDollarPage,
  SMALL_DOLLAR_HOLDER,
  smallDollarLens,
  smallDollarTour,
} from "@mortgage/content/small-dollar-lending/mount";
import { configure, onEvent, ready, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { initialHolder } from "./holder.ts";
import { setDayOne, setWalletDay } from "./runtime.tsx";
import { linkTour } from "./tour-link.ts";

// A page under moving/ belongs to the moving-house demo (src/sections/moving-house/); a page
// under kyb/ (or prove/kyb) to the business KYB demo (src/sections/business-kyb/); a page under
// health/ to the medication handover (src/sections/medication-handover/).
const medication = isMedicationPage(location.pathname, "wallet", location.search);
const kyb = !medication && isBusinessKybPage(location.pathname, "wallet", location.search);
const movingHouse =
  !medication && !kyb && isMovingHousePage(location.pathname, "wallet", location.search);
// A page under claim/ belongs to the motor claim (src/sections/motor-claim/).
const motorClaim =
  !medication &&
  !kyb &&
  !movingHouse &&
  isMotorClaimPage(location.pathname, "wallet", location.search);

// A page under lending/ belongs to the small-dollar lending demo (src/sections/small-dollar-lending/).
const lending = isSmallDollarPage(location.pathname, "wallet", location.search);

// The demo the wallet is mounted for, and the holder it shows first (src/holder.ts).
const demo = lending
  ? smallDollarTour()
  : medication
    ? medicationTour()
    : kyb
      ? businessKybTour()
      : movingHouse
        ? movingHouseTour()
        : motorClaim
          ? motorClaimTour()
          : mortgageTour();
const holder = initialHolder(window.location.href, demo.holder);

configure({ app: "wallet", holder, registry: ORGS, seed: mortgageSeed() });

const started = ready().then((info) => {
  setDayOne(info.dayOne);
  setWalletDay(info.day, false);
  return info;
});

void mountDemo({
  app: "wallet",
  holder: lending
    ? SMALL_DOLLAR_HOLDER
    : medication
      ? MEDICATION_HOLDER
      : kyb
        ? BUSINESS_KYB_HOLDER
        : movingHouse
          ? MOVING_HOUSE_HOLDER
          : motorClaim
            ? MOTOR_CLAIM_HOLDER
            : MORTGAGE_HOLDER,
  lens: lending
    ? smallDollarLens()
    : medication
      ? medicationLens()
      : kyb
        ? businessKybLens()
        : movingHouse
          ? movingHouseLens()
          : motorClaim
            ? motorClaimLens()
            : mortgageLens(),
  ...(kyb ? { ledger: { compliance: [...KYB_COMPLIANCE] } } : {}),
  registry: ORGS,
  runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
  tour: demo,
}).then(({ tour }) => {
  if (tour === undefined) return;
  linkTour(tour);
  // In the guided tour the wallet acts on the day of the step the visitor is on.
  const follow = () => {
    const day = tour.mode === "free" ? undefined : tour.current?.clock?.day;
    if (day !== undefined) void started.then(() => setWalletDay(day, true));
  };
  follow();
  tour.addEventListener("change", follow);
});

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");
createRoot(root).render(
  <StrictMode>
    <App started={started} holder={holder} demoHolder={demo.holder} />
  </StrictMode>,
);
