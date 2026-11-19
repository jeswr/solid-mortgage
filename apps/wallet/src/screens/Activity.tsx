// AUTHORED-BY Claude Opus 5.5
import { Screen } from "../App.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../components/ui.tsx";
import {
  consentState,
  explainConsentState,
  explainPurpose,
  labelOfPath,
  listOf,
  nameOfWebid,
  podPathOf,
} from "../explain.ts";
import { holderRoot, isoDay, readGrants, readReceipts } from "../pod-data.ts";
import { usePodData, useWallet } from "../runtime.tsx";

/** Activity: the consent records in `consents/`, newest first (the audit trail Cairn keeps). */
export function Activity() {
  const { world } = useWallet();
  const w = world();
  const data = usePodData(async (current) => {
    const [receipts, grants] = await Promise.all([readReceipts(current), readGrants(current)]);
    const names = new Map(grants.map((grant) => [grant.record.policy, grant.record.agreement]));
    return { names, receipts };
  });
  const dayLabel = (date: Date) => w.calendar.label(w.calendar.dayOf(isoDay(date)));
  const root = holderRoot(w);
  return (
    <Screen title="Activity" page="Activity" back={{ href: "/sharing", label: "Sharing" }}>
      <p className="lede">
        A consent record is written each time you give, withdraw or end access. Cairn keeps them in
        your pod; the access rules are what the pod enforces.
      </p>
      {data.error !== undefined ? <Problem error={data.error} /> : null}
      {data.data === undefined && data.error === undefined ? (
        <Loading what="your consent records" />
      ) : null}
      {data.data?.receipts.length === 0 ? <Empty>No consent records yet.</Empty> : null}
      <ol className="timeline">
        {data.data?.receipts.map(({ url, receipt }) => {
          const state = consentState(receipt.consentStatus);
          const agreement =
            receipt.policyIri === undefined ? undefined : data.data?.names.get(receipt.policyIri);
          const targets = [...receipt.targetIris].sort().map((target) => {
            const path = podPathOf(target, root);
            return path === undefined ? nameOfWebid(target) : labelOfPath(path);
          });
          return (
            <li key={url} className={`receipt receipt-${state}`}>
              <OrgBadge webid={receipt.dataControllerIri} />
              <div>
                <p className="receipt-head">
                  <strong>{explainConsentState(state)}</strong>
                  {" · "}
                  {nameOfWebid(receipt.dataControllerIri)}
                </p>
                <p>
                  {agreement === undefined
                    ? explainPurpose(receipt.purposeIri)
                    : `${agreement.name} (${agreement.grantCode})`}
                </p>
                <p className="muted small">
                  {dayLabel(receipt.issued)} · covers {listOf(targets)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}
