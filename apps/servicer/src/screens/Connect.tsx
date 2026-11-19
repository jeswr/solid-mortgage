// AUTHORED-BY Claude Opus 5.5
import { DAY } from "@mortgage/content/mortgage/facts";
import {
  completeServicerConnection,
  requestServicerAccess,
} from "@mortgage/content/mortgage/journey";
import { statusOf } from "@mortgage/content/mortgage/world";
import { podFetch } from "@mortgage/pod-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useAction } from "../action.ts";
import { usePodLog } from "../log.ts";
import { podUrl, worldOn } from "../pods.ts";
import {
  connection,
  handoffUrl,
  NOT_ASKED_PATH,
  pendingRequestPath,
  requestedItems,
} from "../view.ts";
import { Refusal, Shell } from "./Shell.tsx";

/** Free play: ask the pod for something Marigold never requested, as Marigold. */
function NotAskedCheck() {
  const [status, setStatus] = useState<number | "reading" | undefined>();
  const check = useCallback(() => {
    setStatus("reading");
    statusOf(podFetch, podUrl("alex", NOT_ASKED_PATH)).then(setStatus, () => setStatus(0));
  }, []);
  return (
    <section className="panel" aria-labelledby="check-heading">
      <h2 id="check-heading">Three things, and nothing more</h2>
      <p>Marigold did not ask for your income. See what your pod says if it tries.</p>
      <button
        type="button"
        className="button ghost"
        onClick={check}
        disabled={status === "reading"}
      >
        Read income as Marigold
      </button>
      {typeof status === "number" ? (
        status === 401 || status === 403 ? (
          <Refusal status={status}>
            Your income credential is outside Marigold's grant, so the pod said no.
          </Refusal>
        ) : (
          <p className="muted">The pod answered {status}.</p>
        )
      ) : null}
    </section>
  );
}

export function Connect() {
  const log = usePodLog();
  const state = connection(log);
  const ask = useCallback(async () => {
    const requestUrl = await requestServicerAccess(await worldOn(DAY.servicingTransfer));
    window.location.assign(handoffUrl(requestUrl));
  }, []);
  const finishSetup = useCallback(
    async () => completeServicerConnection(await worldOn(DAY.servicingTransfer)),
    [],
  );
  const [asking, startAsking] = useAction(ask);
  const [finishing, startFinishing] = useAction(finishSetup);
  // Back from the wallet with G8 approved: finish setting up the account, once.
  const finished = useRef(false);
  useEffect(() => {
    if (state !== "approved" || finished.current) return;
    finished.current = true;
    startFinishing();
  }, [state, startFinishing]);
  const pending = pendingRequestPath(log);
  return (
    <Shell page="Connect your pod">
      <section className="hero">
        <h1>Connect your pod</h1>
        <p>
          Marigold asks your pod for three things to run your account. You approve in Cairn, your
          wallet, and come straight back.
        </p>
      </section>
      <section className="panel" aria-labelledby="asks-heading">
        <h2 id="asks-heading">What we ask for</h2>
        <ul className="asks">
          {requestedItems().map((item) => (
            <li key={item.path}>
              <span>{item.label}</span>
              <span className="badge">{item.access}</span>
            </li>
          ))}
        </ul>
        {state === "awaiting-notice" ? (
          <p className="muted">
            Juniper has not yet told you that servicing is moving, so there is nothing to connect.
          </p>
        ) : null}
        {state === "ready" || state === "awaiting-notice" ? (
          <button
            type="button"
            className="button"
            disabled={state !== "ready" || asking.phase === "running"}
            onClick={startAsking}
          >
            {asking.phase === "running" ? "Asking your pod…" : "Connect with Cairn"}
          </button>
        ) : null}
        {asking.phase === "failed" ? (
          <p className="error" role="alert">
            The request was not sent: {asking.message}
          </p>
        ) : null}
        {state === "requested" && pending !== undefined ? (
          <p>
            Your pod has our request.{" "}
            <a href={handoffUrl(podUrl("alex", pending))}>Open Cairn to approve it</a>
          </p>
        ) : null}
        {state === "approved" ? (
          <div role="status">
            {finishing.phase === "failed" ? (
              <>
                <p className="error">Setup stopped: {finishing.message}</p>
                <button type="button" className="button" onClick={startFinishing}>
                  Try again
                </button>
              </>
            ) : (
              <p>Approved. Reading your details and delivering your notices…</p>
            )}
          </div>
        ) : null}
        {state === "connected" ? (
          <div className="success" role="status">
            <strong>Connected.</strong> Your welcome notice and escrow statement are in your pod.{" "}
            <Link href="/account">Go to your account</Link>
          </div>
        ) : null}
        {state === "ended" ? (
          <p className="muted">
            You ended Marigold's access. We keep the records the law requires; we no longer read
            your pod.
          </p>
        ) : null}
      </section>
      {state === "connected" ? <NotAskedCheck /> : null}
    </Shell>
  );
}
