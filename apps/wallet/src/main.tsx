// AUTHORED-BY Claude Opus 5.5
// The signing library vc-kit pins uses the Buffer global; its stand-in must load first.
import "@mortgage/vc-kit/browser/buffer";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/800.css";
import "./app.css";
import { mortgageSeed, trackTourContext } from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { ORGS } from "@mortgage/content/orgs";
import { configure, onEvent, ready, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { initialHolder } from "./holder.ts";
import { setDayOne, setWalletDay } from "./runtime.tsx";
import { linkTour } from "./tour-link.ts";

// The demo the wallet is mounted for, and the holder it shows first (src/holder.ts).
const demo = mortgageTour();
const holder = initialHolder(window.location.href, demo.holder);

configure({ app: "wallet", holder, registry: ORGS, seed: mortgageSeed() });

const started = ready().then((info) => {
  setDayOne(info.dayOne);
  setWalletDay(info.day, false);
  return info;
});

void mountDemo({
  app: "wallet",
  holder: MORTGAGE_HOLDER,
  lens: mortgageLens(),
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
