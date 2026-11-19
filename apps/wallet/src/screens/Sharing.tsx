// AUTHORED-BY Claude Opus 5.5
import {
  GRANT_CODES,
  type GrantCode,
  readAcl,
  revokeGrant,
} from "@mortgage/content/mortgage/grants";
import { useState } from "react";
import { Link } from "wouter";
import { Screen } from "../App.tsx";
import { Icon } from "../components/Icon.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../components/ui.tsx";
import {
  consentState,
  endOfPermissions,
  explainConsentState,
  explainEnd,
  explainGrantState,
  explainPermissions,
  explainPurpose,
  labelOfPath,
  listOf,
  nameOfWebid,
  orgOfWebid,
  podPathOf,
} from "../explain.ts";
import { alexRoot, type GrantItem, isoDay, readGrants } from "../pod-data.ts";
import { usePodData, useWallet } from "../runtime.tsx";

const isGrantCode = (code: string): code is GrantCode =>
  (GRANT_CODES as readonly string[]).includes(code);

/** The access rules in force on each target of a grant that name its organisations. */
function AccessRules({ grant }: { grant: GrantItem }) {
  const agreement = grant.record.agreement;
  const rules = usePodData(async (w) => {
    const root = alexRoot(w);
    const agents = new Set(agreement.permissions.map((permission) => permission.assigneeIri));
    const targets = [
      ...new Set(agreement.permissions.flatMap((permission) => [...permission.targetIris])),
    ].sort();
    const lines: string[] = [];
    for (const target of targets) {
      const authorizations = await readAcl(w.fetchAs("alex"), `${target}.acl`);
      for (const authorization of authorizations) {
        for (const agent of authorization.agent) {
          if (!agents.has(agent)) continue;
          const modes = [...authorization.mode].map((mode) => mode.split("#").pop() ?? mode);
          const path = podPathOf(target, root) ?? target;
          lines.push(
            `${nameOfWebid(agent)}: ${listOf(modes)} on ${labelOfPath(path)}${
              authorization.default === undefined ? "" : " and what is in it"
            }`,
          );
        }
      }
    }
    return lines;
  });
  return (
    <div className="rules" aria-live="polite">
      {rules.error !== undefined ? <Problem error={rules.error} /> : null}
      {rules.data === undefined && rules.error === undefined ? (
        <Loading what="the access rules" />
      ) : null}
      {rules.data?.length === 0 ? (
        <p>
          <Icon name="shield" /> No access rule in your pod names{" "}
          {nameOfWebid(agreement.assigneeIri)} any more.
        </p>
      ) : null}
      {rules.data !== undefined && rules.data.length > 0 ? (
        <ul>
          {rules.data.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function GrantCard({ grant }: { grant: GrantItem }) {
  const { run, world } = useWallet();
  const w = world();
  const { record, history } = grant;
  const agreement = record.agreement;
  const who = nameOfWebid(agreement.assigneeIri);
  const sentences = explainPermissions(
    agreement.permissions.map((permission) => ({
      assignee: permission.assigneeIri,
      modes: permission.modes,
      targets: [...permission.targetIris].sort(),
    })),
    agreement.assigneeIri,
    alexRoot(w),
  );
  const end = explainEnd(
    endOfPermissions(agreement.permissions.map((permission) => permission.end)),
    w.calendar,
  );
  const dayLabel = (date: Date) => w.calendar.label(w.calendar.dayOf(isoDay(date)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [showRules, setShowRules] = useState(false);
  // Step 22 withdraws G4, Juniper's application grant (content/mortgage/journey.ts revokeJuniper).
  const isJuniper = record.code === "G4" && orgOfWebid(agreement.assigneeIri) === "lender";
  const headingId = `grant-${record.code}`;

  const revoke = async () => {
    if (!isGrantCode(record.code)) return;
    const code = record.code;
    setBusy(true);
    setError(undefined);
    try {
      await run((current) => revokeGrant(current, code));
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`card grant state-${record.state}`} aria-labelledby={headingId}>
      <div className="card-head">
        <OrgBadge webid={agreement.assigneeIri} />
        <div>
          <h2 id={headingId}>{who}</h2>
          <p className="muted">
            {agreement.name} · {record.code}
          </p>
        </div>
        <span className={`state state-${record.state}`}>{explainGrantState(record.state)}</span>
      </div>
      <ul className="plain">
        {sentences.map((sentence) => (
          <li key={`${sentence.who}-${sentence.text}`}>
            {sentence.onward ? <span className="onward">Onward: </span> : null}
            {sentence.who} {sentence.text}.
          </li>
        ))}
      </ul>
      <dl className="consent-facts compact">
        <div>
          <dt>Why</dt>
          <dd>
            {agreement.description}.{" "}
            <span className="muted">({explainPurpose(agreement.permissions[0]?.purposeIri)})</span>
          </dd>
        </div>
        <div>
          <dt>Until</dt>
          <dd>{end}</dd>
        </div>
      </dl>
      <ol className="history" aria-label={`Consent history for ${record.code}`}>
        {history.map((item) => {
          const state = consentState(item.receipt.consentStatus);
          return (
            <li key={item.url} className={`history-${state}`}>
              <span>{explainConsentState(state)}</span>
              <span className="muted">{dayLabel(item.receipt.issued)}</span>
            </li>
          );
        })}
      </ol>
      {error !== undefined ? <Problem error={error} /> : null}
      <div className="actions">
        <button
          type="button"
          className="button ghost"
          aria-expanded={showRules}
          onClick={() => setShowRules((shown) => !shown)}
        >
          {showRules ? "Hide access rules" : "Show access rules"}
        </button>
        {record.state === "active" ? (
          <button
            type="button"
            className="button revoke"
            data-tour={isJuniper ? "wallet-revoke-juniper" : undefined}
            disabled={busy}
            onClick={revoke}
          >
            {busy ? "Revoking…" : "Revoke"}
          </button>
        ) : null}
      </div>
      {showRules ? <AccessRules grant={grant} /> : null}
    </article>
  );
}

/** Sharing: every grant by organisation, with scope, end and state; Revoke for active ones. */
export function Sharing() {
  const grants = usePodData(readGrants);
  const active = grants.data?.filter((grant) => grant.record.state === "active") ?? [];
  const ended = grants.data?.filter((grant) => grant.record.state !== "active") ?? [];
  return (
    <Screen title="Sharing">
      <p className="lede">
        Who can use what in your pod, and until when. Each line comes from the agreement and consent
        records stored in your pod.
      </p>
      {grants.error !== undefined ? <Problem error={grants.error} /> : null}
      {grants.data === undefined && grants.error === undefined ? (
        <Loading what="your sharing" />
      ) : null}
      {grants.data?.length === 0 ? <Empty>You are not sharing anything yet.</Empty> : null}
      {active.length > 0 ? <h2 className="section-title">Sharing now</h2> : null}
      {active.map((grant) => (
        <GrantCard key={grant.record.policy} grant={grant} />
      ))}
      {ended.length > 0 ? <h2 className="section-title">Ended</h2> : null}
      {ended.map((grant) => (
        <GrantCard key={grant.record.policy} grant={grant} />
      ))}
      <p className="more-links">
        <Link href="/activity">
          Consent history <Icon name="chevron-right" />
        </Link>
      </p>
    </Screen>
  );
}
