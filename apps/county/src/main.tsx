// AUTHORED-BY Claude Opus 5.5
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { startDemo } from "./runtime.ts";

startDemo().catch((error: unknown) =>
  console.error("Marlow County: the demo did not start", error),
);

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
