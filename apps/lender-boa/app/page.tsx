import Link from "next/link";
import { site } from "./site";

const scenes = [
  {
    href: "/prequal",
    title: "Prequalify without disclosing income or credit score",
    scene: "Scene 2",
    body: "Alex sends threshold proofs, not the exact figures.",
  },
  {
    href: "/application",
    title: "Apply with data from the pod",
    scene: "Scene 3",
    body: "The application prefills from data Alex lets the lender read.",
  },
  {
    href: "/freshness",
    title: "Re-verify employment before closing",
    scene: "Scene 4",
    body: "The lender checks that the employment credential is still valid.",
  },
  {
    href: "/pipeline",
    title: "Loan pipeline",
    scene: "Lender view",
    body: "Applications, conditions and status.",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Solid Mortgage Showcase
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {site.appName}
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
        Lender, modelled on {site.organization}. Alex prequalifies, applies, and is re-verified
        before closing.
      </p>
      <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2">
        {scenes.map((item) => (
          <li key={item.href} className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {item.scene}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-card-foreground">
              <Link className="hover:underline" href={item.href}>
                {item.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
