// AUTHORED-BY Claude Opus 5.5
// The signing library vc-kit pins uses the Buffer global; its stand-in must load first.
import "@mortgage/vc-kit/browser/buffer";
import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/inter-tight/latin-400.css";
import "@fontsource/inter-tight/latin-600.css";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { startDemo } from "./runtime.ts";

startDemo().catch((error: unknown) =>
  console.error("Trueline Identity: the demo did not start", error),
);

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
