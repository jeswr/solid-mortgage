// AUTHORED-BY Claude Opus 5.5
/**
 * The pods this wallet holds, one button each (docs/rebuild/flows.md §1: one Cairn holds Alex's,
 * Maya's, Rosa's and Northwind's pods). Pressing one shows that holder's pod and acts as that
 * holder from then on; the pod server checks every request against that holder's access rules.
 */
import { HOLDER_IDS, HOLDERS } from "@mortgage/demo-kit/registry";
import { useWallet } from "../runtime.tsx";

export function HolderSwitcher() {
  const { holder, switchHolder } = useWallet();
  return (
    <nav className="holders" aria-label="Pods in this wallet">
      <ul>
        {HOLDER_IDS.map((id) => {
          const record = HOLDERS[id];
          const current = id === holder;
          return (
            <li key={id}>
              <button
                type="button"
                className="holder"
                aria-pressed={current}
                data-tour={`wallet-holder-${id}`}
                onClick={() => switchHolder(id)}
              >
                <span className="holder-name">{record.short}</span>
                <span className="holder-kind">
                  {record.kind === "business" ? "Business" : "Person"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
