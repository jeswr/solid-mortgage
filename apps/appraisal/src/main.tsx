// AUTHORED-BY Claude Opus 5.5
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { startDemo } from "./runtime.ts";

startDemo().catch((error: unknown) => console.error("Plumbline: the demo did not start", error));

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
