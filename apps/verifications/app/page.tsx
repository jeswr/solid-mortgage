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

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 pb-28">
      <section>
        <p className="mb-3 font-semibold text-muted-foreground text-sm uppercase tracking-[0.2em]">
          Solid Mortgage Showcase — scene 1: fill the vault
        </p>
        <h1 className="font-semibold text-4xl text-foreground tracking-tight sm:text-5xl">
          {site.appName}
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          Three branded issuer flows — modelled on the GSE-accepted verification suppliers of the
          Fannie AIM / DU validation programmes — sign employment+income, asset, and credit-score
          verifiable credentials straight into the borrower's Data Vault pod. Verified once, re-used
          with every lender; when a credential goes stale before closing, one click re-issues it
          through the existing grant.
        </p>
      </section>

      <section aria-labelledby="issuer-flows">
        <h2 className="font-semibold text-foreground text-xl" id="issuer-flows">
          Issuer flows
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
                    {theme.role}
                  </p>
                  <p className="mt-2 font-semibold text-card-foreground">
                    modelled on {theme.modelledOn}
                  </p>
                  <p className="mt-3 text-muted-foreground text-sm">
                    Issues a <code>{definition.kind}</code>
                    {definition.anchor !== undefined && " plus its ZK operand anchor"} into the
                    borrower's pod, with a per-issuer Bitstring revocation list.
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="freshness" className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-card-foreground text-xl" id="freshness">
          Nothing goes stale
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground text-sm">
          Scene 4 — the pre-close freshness check. The employment credential carries a genuinely
          short validity window; when it lapses, the lender's green tick goes grey and the borrower
          re-issues in one click through the grant they already hold. The old credential's
          status-list index is revoked, the replacement verifies immediately — freshness is
          re-issuance, the status list signals revocation only.
        </p>
      </section>
    </main>
  );
}
