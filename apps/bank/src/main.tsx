// AUTHORED-BY Claude Opus 5.5
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-600.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "./app.css";
import {
  BUSINESS_KYB_HOLDER,
  businessKybLens,
  businessKybTour,
  isBusinessKybPage,
  KYB_COMPLIANCE,
} from "@mortgage/content/business-kyb/mount";
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
import {
  isSmallBusinessLoanPage,
  LOAN_COMPLIANCE,
  SMALL_BUSINESS_LOAN_HOLDER,
  smallBusinessLoanLens,
  smallBusinessLoanTour,
} from "@mortgage/content/small-business-loan/mount";
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

const APP = "bank";
// A page under moving/ belongs to the moving-house demo (src/sections/moving-house/).
const movingHouse = isMovingHousePage(location.pathname, "bank", location.search);
// A page under lending/ belongs to the small-dollar lending demo (src/sections/small-dollar-lending/).
const lending = isSmallDollarPage(location.pathname, "bank", location.search);
// A page under kyb/ belongs to the business KYB demo (src/sections/business-kyb/).
const kyb = isBusinessKybPage(location.pathname, "bank", location.search);
// A page under business/ belongs to the small business loan (src/sections/small-business-loan/).
const loan = isSmallBusinessLoanPage(location.pathname, "bank", location.search);
// A page under kyc/ belongs to the reusable-KYC demo (src/sections/reusable-kyc/).
const reusableKyc = isReusableKycPage(location.pathname, "bank", location.search);
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
    const runtime = { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) };
    void mountDemo(
      loan
        ? {
            app: APP,
            holder: SMALL_BUSINESS_LOAN_HOLDER,
            ledger: { compliance: [...LOAN_COMPLIANCE] },
            lens: smallBusinessLoanLens(),
            registry: ORGS,
            runtime,
            tour: smallBusinessLoanTour(),
          }
        : kyb
          ? {
              app: APP,
              holder: BUSINESS_KYB_HOLDER,
              ledger: { compliance: [...KYB_COMPLIANCE] },
              lens: businessKybLens(),
              registry: ORGS,
              runtime,
              tour: businessKybTour(),
            }
          : reusableKyc
            ? {
                app: APP,
                holder: REUSABLE_KYC_HOLDER,
                lens: reusableKycLens(),
                registry: ORGS,
                runtime,
                tour: reusableKycTour(),
              }
            : {
                app: APP,
                holder: lending
                  ? SMALL_DOLLAR_HOLDER
                  : movingHouse
                    ? MOVING_HOUSE_HOLDER
                    : MORTGAGE_HOLDER,
                lens: lending
                  ? smallDollarLens()
                  : movingHouse
                    ? movingHouseLens()
                    : mortgageLens(),
                registry: ORGS,
                runtime,
                tour: lending
                  ? smallDollarTour()
                  : movingHouse
                    ? movingHouseTour()
                    : mortgageTour(),
              },
    );
  },
  (error: unknown) => console.error("bank: the pods did not start", error),
);
