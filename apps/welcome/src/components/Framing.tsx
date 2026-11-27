// AUTHORED-BY Claude Opus 5.5
/** A demo's framing note and party tags, shown on its card and on its watch page. */
import type { Demo } from "../demos.ts";

export function Framing({ demo }: { demo: Demo }) {
  if (demo.framing === undefined) return null;
  return (
    <aside className="framing" aria-label={demo.framing.label}>
      <p className="framing__label">{demo.framing.label}</p>
      <p className="framing__text">{demo.framing.text}</p>
    </aside>
  );
}

export function Parties({ demo }: { demo: Demo }) {
  return (
    <div className="parties">
      <span className="parties__label">Who takes part</span>
      <ul className="parties__list" aria-label={`Who takes part in ${demo.title}`}>
        {demo.parties.map((party) => (
          <li key={party} className="party">
            {party}
          </li>
        ))}
      </ul>
    </div>
  );
}
