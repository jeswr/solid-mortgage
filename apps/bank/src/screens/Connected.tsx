// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { ErrorNote, IssuedCard } from "../components.tsx";
import { loadIssuances } from "../data.ts";
import { org } from "../org.ts";
import { usePodData } from "../pods.tsx";

/** Connected services: what Alder Bank has signed into Alex's pod, and what it can see there. */
export function Connected() {
  useEffect(() => applyDocumentMeta(org, "Connected services"), []);
  const issued = usePodData((p) => loadIssuances(p.world()));
  return (
    <div className="page">
      <h1>Connected services</h1>
      <p className="lede">
        Your Solid pod. These are the credentials Alder Bank has signed and written there. We keep a
        pointer and a fingerprint of each, and an entry in our status list so anyone can check we
        have not withdrawn it.
      </p>
      {issued.state === "waiting" ? <p role="status">Loading…</p> : null}
      {issued.state === "failed" ? <ErrorNote error={issued.error} /> : null}
      {issued.state === "ready" ? (
        issued.data.length === 0 ? (
          <p>Nothing yet.</p>
        ) : (
          <div className="issued-grid">
            {issued.data.map((issuance) => (
              <IssuedCard key={issuance.record} issuance={issuance} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
