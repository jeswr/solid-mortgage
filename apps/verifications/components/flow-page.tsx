/**
 * The shared branded issuer-flow page (server component): per-org theme
 * tokens, role-first framing, the PINNED demo-persona values the flow signs
 * (marked illustrative), what lands in the vault (credential + operand anchor
 * + status list), and the live issue/re-issue panel. The layout-level
 * ConceptDemoBanner covers every route; each flow page adds the §4.3 footer
 * legal line under its own modelled organisation.
 */
import { footerLegalLine, IllustrativeFigure, orgThemes, themeCssProperties } from "@mortgage/ui";
import type { IssuerFlowId } from "@/lib/server/config";
import { ISSUER_FLOWS } from "@/lib/server/flows";
import { IssuePanel } from "./issue-panel";

const USD = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

interface ClaimRow {
  readonly label: string;
  readonly value: string;
  /** Money/score figures carry the R5 illustrative qualifier. */
  readonly illustrative?: boolean;
}

/** The pinned demo values, lowered to display rows (demo personas only — no real PII). */
function claimRows(flow: IssuerFlowId): ClaimRow[] {
  const claims = ISSUER_FLOWS[flow].claims();
  switch (claims.kind) {
    case "employment-income-credential":
      return [
        { label: "Employer", value: claims.employer.name },
        { label: "Job title", value: claims.jobTitle },
        { label: "Employed since", value: claims.startDate },
        {
          illustrative: true,
          label: "Monthly gross income",
          value: `${USD.format(claims.monthlyGrossIncomeUsd)}/mo`,
        },
      ];
    case "asset-credential":
      return claims.accounts.flatMap((account) => [
        { label: "Institution", value: account.provider.name },
        { label: "Account", value: `•••• ${account.accountLast4}` },
        { illustrative: true, label: "Verified balance", value: USD.format(account.amountUsd) },
      ]);
    case "credit-score-credential":
      return [
        { illustrative: true, label: "Credit score", value: String(claims.creditScoreValue) },
        {
          illustrative: true,
          label: "Total monthly debt",
          value: `${USD.format(claims.totalMonthlyDebtUsd)}/mo`,
        },
        { label: "Score model", value: "FICO 8" },
      ];
    default:
      return [];
  }
}

export function FlowPage({ flow }: { flow: IssuerFlowId }) {
  const definition = ISSUER_FLOWS[flow];
  const theme = orgThemes[definition.themeId];
  const rows = claimRows(flow);
  return (
    <div
      className="bg-background text-foreground"
      data-flow-page={flow}
      style={themeCssProperties(theme)}
    >
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 pb-28">
        <section>
          <p className="text-sm uppercase tracking-[0.2em]" style={{ color: "var(--primary)" }}>
            {theme.role}
          </p>
          <h1 className="mt-2 font-semibold text-3xl tracking-tight">{definition.label}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Scene 1 — fill the vault. This issuer flow signs a{" "}
            <strong>W3C Verifiable Credential</strong> for the borrower and delivers it into their
            Data Vault pod through the access they granted — the borrower re-uses it with any lender
            instead of re-collecting documents. Modelled on the {theme.modelledOn} role in the GSE
            validation programmes (Fannie AIM / DU validation); simulated data only.
          </p>
        </section>

        <section aria-labelledby={`${flow}-claims`}>
          <h2 className="font-semibold text-xl" id={`${flow}-claims`}>
            What this flow attests
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((row) => (
              <div className="rounded-lg border border-border bg-card p-4" key={row.label}>
                <dt className="text-muted-foreground text-sm">{row.label}</dt>
                <dd className="mt-1 font-semibold text-card-foreground text-lg tabular-nums">
                  {row.illustrative === true ? (
                    <IllustrativeFigure>{row.value}</IllustrativeFigure>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby={`${flow}-lands`}>
          <h2 className="font-semibold text-xl" id={`${flow}-lands`}>
            What lands in the vault
          </h2>
          <ul className="mt-4 grid list-none gap-3 p-0 text-sm">
            <li className="rounded-lg border border-border bg-card p-4">
              <strong>Signed credential</strong> — <code>{definition.kind}</code> at{" "}
              <code>{definition.credentialPath}</code>, SHACL-validated before signing
              (eddsa-rdfc-2022), subject-bound to the authenticated borrower.
            </li>
            {definition.anchor === undefined ? (
              <li className="rounded-lg border border-border bg-card p-4">
                <strong>No ZK anchor</strong> — zero-knowledge statements are scoped to income and
                credit fields only (decision 0005); balances are disclosed values.
              </li>
            ) : (
              <li className="rounded-lg border border-border bg-card p-4">
                <strong>ZK operand anchor</strong> — the issuer-signed term encoding of the hidden
                value at <code>{definition.anchor.path}</code> (borrower-only). A bare filter proof
                is forgeable; lenders verify proofs against this anchor.
              </li>
            )}
            <li className="rounded-lg border border-border bg-card p-4">
              <strong>Bitstring status list</strong> — one revocation list per issuer. Revocation
              only: freshness is a short validity window plus one-click re-issue, never a status
              flag (decision 0007).
            </li>
          </ul>
        </section>

        <IssuePanel
          flow={flow}
          reissueHint={
            flow === "employment"
              ? "Scene 4 — nothing goes stale: when the employment credential's validity window lapses before closing, re-issue renews it through the existing grant in one click (verbal VOE ≤ 10 business days, Fannie Mae B3-3.1-04)."
              : "Re-issue renews an expired credential through the existing grant with the same claims and a fresh validity window."
          }
        />
      </main>
      <footer className="border-border border-t bg-card">
        <p className="mx-auto w-full max-w-5xl px-6 py-4 pb-16 text-muted-foreground text-xs">
          {footerLegalLine({ organization: theme.modelledOn })}
        </p>
      </footer>
    </div>
  );
}
