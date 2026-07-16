import Link from "next/link";
import { site } from "./site";

const scenes = [
  {
    href: "/prequal",
    title: "Pre-qualify without sharing your numbers",
    scene: "Scene 2",
    body: "Prove income and credit-score thresholds with zero-knowledge proofs — no values revealed, no credit pull, no PII left behind.",
  },
  {
    href: "/application",
    title: "One-click application",
    scene: "Scene 3",
    body: "Grant scoped pod access; the URLA subset prefills from your pod and the Loan Estimate lands back in it.",
  },
  {
    href: "/freshness",
    title: "Nothing goes stale",
    scene: "Scene 4",
    body: "Pre-close freshness re-check of the employment credential, with a one-click re-issue through the existing grant.",
  },
  {
    href: "/pipeline",
    title: "Loan-officer pipeline",
    scene: "Lender view",
    body: "The originator's side of the same journey — applications, evidence status, and decisions.",
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
        The {site.role} seat in the journey, modelled on {site.organization}: pre-qualification
        without disclosure, application from granted pod data, and a freshness re-check before
        closing.
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
