// AUTHORED-BY Claude Opus 5.5
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "./app.css";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { ORGS } from "@mortgage/content/orgs";
import { onEvent, resetDemo } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { APP, startRuntime, tourContext } from "./demo.ts";
import { StartFailed } from "./start-failed.tsx";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root");
const reactRoot = createRoot(root);

startRuntime()
  .then((info) => {
    reactRoot.render(
      <StrictMode>
        <App dayOne={info.dayOne} />
      </StrictMode>,
    );
    return mountDemo({
      app: APP,
      holder: MORTGAGE_HOLDER,
      lens: mortgageLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: tourContext },
      tour: mortgageTour(),
    });
  })
  .catch((error: unknown) => {
    console.error("lender-desk: the pod runtime did not start", error);
    reactRoot.render(<StartFailed error={error} />);
  });
