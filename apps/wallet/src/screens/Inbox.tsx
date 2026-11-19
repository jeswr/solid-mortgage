// AUTHORED-BY Claude Opus 5.5
import { Link } from "wouter";
import { Screen } from "../App.tsx";
import { Empty, Loading, OrgBadge, Problem } from "../components/ui.tsx";
import { labelOfPath, nameOfWebid } from "../explain.ts";
import { isoDay, readDelivered } from "../pod-data.ts";
import { usePodData, useWallet } from "../runtime.tsx";

/** Inbox: documents organisations delivered into the pod (loan, closing and servicing papers). */
export function Inbox() {
  const { world } = useWallet();
  const w = world();
  const documents = usePodData(readDelivered);
  const dayLabel = (date: Date) => w.calendar.label(w.calendar.dayOf(isoDay(date)));
  return (
    <Screen title="Inbox">
      <p className="lede">
        Documents organisations wrote into your pod under a grant. You did not have to upload
        anything. Access requests are under <Link href="/requests">Requests</Link>.
      </p>
      {documents.error !== undefined ? <Problem error={documents.error} /> : null}
      {documents.data === undefined && documents.error === undefined ? (
        <Loading what="delivered documents" />
      ) : null}
      {documents.data?.length === 0 ? <Empty>Nothing has been delivered yet.</Empty> : null}
      <ul className="stack">
        {documents.data?.map((item) => (
          <li key={item.url} className="card delivered">
            <div className="card-head">
              {item.from === undefined ? null : <OrgBadge webid={item.from} />}
              <div>
                <h2>{item.name}</h2>
                <p className="muted">
                  {item.from === undefined ? "Sender not stated" : nameOfWebid(item.from)}
                  {item.issued === undefined ? "" : ` · ${dayLabel(item.issued)}`}
                </p>
              </div>
            </div>
            {item.description === undefined ? null : <p>{item.description}</p>}
            <p className="muted small">
              In {labelOfPath(`${item.path.split("/").slice(0, -1).join("/")}/`)}
            </p>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
