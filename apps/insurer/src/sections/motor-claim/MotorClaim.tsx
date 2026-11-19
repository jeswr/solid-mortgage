// AUTHORED-BY Claude Opus 5.5
/**
 * Wrenfield Mutual's claims (motor-claim demo, flows.md section 7): the claims page where Alex
 * reports the claim and grants C1 (step 2), and the claims desk where a handler checks the licence
 * and the policy at source, writes the damage report (step 3) and approves Anvil's estimate
 * (step 7). A page load reads only Wrenfield's own records; Alex's pod is read when a button is
 * pressed, as Wrenfield, so the pod decides every read.
 */
import "./motor-claim.css";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import { motorClaimWorld } from "@mortgage/content/motor-claim/browser";
import { CLAIM_NUMBER, DAY, MOTOR_POLICY, PHOTOS } from "@mortgage/content/motor-claim/facts";
import { MOTOR_GRANTS } from "@mortgage/content/motor-claim/grants";
import type { DeskReview } from "@mortgage/content/motor-claim/insurer";
import type { ClaimCase, RepairEstimate } from "@mortgage/data-model";
import { createPodHooks } from "@mortgage/demo-kit/react";
import { note, onEvent, onReset, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import { useState } from "react";
import { Link } from "wouter";
import { Refusal, Shell } from "../../screens/Shell.tsx";

const ME = "insurer" as const;

const { useAction, usePodState } = createPodHooks({ events: { onEvent, onReset }, refusalOf });

const journey = () => import("@mortgage/content/motor-claim/journey");

/** A world acting as Wrenfield; with a day, the demo clock moves there first. */
const insurerWorld = (day?: number) => motorClaimWorld({ note, podFetch, ready, setDay }, ME, day);

/** Wrenfield's own claim record, from its own pod. */
async function loadCase(): Promise<ClaimCase | undefined> {
  return (await journey()).readInsurerCase(await insurerWorld());
}

const usd = (amount: number) =>
  amount.toLocaleString("en-US", { currency: "USD", style: "currency" });

type ActionState = ReturnType<typeof useAction>["outcome"];

function ActionProblem({ outcome, what }: { outcome: ActionState; what: string }) {
  if (outcome.state === "refused") return <Refusal status={outcome.status}>{what}</Refusal>;
  if (outcome.state === "error") {
    return (
      <p role="alert" className="error">
        {outcome.message}
      </p>
    );
  }
  return null;
}

function CaseFacts({ claim }: { claim: ClaimCase }) {
  return (
    <dl className="facts" data-testid="mc-case">
      <div className="fact">
        <dt>Claim</dt>
        <dd>
          <span className="value">{claim.claimNumber}</span>
        </dd>
      </div>
      <div className="fact">
        <dt>Status</dt>
        <dd>{claim.completed ? "Closed" : "Open"}</dd>
      </div>
      <div className="fact">
        <dt>Latest</dt>
        <dd>{claim.description}</dd>
      </div>
      <div className="fact">
        <dt>Works under</dt>
        <dd>
          Grant C1 from Alex <span className="source">{MOTOR_GRANTS.C1.endLabel}</span>
        </dd>
      </div>
    </dl>
  );
}

/** Step 2: report a claim. */
export function MotorClaims() {
  const { outcome, reload } = usePodState(loadCase, [ME]);
  const report = useAction();
  const claim = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <Shell stage={undefined} page="Report a car claim">
      <p className="eyebrow">Car claims</p>
      <h1>Report a claim</h1>
      <p className="lede">
        Policy {MOTOR_POLICY.policyNumber}. Your claim file stays in your pod: we read it there, and
        only for this claim.
      </p>
      <ul className="asks" aria-label="What we ask to read">
        {MOTOR_GRANTS.C1.permissions.map((permission) => (
          <li key={permission.label}>
            {permission.label}
            <span className="chip">{MOTOR_GRANTS.C1.endLabel}</span>
          </li>
        ))}
      </ul>
      {outcome.state === "loading" ? <p role="status">Reading our records…</p> : null}
      {outcome.state === "error" ? (
        <p role="alert" className="error">
          {outcome.message}
        </p>
      ) : null}
      <button
        type="button"
        className="cta"
        data-tour="insurer-mc-report"
        disabled={report.outcome.state === "running" || claim !== undefined}
        onClick={() =>
          void report.run(async () => {
            await (await journey()).reportClaim(await insurerWorld(DAY.incident));
            reload();
          })
        }
      >
        {report.outcome.state === "running"
          ? "Reporting…"
          : claim === undefined
            ? "Report claim"
            : "Claim reported"}
      </button>
      <ActionProblem outcome={report.outcome} what="Alex's pod refused the request." />
      {claim !== undefined ? (
        <section className="card" aria-labelledby="mc-reported">
          <h2 id="mc-reported">Claim {claim.claimNumber} is open</h2>
          <p>
            Alex approved grant C1 in Cairn. A handler checks your licence and cover next.{" "}
            <Link href="/claims/desk">Go to the claims desk</Link>
          </p>
          <CaseFacts claim={claim} />
        </section>
      ) : null}
    </Shell>
  );
}

