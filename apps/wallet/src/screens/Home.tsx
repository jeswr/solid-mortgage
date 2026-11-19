// AUTHORED-BY Claude Opus 5.5
import { MORTGAGE_HOLDER } from "@mortgage/content/mortgage/mount";
import { HOLDERS } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { Link } from "wouter";
import { Screen } from "../App.tsx";
import { HolderSwitcher } from "../components/HolderSwitcher.tsx";
import { Icon } from "../components/Icon.tsx";
import { Loading, Problem } from "../components/ui.tsx";
import { readDrawers, readGrants, readRequests } from "../pod-data.ts";
import { usePodData, useWallet } from "../runtime.tsx";

/** Home: the pod's drawers and how much each holds, read from the pod's own listing. */
export function Home() {
  const { day, holder, world } = useWallet();
  const shown = HOLDERS[holder];
  const drawers = usePodData(readDrawers);
  const summary = usePodData(async (w) => {
    const [requests, grants] = await Promise.all([readRequests(w), readGrants(w)]);
    return {
      active: grants.filter((grant) => grant.record.state === "active").length,
      waiting: requests.filter((item) => !item.answered).length,
    };
  });
  const calendar = world().calendar;
  return (
    <Screen title="Your pod" page={null}>
      <p className="lede">
        {shown.kind === "business"
          ? `Everything ${shown.name} keeps is in one store it controls, operated by ${shown.operator ?? "its owner"}.`
          : `${shown.short}, everything below is in one store you control.`}{" "}
        {calendar.label(day)}.
      </p>
      <HolderSwitcher />
      <div className="tiles">
        <Link href="/requests" className="tile">
          <span className="tile-n">{summary.data?.waiting ?? "–"}</span>
          <span className="tile-l">waiting for you</span>
        </Link>
        <Link href="/sharing" className="tile">
          <span className="tile-n">{summary.data?.active ?? "–"}</span>
          <span className="tile-l">sharing now</span>
        </Link>
      </div>
      <section className="card" aria-labelledby="drawers-heading">
        <h2 id="drawers-heading">Drawers</h2>
        {drawers.error !== undefined ? <Problem error={drawers.error} /> : null}
        {drawers.data === undefined && drawers.error === undefined ? (
          <Loading what="your drawers" />
        ) : null}
        {drawers.data !== undefined ? (
          <ul className="drawers">
            {drawers.data.map((drawer) => (
              <li key={drawer.path}>
                <span className="drawer-label">{drawer.label}</span>
                <span className="drawer-count">
                  {drawer.count} {drawer.count === 1 ? "item" : "items"}
                </span>
                {drawer.subfolders.length > 0 ? (
                  <ul className="subfolders">
                    {drawer.subfolders.map((folder) => (
                      <li key={folder.path}>
                        <span>{folder.label}</span>
                        <span className="drawer-count">{folder.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      {holder !== MORTGAGE_HOLDER.id ? null : (
        <section className="card prove-card" aria-labelledby="prove-heading">
          <h2 id="prove-heading">Prove without sharing</h2>
          <p>Answer a lender's questions with a proof. The lender never sees your figures.</p>
          {/* A full navigation: /prove is the one route served cross-origin isolated. */}
          <a className="button primary" href={appUrl("wallet", "prove")}>
            Open Prove <Icon name="chevron-right" />
          </a>
        </section>
      )}
      <p className="more-links">
        <Link href="/activity">Consent history</Link>
      </p>
    </Screen>
  );
}
