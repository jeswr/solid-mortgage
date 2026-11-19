// AUTHORED-BY Claude Opus 5.5
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The tour and the Solid Lens, as on every organisation app. Loaded after the first render: the
// pod runtime and the seed stay out of the front door's first load.
import("./guided-tour.ts")
  .then((tour) => tour.mountGuidedTour())
  .catch((error: unknown) => console.error("welcome: the demo did not start", error));
