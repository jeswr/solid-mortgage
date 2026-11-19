// AUTHORED-BY Claude Opus 5.5
import { approveRequest } from "@mortgage/content/mortgage/grants";
import type { World } from "@mortgage/content/mortgage/world";
import { remove } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import type { AccessRequest } from "@mortgage/data-model";
import { isAppSlug, type OrgSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { Screen } from "../App.tsx";
import { Icon } from "../components/Icon.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../components/ui.tsx";
import {
  endOfPermissions,
  explainEnd,
  explainPermissions,
  explainPurpose,
  nameOfWebid,
  safeReturnUrl,
} from "../explain.ts";
import { alexRoot, type RequestItem, readRequests } from "../pod-data.ts";
import { usePodData, useWallet } from "../runtime.tsx";
import { continueTour, useTourStep } from "../tour-link.ts";

/** The `data-tour` names of the two approvals the tour drives (content/mortgage/README.md). */
const TOUR_TARGETS: Readonly<Record<string, string>> = {
  G4: "wallet-approve-g4",
  G8: "wallet-approve-g8",
};

/** The consent screen's words, read from the request itself. */
export function useRequestWords(request: AccessRequest) {
  const { world } = useWallet();
  const w = world();
  const permissions = request.permissions;
  const sentences = explainPermissions(
    permissions.map((permission) => ({
      assignee: permission.assigneeIri,
      modes: permission.modes,
      targets: [...permission.targetIris].sort(),
    })),
    request.assigneeIri,
    alexRoot(w),
  );
  return {
    end: explainEnd(endOfPermissions(permissions.map((permission) => permission.end)), w.calendar),
    main: sentences.filter((sentence) => !sentence.onward),
    onward: sentences.filter((sentence) => sentence.onward),
    purpose: explainPurpose(permissions[0]?.purposeIri),
    who: nameOfWebid(request.assigneeIri),
  };
}

/**
 * Steps 7 and 21 start in another app: Juniper's Start screen and Marigold's Connect screen post
 * the request, the wallet approves it, and the visitor goes back for the completion half
 * (content/mortgage/tour.ts). When the tour is on one of these steps and the request has not
 * arrived, the wallet says where it starts, and offers to have that organisation ask now, which
 * is what "Do it for me" presses.
 */
interface Handoff {
  readonly code: string;
  readonly org: OrgSlug;
  /** Where the request starts in the other app. */
  readonly start: string;
  readonly startLabel: string;
  /** Where the other app finishes the step once the grant is in force. */
  readonly back: string;
  readonly ask: (world: World) => Promise<string>;
}

const HANDOFFS: Readonly<Record<string, Handoff>> = {
  "apply-consent": {
    ask: async (world) =>
      (await import("@mortgage/content/mortgage/journey")).requestApplicationAccess(world),
    back: "/application",
    code: "G4",
    org: "lender",
    start: "/",
    startLabel: "Start screen",
  },
  "servicer-connect": {
    ask: async (world) =>
      (await import("@mortgage/content/mortgage/journey")).requestServicerAccess(world),
    back: "/connect",
    code: "G8",
    org: "servicer",
    start: "/connect",
    startLabel: "Connect screen",
  },
};

/** A request the wallet had another organisation send (the hand-off stand-in). */
interface Asked {
  readonly url: string;
  readonly back: string;
  /** Pressed by the tour's cursor: carry on to Approve once the request is on screen. */
  readonly byTour: boolean;
}

function HandoffCard({ handoff, onAsked }: { handoff: Handoff; onAsked: (asked: Asked) => void }) {
  const { run } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const name = ORGS[handoff.org].organisation;
  const ask = async (event: MouseEvent<HTMLButtonElement>) => {
    // The tour's cursor clicks with a synthetic event; a person's click is trusted.
    const byTour = !event.nativeEvent.isTrusted;
    setBusy(true);
    setError(undefined);
    try {
      const url = await run((world) => handoff.ask(world));
      onAsked({ back: appUrl(handoff.org, handoff.back), byTour, url });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card handoff" aria-labelledby="handoff-heading">
      <h2 id="handoff-heading">Waiting for {name}</h2>
      <p>
        {name} has not sent its request yet. It starts on the{" "}
        <a href={appUrl(handoff.org, handoff.start)}>{handoff.startLabel}</a> of {name}, and comes
        here for your answer.
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      <div className="actions">
        <a className="button ghost" href={appUrl(handoff.org, handoff.start)}>
          Go to {name}
        </a>
        <button
          type="button"
          className="button primary"
          data-tour={TOUR_TARGETS[handoff.code]}
          disabled={busy}
          onClick={ask}
        >
          {busy ? "Asking…" : `Have ${name} ask now`}
        </button>
      </div>
    </section>
  );
}

type Outcome = { kind: "approved" | "declined"; who: string };

function ConsentCard({
  item,
  tourTarget,
  onOutcome,
}: {
  item: RequestItem;
  tourTarget: string | undefined;
  onOutcome: (outcome: Outcome) => void;
}) {
  const { run } = useWallet();
  const { request } = item;
  const words = useRequestWords(request);
  const [busy, setBusy] = useState<"approve" | "decline" | undefined>();
  const [error, setError] = useState<unknown>();
  const headingId = `request-${request.grantCode}-${item.url.split("/").pop()}`;

  const act = async (kind: "approve" | "decline") => {
    setBusy(kind);
    setError(undefined);
    try {
      if (kind === "approve") await run((world) => approveRequest(world, item.url));
      // Declining shares nothing: the request leaves the inbox and no grant is written.
      else await run((world) => remove(world.fetchAs("alex"), item.url));
      onOutcome({ kind: kind === "approve" ? "approved" : "declined", who: words.who });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <article className="card consent" aria-labelledby={headingId}>
      <div className="card-head">
        <OrgBadge webid={request.assigneeIri} />
        <div>
          <h2 id={headingId}>{words.who}</h2>
          <p className="muted">
            asks for “{request.name}” · {request.grantCode}
          </p>
        </div>
      </div>
      <dl className="consent-facts">
        <div>
          <dt>What</dt>
          <dd>
            <ul>
              {words.main.map((sentence) => (
                <li key={sentence.text}>
                  {sentence.who} {sentence.text}.
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt>Why</dt>
          <dd>
            {request.description}. <span className="muted">({words.purpose})</span>
          </dd>
        </div>
        <div>
          <dt>Until</dt>
          <dd>{words.end}</dd>
        </div>
        <div>
          <dt>Who else</dt>
          <dd>
            {words.onward.length === 0 ? (
              "Nobody else."
            ) : (
              <ul>
                {words.onward.map((sentence) => (
                  <li key={`${sentence.who}-${sentence.text}`}>
                    {sentence.who} {sentence.text}.
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
      <p className="small muted">
        Approving writes three things to your pod together: the agreement, a consent record and the
        access rules the pod enforces. You can withdraw it in Sharing at any time.
      </p>
      {error !== undefined ? <Problem error={error} /> : null}
      {item.answered ? (
        <p className="answered">
          <Icon name="check" /> Already answered. See <Link href="/sharing">Sharing</Link>.
        </p>
      ) : (
        <div className="actions">
          <button
            type="button"
            className="button ghost"
            disabled={busy !== undefined}
            onClick={() => act("decline")}
          >
            {busy === "decline" ? "Declining…" : "Decline"}
          </button>
          <button
            type="button"
            className="button primary"
            data-tour={tourTarget}
            disabled={busy !== undefined}
            onClick={() => act("approve")}
          >
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
        </div>
      )}
    </article>
  );
}

/** Requests: organisations asking for access. The consent screen of design.md section b.3. */
export function Requests() {
  const search = new URLSearchParams(useSearch());
  const [asked, setAsked] = useState<Asked>();
  const focus = search.get("request") ?? asked?.url ?? null;
  const requests = usePodData(readRequests);
  const [outcome, setOutcome] = useState<Outcome | undefined>();
  const returnTo = safeReturnUrl(
    search.get("return") ?? asked?.back ?? null,
    window.location,
    isAppSlug,
  );
  const step = useTourStep();

  const onOutcome = (next: Outcome) => {
    setOutcome(next);
    // Back to the organisation that asked: only to an app of this site (safeReturnUrl).
    if (returnTo !== undefined) window.location.assign(returnTo);
  };

  const items = requests.data ?? [];
  const focused = focus === null ? undefined : items.find((item) => item.url === focus);
  // "Do it for me" carries on once the request it had sent is on screen: the cursor moves to
  // that request's Approve button. Once only: the stand-in is gone by then.
  const continued = useRef(false);
  const arrived = asked !== undefined && focused?.url === asked.url;
  useEffect(() => {
    if (!arrived || asked?.byTour !== true || continued.current) return;
    continued.current = true;
    void continueTour().catch(() => undefined);
  }, [arrived, asked]);
  const waiting = items.filter((item) => !item.answered && item !== focused);
  const answered = items.filter((item) => item.answered && item !== focused);
  // The tour target goes on the newest unanswered request of each code, and only one of each.
  const targeted = new Map<string, string>();
  for (const item of [...(focused === undefined ? [] : [focused]), ...waiting]) {
    const code = item.request.grantCode;
    if (!item.answered && TOUR_TARGETS[code] !== undefined && !targeted.has(code)) {
      targeted.set(code, item.url);
    }
  }
  const handoff = step === undefined ? undefined : HANDOFFS[step];
  // Only while that grant's request has neither arrived nor been answered.
  const awaiting =
    handoff !== undefined &&
    asked === undefined &&
    requests.data !== undefined &&
    !items.some((item) => item.request.grantCode === handoff.code)
      ? handoff
      : undefined;
  const targetOf = (item: RequestItem) =>
    targeted.get(item.request.grantCode) === item.url
      ? TOUR_TARGETS[item.request.grantCode]
      : undefined;

  return (
    <Screen title="Requests">
      {outcome !== undefined ? (
        <div className="notice success" role="status">
          <strong>{outcome.kind === "approved" ? "Shared" : "Declined"}</strong>
          <p>
            {outcome.kind === "approved"
              ? `${outcome.who} can now use what you approved. The consent record is in Activity.`
              : `Nothing was shared with ${outcome.who}. The request was removed from your inbox.`}
            {returnTo === undefined ? null : " Taking you back…"}
          </p>
        </div>
      ) : null}
      {requests.error !== undefined ? <Problem error={requests.error} /> : null}
      {requests.data === undefined && requests.error === undefined ? (
        <Loading what="your requests" />
      ) : null}
      {focus !== null && requests.data !== undefined && focused === undefined ? (
        <div className="notice problem" role="alert">
          <strong>Request not found</strong>
          <p>That request is not in your inbox. It may have been answered already.</p>
        </div>
      ) : null}
      {focused !== undefined ? (
        <ConsentCard item={focused} tourTarget={targetOf(focused)} onOutcome={onOutcome} />
      ) : null}
      {awaiting !== undefined ? <HandoffCard handoff={awaiting} onAsked={setAsked} /> : null}
      {requests.data !== undefined &&
      waiting.length === 0 &&
      focused === undefined &&
      awaiting === undefined ? (
        <Empty>No organisation is waiting for an answer.</Empty>
      ) : null}
      {waiting.map((item) => (
        <ConsentCard key={item.url} item={item} tourTarget={targetOf(item)} onOutcome={onOutcome} />
      ))}
      {answered.length > 0 ? (
        <details className="card answered-list">
          <summary>Answered requests ({answered.length})</summary>
          <ul>
            {answered.map((item) => (
              <li key={item.url}>
                {nameOfWebid(item.request.assigneeIri)}: {item.request.name} (
                {item.request.grantCode})
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Screen>
  );
}