const photoSrc = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const captionOf = (url: string) =>
  PHOTOS.find((photo) => url.endsWith(photo.file))?.caption ?? "Photo";

function Review({ review }: { review: DeskReview }) {
  return (
    <>
      <ul className="asks" aria-label="Checked at source" data-testid="mc-checks">
        {review.checks.map((check) => (
          <li key={check.url}>
            {check.label}
            <span className="chip">
              {check.verified ? "Signature and status verified" : "Failed"}
            </span>
          </li>
        ))}
      </ul>
      <dl className="facts">
        <div className="fact">
          <dt>Incident</dt>
          <dd>
            {review.incident.location}. {review.incident.description}
          </dd>
        </div>
        {review.otherParty !== undefined ? (
          <div className="fact">
            <dt>Other driver</dt>
            <dd>
              {review.otherParty.name}, insured by {review.otherParty.insurerName} (
              {review.otherParty.policyNumber})
            </dd>
          </div>
        ) : null}
      </dl>
      <ul className="mc-photos" aria-label="Photos read from Alex's pod">
        {review.photos.map((photo) => (
          <li key={photo.url}>
            <img src={photoSrc(photo.svg)} alt={captionOf(photo.url)} />
          </li>
        ))}
      </ul>
      <div className="success" role="status">
        <strong>Damage report written to Alex's claim folder.</strong>
        <p>
          Referred to Anvil Collision Repair, which has asked Alex for the damage and the photos.
        </p>
      </div>
    </>
  );
}

function EstimateView({ estimate }: { estimate: RepairEstimate }) {
  return (
    <dl className="terms" data-testid="mc-estimate">
      {estimate.lineItems.map((item) => (
        <div key={item.value}>
          <dt>{item.name}</dt>
          <dd>{usd(item.amountUsd)}</dd>
        </div>
      ))}
      <div>
        <dt>
          <strong>Total</strong>
        </dt>
        <dd>
          <strong>{usd(estimate.totalUsd)}</strong> <span className="tag">illustrative</span>
        </dd>
      </div>
    </dl>
  );
}

/** Steps 3 and 7: the claims desk. */
export function MotorClaimsDesk() {
  const { outcome, reload } = usePodState(loadCase, [ME]);
  const check = useAction();
  const approve = useAction();
  const [review, setReview] = useState<DeskReview | undefined>();
  const [estimate, setEstimate] = useState<RepairEstimate | undefined>();
  const claim = outcome.state === "ok" ? outcome.value : undefined;
  const busy = check.outcome.state === "running" || approve.outcome.state === "running";
  return (
    <Shell stage={undefined} page="Claims desk">
      <p className="eyebrow">Claims desk · handler view</p>
      <h1>Claim {CLAIM_NUMBER}</h1>
      {outcome.state === "loading" ? <p role="status">Reading our records…</p> : null}
      {outcome.state === "ok" && claim === undefined ? (
        <p className="muted">
          No claim yet. It opens when Alex reports it on <Link href="/claims">the claims page</Link>
          .
        </p>
      ) : null}
      {claim !== undefined ? <CaseFacts claim={claim} /> : null}

      <section className="card" aria-labelledby="mc-check">
        <h2 id="mc-check">Check and assess</h2>
        <p className="muted">
          The licence and the policy are signed credentials: we check each signature, the issuer's
          key and its status list where they live. Then we read the claim file and write the damage
          report into it.
        </p>
        <button
          type="button"
          className="cta"
          data-tour="insurer-mc-check"
          disabled={busy || claim === undefined}
          onClick={() =>
            void check.run(async () => {
              setReview(await (await journey()).checkClaim(await insurerWorld(DAY.desk)));
              reload();
            })
          }
        >
          {check.outcome.state === "running" ? "Checking…" : "Check and assess"}
        </button>
        <ActionProblem
          outcome={check.outcome}
          what="Alex's pod refused the read: our claim grant has ended."
        />
        {review !== undefined ? <Review review={review} /> : null}
      </section>

      <section className="card" aria-labelledby="mc-approve">
        <h2 id="mc-approve">Repair estimate</h2>
        <p className="muted">
          Anvil writes its estimate into Alex's claim folder. We read it there and authorise the
          repair.
        </p>
        <button
          type="button"
          className="cta"
          data-tour="insurer-mc-approve-estimate"
          disabled={busy || claim === undefined || claim.acceptedEstimateIri !== undefined}
          onClick={() =>
            void approve.run(async () => {
              const result = await (await journey()).approveEstimate(
                await insurerWorld(DAY.estimate),
              );
              setEstimate(result.estimate);
              reload();
            })
          }
        >
          {approve.outcome.state === "running"
            ? "Approving…"
            : claim?.acceptedEstimateIri !== undefined
              ? "Estimate approved"
              : "Approve estimate"}
        </button>
        <ActionProblem
          outcome={approve.outcome}
          what="Alex's pod refused the read: our claim grant has ended."
        />
        {estimate !== undefined ? <EstimateView estimate={estimate} /> : null}
        {approve.outcome.state === "ok" ? (
          <div className="success" role="status">
            <strong>Estimate approved.</strong>
            <p>Anvil was told to go ahead. The approval is on our claim record.</p>
          </div>
        ) : null}
      </section>
    </Shell>
  );
}
