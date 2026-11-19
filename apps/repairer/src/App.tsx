// AUTHORED-BY Claude Opus 5.5
/**
 * Anvil Collision Repair: the workshop tablet. A job board and one job card, with large buttons
 * for gloved hands. Everything the card shows from Alex's pod is read as Anvil, so the pod decides
 * it under grant C2; the card never reads Alex's pod on its own, only when a button is pressed.
 */

import { CAR, CLAIM_NUMBER, DAY, PHOTOS } from "@mortgage/content/motor-claim/facts";
import { MOTOR_GRANTS } from "@mortgage/content/motor-claim/grants";
import type { Completion, JobView } from "@mortgage/content/motor-claim/repairer";
import type { ClaimCase, RepairEstimate } from "@mortgage/data-model";
import { applyDocumentMeta, DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useEffect, useState } from "react";
import { type BaseLocationHook, Link, Route, Router, Switch } from "wouter";
import { org } from "./org.ts";
import { journey, type Outcome, repairerWorld, useAction, usePodState } from "./runtime.ts";

/** The router base: Vite's `base` without its trailing slash ("/repairer"). */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const JOB_PATH = `/jobs/${CLAIM_NUMBER}`;

function Bar() {
  return (
    <header className="bar">
      <div className="bar-inner">
        <p className="bar-name">
          <span className="bar-mark" aria-hidden="true" />
          {org.organisation}
        </p>
        <p className="bar-who">
          Bay 2 · {org.persona?.name}, {org.persona?.role}
        </p>
      </div>
      <nav aria-label="Workshop" className="bar-nav">
        <Link href="/">Job board</Link>
        <Link href={JOB_PATH}>Job {CLAIM_NUMBER}</Link>
      </nav>
    </header>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

const usd = (amount: number) =>
  amount.toLocaleString("en-US", { currency: "USD", style: "currency" });

/** Anvil's own record of the job, from Anvil's own pod. */
async function loadJob(): Promise<ClaimCase | undefined> {
  const world = await repairerWorld();
  return (await journey()).readJob(world);
}

function statusOf(job: ClaimCase | undefined): string {
  if (job === undefined) return "Waiting for access";
  if (job.completed) return "Complete";
  if (job.acceptedEstimateIri !== undefined) return "Estimate approved";
  return "Open";
}

function Status({ job }: { job: ClaimCase | undefined }) {
  const label = statusOf(job);
  return (
    <span className={`pill pill-${label.split(" ")[0]?.toLowerCase()}`} data-testid="job-status">
      {label}
    </span>
  );
}

function Home() {
  const { outcome } = usePodState(loadJob, ["repairer"]);
  const job = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <Page title="Job board">
      {outcome.state === "loading" ? <p role="status">Connecting to the pods…</p> : null}
      {outcome.state === "error" ? (
        <p role="alert" className="alert">
          {outcome.message}
        </p>
      ) : null}
      <ul className="board">
        <li className="ticket">
          <p className="ticket-no">{CLAIM_NUMBER}</p>
          <p className="ticket-car">
            {CAR.color} {CAR.name}
          </p>
          <p className="ticket-from">Referred by Wrenfield Mutual · customer Alex Rivera</p>
          <Status job={job} />
          <Link href={JOB_PATH} className="big">
            Open job card
          </Link>
        </li>
      </ul>
      <p className="muted">
        Jobs come from insurers' referrals. What a job card can open is what the customer granted:
        it ends when the job does. <a href={appUrl("welcome")}>All demo apps</a>
      </p>
    </Page>
  );
}

function Refusal({ status, what }: { status: number; what: string }) {
  return (
    <div role="alert" className="refused" data-testid="job-refused">
      <p className="refused-code">{status}</p>
      <p>
        <strong>Refused by Alex's pod.</strong> {what} Anvil's grant was for this job, and the job
        is complete. Nothing at Anvil was deleted: the invoice and the job record stay with us.
      </p>
    </div>
  );
}

function Problem({ outcome }: { outcome: Outcome<true> | { state: string } }) {
  if (outcome.state === "refused" && "status" in outcome) {
    return (
      <Refusal status={outcome.status} what="The job card asked for something it may not read." />
    );
  }
  if (outcome.state === "error" && "message" in outcome) {
    return (
      <p role="alert" className="alert">
        {outcome.message}
      </p>
    );
  }
  return null;
}

const photoSrc = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function captionOf(url: string): string {
  return PHOTOS.find((photo) => url.endsWith(photo.file))?.caption ?? "Photo";
}

function PhotoGrid({ photos }: { photos: readonly { url: string; svg: string }[] }) {
  return (
    <ul className="photos" aria-label="Photos from Alex's pod">
      {photos.map((photo) => (
        <li key={photo.url}>
          <img src={photoSrc(photo.svg)} alt={captionOf(photo.url)} />
          <p>{captionOf(photo.url)}</p>
        </li>
      ))}
    </ul>
  );
}

function EstimateTable({ estimate }: { estimate: RepairEstimate }) {
  return (
    <table className="lines" data-testid="job-estimate">
      <caption>Estimate {estimate.estimateNumber} (illustrative amounts)</caption>
      <tbody>
        {estimate.lineItems.map((item) => (
          <tr key={item.value}>
            <th scope="row">{item.name}</th>
            <td>{usd(item.amountUsd)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td>{usd(estimate.totalUsd)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function JobCard() {
  const { outcome, reload } = usePodState(loadJob, ["repairer"]);
  const job = outcome.state === "ok" ? outcome.value : undefined;
  const estimateAction = useAction();
  const completeAction = useAction();
  const photosAction = useAction();
  const [opened, setOpened] = useState<(JobView & { estimate: RepairEstimate }) | undefined>();
  const [completion, setCompletion] = useState<Completion | undefined>();
  const [again, setAgain] = useState<{ status: number; url: string; svg?: string } | undefined>();
  const busy = [estimateAction, completeAction, photosAction].some(
    (action) => action.outcome.state === "running",
  );
  const grant = MOTOR_GRANTS.C2;
  return (
    <Page title={`Job ${CLAIM_NUMBER}`}>
      <div className="job-head">
        <p className="job-car">
          {CAR.color} {CAR.name} · VIN <span className="mono">{CAR.vin}</span>
        </p>
        <Status job={job} />
      </div>
      {outcome.state === "loading" ? <p role="status">Connecting to the pods…</p> : null}
      {outcome.state === "error" ? (
        <p role="alert" className="alert">
          {outcome.message}
        </p>
      ) : null}
      <p className="grant" data-testid="job-grant">
        <strong>Access: grant {grant.code} from Alex.</strong> Read the damage report and the
        photos; add the estimate and the invoice. {grant.endLabel}.
        {job?.completed ? " The job is complete, so the grant has ended." : ""}
      </p>

      <section className="panel" aria-labelledby="job-damage">
        <h2 id="job-damage">1 · Damage and estimate</h2>
        {opened === undefined ? (
          <p className="muted">
            The job card opens the damage report and the photos in Alex's pod, prices the work and
            writes the estimate back into Alex's claim folder.
          </p>
        ) : (
          <>
            <ul className="damage" data-testid="job-damage-items">
              {opened.damageReport.damage.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <PhotoGrid photos={opened.photos} />
            <EstimateTable estimate={opened.estimate} />
          </>
        )}
        <button
          type="button"
          className="big primary"
          data-tour="repairer-write-estimate"
          disabled={busy || job === undefined || job.completed}
          onClick={() =>
            void estimateAction.run(async () => {
              const world = await repairerWorld(DAY.estimate);
              setOpened(await (await journey()).sendEstimate(world));
              reload();
            })
          }
        >
          {estimateAction.outcome.state === "running" ? "Writing…" : "Write estimate"}
        </button>
        {estimateAction.outcome.state === "ok" ? (
          <p role="status" className="ok">
            Estimate written into Alex's claim folder. Wrenfield reads it there.
          </p>
        ) : (
          <Problem outcome={estimateAction.outcome} />
        )}
      </section>

      <section className="panel" aria-labelledby="job-complete">
        <h2 id="job-complete">2 · Finish the job</h2>
        {completion !== undefined ? (
          <p data-testid="job-invoice">
            Invoice {completion.invoice.invoiceNumber} for{" "}
            <span className="mono">{usd(completion.invoice.totalUsd)}</span> filed in Alex's claim
            folder.
            {completion.expired.includes("C2")
              ? " Alex's wallet saw it and ended grant C2."
              : " Grant C2 had already ended."}
          </p>
        ) : (
          <p className="muted">
            Filing the invoice completes the job. The invoice is the event grant C2 ends on.
          </p>
        )}
        <button
          type="button"
          className="big primary"
          data-tour="repairer-complete-job"
          disabled={busy || job === undefined || job.completed}
          onClick={() =>
            void completeAction.run(async () => {
              const world = await repairerWorld(DAY.complete);
              setCompletion(await (await journey()).completeJob(world));
              reload();
            })
          }
        >
          {completeAction.outcome.state === "running" ? "Filing…" : "Complete job"}
        </button>
        <Problem outcome={completeAction.outcome} />
      </section>

      <section className="panel" aria-labelledby="job-photos">
        <h2 id="job-photos">3 · Photos</h2>
        <p className="muted">Open the customer's photos from the job card.</p>
        <button
          type="button"
          className="big"
          data-tour="repairer-open-photos"
          disabled={busy || job === undefined}
          onClick={() =>
            void photosAction.run(async () => {
              const world = await repairerWorld(job?.completed ? DAY.complete : DAY.estimate);
              setAgain(await (await journey()).openPhotosAgain(world));
            })
          }
        >
          {photosAction.outcome.state === "running" ? "Opening…" : "Open photos"}
        </button>
        {again !== undefined && again.svg !== undefined ? (
          <PhotoGrid photos={[{ svg: again.svg, url: again.url }]} />
        ) : null}
        {again !== undefined && again.svg === undefined ? (
          <Refusal status={again.status} what="The photos are in Alex's pod, not ours." />
        ) : null}
        <Problem outcome={photosAction.outcome} />
      </section>
    </Page>
  );
}

function NotFound() {
  return (
    <Page title="Page not found">
      <Link href="/" className="big">
        Back to the job board
      </Link>
    </Page>
  );
}

/** `hook` swaps the browser location for another (tests pass wouter's `memoryLocation`). */
export function App({ hook }: { hook?: BaseLocationHook }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <Router {...(hook === undefined ? { base: ROUTER_BASE } : { hook })}>
        <Bar />
        <Switch>
          <Route path="/" component={Home} />
          <Route path={JOB_PATH} component={JobCard} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </DemoTrust>
  );
}
