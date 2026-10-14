import { StatCard } from "@mortgage/ui";
import Link from "next/link";
import { site } from "./site";

const beats = [
  {
    href: "/underwriting",
    title: "Run the AUS on the loan file",
    scene: "Apply with data from the pod",
    body: "Alex gives the AUS access to the loan file. The AUS checks each credential, then applies the risk rules.",
  },
  {
    href: "/underwriting",
    title: "Run it again after re-verification",
    scene: "Re-verify employment before closing",
    body: "If the employment credential has expired, the AUS reports “Unable to validate”. Once the provider re-issues it, the lender runs the AUS again.",
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
        returns a recommendation. The lender&apos;s underwriter makes the credit decision.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <StatCard
          detail="signature, issuer, dates and status"
          label="Credentials checked"
          value="4"
        />
        <StatCard detail="illustrative thresholds, not a GSE model" label="Risk rules" value="4" />
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
          Run the AUS →
        </Link>
      </p>
    </main>
  );
}
