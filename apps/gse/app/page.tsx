import { StatCard } from "@mortgage/ui";
import Link from "next/link";
import { site } from "./site";

const beats = [
  {
    href: "/underwriting",
    title: "Underwrite from granted data",
    scene: "Scene 3",
    body: "The borrower grants scoped pod access once; the AUS reads the loan file straight from the Data Vault — application, employment, assets, credit, and appraisal — and every credential is cryptographically verified before a single number is risk-scored.",
  },
  {
    href: "/underwriting",
    title: "Nothing goes stale",
    scene: "Scene 4",
    body: "Thirty days later the employment credential's validity window lapses. The evidence gate refers the file instead of trusting stale data; the borrower re-issues in one click through the existing grant and the AUS re-runs on the fresh credential.",
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
        The {site.role} (AUS) seat in the journey — the {site.organization} role in the GSE model.
        Deterministic underwriting rules run over the borrower's granted loan file; the full
        findings report returns to the requesting party, and the decision document lands in the
        borrower's pod.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          detail="saved by GSE data-validation programmes"
          label="Days back"
          value="up to 12"
        />
        <StatCard
          detail="every rule readable, every run repeatable"
          value="100%"
          label="Deterministic"
        />
        <StatCard
          detail="unverifiable evidence never risk-scores"
          label="Fail-closed"
          value="refer"
        />
      </div>

      <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2">
        {beats.map((item) => (
          <li className="rounded-lg border border-border bg-card p-5" key={item.title}>
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

      <p className="mt-10 text-sm text-muted-foreground">
        <Link className="font-semibold text-foreground hover:underline" href="/underwriting">
          Open the underwriting console →
        </Link>
      </p>
    </main>
  );
}
