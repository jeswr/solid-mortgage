import { StatCard } from "@mortgage/ui";
import Link from "next/link";
import { site } from "./site";

const beats = [
  {
    title: "Recommendation for the lender",
    scene: "Apply with data from the pod",
    body: "Alex gives the AUS access to the loan file. The AUS checks each credential, then applies the demo thresholds and returns a recommendation: Accept, Caution or Unable to validate.",
  },
  {
    title: "Unable to validate",
    scene: "When a credential fails its checks",
    body: "If a credential fails its signature, issuer, date or status checks, the AUS reports “Unable to validate” and skips the risk rules.",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Automated underwriting
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {site.appName}
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
        The {site.role} (AUS) — the {site.organization} role — checks Alex&apos;s loan file and
        returns a recommendation. The recommendation is not a credit decision; the lender&apos;s
        underwriter makes that decision. Local requests run as Alex; separate organisation
        permissions are not enforced here.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <StatCard
          detail="signature, issuer, dates and status"
          label="Credentials checked"
          value="4"
        />
        <StatCard
          detail="illustrative thresholds, not a GSE model"
          label="Demo thresholds"
          value="3"
        />
      </div>

      <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2">
        {beats.map((item) => (
          <li className="rounded-lg border border-border bg-card p-5" key={item.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {item.scene}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-card-foreground">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-muted-foreground">
        <Link className="font-semibold text-foreground hover:underline" href="/underwriting">
          Run AUS →
        </Link>
      </p>
    </main>
  );
}
