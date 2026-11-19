/**
 * The shared branded issuer-flow page (server component): per-org theme
 * tokens, role-first framing, the PINNED demo-persona values the flow signs
 * (marked illustrative), a collapsed "How it works" (credential + issuer-signed
 * value encoding + status list), and the live issue/replacement panel. The layout-level
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

/** Glossary role names (the shared theme role strings predate the glossary). */
const FLOW_ROLE: Record<IssuerFlowId, string> = {
  assets: "Asset verification provider",
  credit: "Credit bureau",
  employment: "Employment verification provider",
};

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
          value: `${USD.format(claims.monthlyGrossIncomeUsd)} a month`,
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
          value: `${USD.format(claims.totalMonthlyDebtUsd)} a month`,
        },
        { label: "Score model", value: "Illustrative" },
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
            {FLOW_ROLE[flow]}
          </p>
          <h1 className="mt-2 font-semibold text-3xl tracking-tight">{definition.label}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Review Alex&apos;s demo details, then issue the credential to the pod.
          </p>
        </section>

        <section aria-labelledby={`${flow}-claims`}>
          <h2 className="font-semibold text-xl" id={`${flow}-claims`}>
            What this credential contains
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

        <IssuePanel
          flow={flow}
          reissueHint={
            flow === "employment"
              ? "Replace the credential and revoke the previous version. No employer is contacted, so this is not employment re-verification."
              : "Replace the credential and revoke the previous version."
          }
        />

        <details className="rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 font-semibold">How it works</summary>
          <ul className="grid list-none gap-3 border-border border-t p-4 text-sm">
            <li>
              <strong>Signed credential:</strong> <code>{definition.kind}</code> at{" "}
              <code>{definition.credentialPath}</code>. It is checked against its data shape, then
              signed (eddsa-rdfc-2022) for Alex.
            </li>
            {definition.anchor === undefined ? (
              <li>
                <strong>No zero-knowledge proof:</strong> balances are shared as values.
              </li>
            ) : (
              <li>
                <strong>Issuer-signed value encoding:</strong> at{" "}
                <code>{definition.anchor.path}</code>. Lenders check zero-knowledge proofs against
                it. The encoding is deterministic, so anyone holding it can test guessed values.
              </li>
            )}
            <li>
              <strong>Status list:</strong> lets the provider revoke the credential. Expiry uses the
              validity period, not the status list.
            </li>
          </ul>
        </details>
      </main>
      <footer className="border-border border-t bg-card">
        <p className="mx-auto w-full max-w-5xl px-6 py-4 pb-16 text-muted-foreground text-xs">
          {footerLegalLine({ organization: theme.modelledOn })}
        </p>
      </footer>
    </div>
  );
}
