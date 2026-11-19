import { orgThemes, themeCssProperties } from "@mortgage/ui";
import Link from "next/link";
import { ISSUER_FLOW_IDS } from "@/lib/server/config";
import { ISSUER_FLOWS } from "@/lib/server/flows";
import { site } from "./site";

const FLOW_HREF = {
  assets: "/assets",
  credit: "/credit",
  employment: "/employment",
} as const;

/** Glossary role names (the shared theme role strings predate the glossary). */
const FLOW_ROLE = {
  assets: "Asset verification provider",
  credit: "Credit bureau",
  employment: "Employment verification provider",
} as const;

const FLOW_ISSUES = {
  assets: "Issues an asset credential.",
  credit: "Issues a credit-score credential.",
  employment: "Issues an employment and income credential.",
} as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 pb-28">
      <section>
        <p className="mb-3 font-semibold text-muted-foreground text-sm uppercase tracking-[0.2em]">
          Verify income, assets and credit
        </p>
        <h1 className="font-semibold text-4xl text-foreground tracking-tight sm:text-5xl">
          {site.appName}
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          Create simulated employment, asset and credit-score credentials in Alex&apos;s pod. A
          lender can check a shared credential; acceptance depends on its requirements.
        </p>
      </section>

      <section aria-labelledby="issuer-flows">
        <h2 className="font-semibold text-foreground text-xl" id="issuer-flows">
          Verification providers
        </h2>
        <ul className="mt-4 grid list-none gap-4 p-0 md:grid-cols-3">
          {ISSUER_FLOW_IDS.map((id) => {
            const definition = ISSUER_FLOWS[id];
            const theme = orgThemes[definition.themeId];
            return (
              <li key={id}>
                <Link
                  className="block h-full rounded-lg border border-border bg-card p-5 no-underline transition-shadow hover:shadow-md"
                  href={FLOW_HREF[id]}
                  style={themeCssProperties(theme)}
                >
                  <p
                    className="text-xs uppercase tracking-[0.15em]"
                    style={{ color: "var(--primary)" }}
                  >
                    {FLOW_ROLE[id]}
                  </p>
                  <p className="mt-2 font-semibold text-card-foreground">
                    modelled on {theme.modelledOn}
                  </p>
                  <p className="mt-3 text-muted-foreground text-sm">{FLOW_ISSUES[id]}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="freshness" className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-card-foreground text-xl" id="freshness">
          Replace the employment credential before closing
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground text-sm">
          The employment credential has a short validity period. When it expires, the provider can
          issue a replacement credential and revoke the previous version. The demo reuses the same
          simulated data and does not contact an employer, so this is not employment
          re-verification.
        </p>
      </section>
    </main>
  );
}
