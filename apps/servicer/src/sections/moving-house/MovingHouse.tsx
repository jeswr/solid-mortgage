// AUTHORED-BY Claude Opus 5.5
/**
 * Mailing address (moving-house demo, flows.md section 2): the copy of Alex's address this
 * organisation keeps in its own pod, where it came from, under which grant, and whether it is
 * still current. Its back office read the address when Alex's grant arrived, and reads it again when the address changes.
 */
import "./moving-house.css";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import { movingHouseWorld } from "@mortgage/content/moving-house/browser";
import { streetLine } from "@mortgage/content/moving-house/facts";
import { codeOf } from "@mortgage/content/moving-house/grants";
import { readCopy } from "@mortgage/content/moving-house/holders";
import { ORGS } from "@mortgage/content/orgs";
import { createPodHooks } from "@mortgage/demo-kit/react";
import { note, onEvent, onReset, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import { Shell } from "../../screens/Shell.tsx";

const HOLDER = "servicer" as const;
const org = ORGS[HOLDER];

const { usePodState } = createPodHooks({ events: { onEvent, onReset }, refusalOf });

async function load() {
  // The back office read the address when the grant arrived; this page shows the copy it keeps.
  return readCopy(await movingHouseWorld({ note, podFetch, ready, setDay }, HOLDER), HOLDER);
}

const when = (date: Date | undefined) =>
  date === undefined
    ? "–"
    : date.toLocaleString("en-US", {
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        timeZone: "UTC",
      });

export function MovingAddressOnFile() {
  const { outcome } = usePodState(load, [HOLDER]);
  const copy = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <Shell page="Mailing address">
      <div className="mh-held">
        <h1>Mailing address</h1>
        <p>Alex Rivera · Escrow and mortgage statements go to this address.</p>
        {outcome.state === "loading" ? <p role="status">Reading our records…</p> : null}
        {outcome.state === "refused" ? (
          <p role="alert" className="mh-held-alert">
            <strong>Refused by the pod ({outcome.status}).</strong> Alex has not shared an address
            with {org.organisation}.
          </p>
        ) : null}
        {outcome.state === "error" ? <p role="alert">{outcome.message}</p> : null}
        {outcome.state === "ok" && copy === undefined ? (
          <p>No address on file for Alex yet. It arrives when Alex grants access in the wallet.</p>
        ) : null}
        {copy !== undefined ? (
          <section aria-labelledby="mh-held-heading" className="mh-held-card">
            <h2 id="mh-held-heading">Address on file</h2>
            <address data-testid="mh-held-address">
              {streetLine(copy.address)}
              <br />
              {copy.address.locality}, {copy.address.region} {copy.address.postalCode}
            </address>
            <dl>
              <dt>Source</dt>
              <dd>Alex's pod, read under grant {codeOf(HOLDER)} (until Alex withdraws it)</dd>
              <dt>Read</dt>
              <dd>{when(copy.generatedAt)}</dd>
              <dt>Effective</dt>
              <dd>{copy.validFrom}</dd>
            </dl>
            {copy.invalidatedAt !== undefined ? (
              <p role="alert" className="mh-held-alert" data-testid="mh-held-stale">
                <strong>Out of date since {when(copy.invalidatedAt)}.</strong> Alex changed the
                address and the pod refused our read: our access has ended. We keep the copy we are
                required to keep, marked as no longer current.
              </p>
            ) : (
              <p className="mh-held-ok">Current: we read it again whenever Alex changes it.</p>
            )}
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
