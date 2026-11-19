// AUTHORED-BY Claude Opus 5.5
import { DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { org } from "./org.ts";

/** Shown when the in-browser pods could not start (no service worker or worker available). */
export function StartFailed({ error }: { error: unknown }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <main id="main" className="work">
        <h1>The pods could not start</h1>
        <p>
          This demo keeps every pod in your browser. They did not start here:{" "}
          {error instanceof Error ? error.message : String(error)}
        </p>
      </main>
    </DemoTrust>
  );
}
