"use client";

import {
  BrandMark,
  brandCssProperties,
  ConceptDemoBanner,
  HonestyPanel,
  IllustrativeFigure,
  orgThemes,
  ReceiptCard,
} from "@mortgage/ui";
import { useState } from "react";
import { site } from "./site";

const SERVICER_THEME = orgThemes["closing-servicing"];

interface ReceiptView {
  iri: string;
  action: "grant" | "revoke";
  actor: string;
  recipient: string;
  resource: string;
  issuedAt: string;
}

interface ClosingView {
  iri: string;
  eNoteReference: string;
  closedAt: string;
}

type Operation = "close" | "grant" | "revoke" | "ledger";

const API_BASE = "/closing/api/scene";

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const value = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof value.detail === "string" ? value.detail : `Request failed (${response.status})`,
    );
  }
  return value;
}

export function ClosingExperience() {
  const [active, setActive] = useState<Operation | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [closing, setClosing] = useState<ClosingView | undefined>();
  const [granted, setGranted] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [receipts, setReceipts] = useState<readonly ReceiptView[]>([]);

  async function run(operation: Operation, path: string, method: "GET" | "POST") {
    setActive(operation);
    setError(undefined);
    setUnauthenticated(false);
    try {
      const response = await fetch(`${API_BASE}/${path}`, {
        method,
        headers: method === "POST" ? { "content-type": "application/json" } : undefined,
        body: method === "POST" ? "{}" : undefined,
      });
      if (response.status === 401) {
        // The only "no session" signal — the Mode-1 preview fallback (decision
        // 0015): requests carry the borrower's DPoP-bound session or nothing.
        setUnauthenticated(true);
        return;
      }
      const payload = await responseJson(response);
      if (operation === "close") {
        setClosing(payload as unknown as ClosingView);
      } else if (operation === "grant") {
        setGranted(true);
      } else if (operation === "revoke") {
        setRevoked(true);
      } else {
        setReceipts((payload.receipts ?? []) as ReceiptView[]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The operation failed");
    } finally {
      setActive(undefined);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section aria-labelledby="scene-title">
        <p className="font-semibold text-muted-foreground text-sm uppercase tracking-[0.18em]">
          Alex Rivera · simulated closing
        </p>
        <h1
          className="mt-3 max-w-3xl font-semibold text-4xl tracking-tight sm:text-5xl"
          id="scene-title"
        >
          Close the loan and transfer servicing
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          Alex signs the closing documents, then gives the new servicer access to the closing
          record.
        </p>
      </section>

      <section aria-labelledby="timeline-title" className="mt-12">
        <h2 className="font-semibold text-2xl" id="timeline-title">
          Closing Disclosure timeline
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Alex must receive the Closing Disclosure at least three business days before consummation
          (
          <a
            className="underline underline-offset-4"
            href="https://www.consumerfinance.gov/rules-policy/regulations/1026/19/"
          >
            12 CFR 1026.19(f)(1)(ii)
          </a>
          ).
        </p>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          <li className="rounded-lg border border-border bg-card p-5">
            <p className="font-medium text-sm">Tuesday · Closing Disclosure received</p>
            <p className="mt-2 text-muted-foreground text-sm">
              A copy is saved in Alex&apos;s pod. Delivery is simulated.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-card p-5">
            <p className="font-medium text-sm">Three business days</p>
            <p className="mt-2 text-muted-foreground text-sm">Alex reviews the final terms.</p>
          </li>
          <li className="rounded-lg border border-border bg-card p-5">
            <p className="font-medium text-sm">Friday · consummation</p>
            <p className="mt-2 text-muted-foreground text-sm">
              Alex eSigns the closing documents (simulated).
            </p>
          </li>
        </ol>
      </section>

      <section
        aria-labelledby="ceremony-title"
        className="mt-12 rounded-xl border border-border bg-card p-6"
      >
        <p className="text-muted-foreground text-sm">
          eClosing platform, modelled on {site.eCloseOrganization}
        </p>
        <h2 className="mt-2 font-semibold text-2xl" id="ceremony-title">
          Review and eSign the closing documents
        </h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-sm">Principal</dt>
            <dd className="mt-1 font-semibold">
              <IllustrativeFigure>$340,000</IllustrativeFigure>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Note rate</dt>
            <dd className="mt-1 font-semibold">
              <IllustrativeFigure>6.125%</IllustrativeFigure>
            </dd>
          </div>
        </dl>
        <button
          className="mt-6 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
          disabled={active !== undefined || closing !== undefined}
          onClick={() => run("close", "close", "POST")}
          type="button"
        >
          {active === "close"
            ? "Saving closing record…"
            : closing
              ? "Closing documents signed"
              : "eSign closing documents"}
        </button>
        {closing !== undefined && (
          <div className="mt-5 rounded-lg bg-muted p-4 text-sm" role="status">
            <p className="font-semibold">Closing record saved in Alex&apos;s pod</p>
            <p className="mt-1 break-all text-muted-foreground">
              eNote reference: {closing.eNoteReference}
            </p>
            <p className="mt-1 text-muted-foreground">
              Alex keeps a copy and the eNote reference. The eNote&apos;s Authoritative Copy stays
              in the eVault. Signing and eNote custody are simulated.
            </p>
          </div>
        )}
        <p className="mt-5 text-muted-foreground text-sm">
          Industry context: eOriginal managed about 92% of MERS eRegistry eNotes through January
          2022. The current share is unverified.
        </p>
      </section>

      <section
        aria-labelledby="transfer-title"
        className="mt-12 overflow-hidden rounded-xl border border-border"
        style={{ ...brandCssProperties(SERVICER_THEME), fontFamily: "var(--font-brand)" }}
      >
        <header className="border-primary border-b-4 bg-card p-6">
          {SERVICER_THEME.brand !== undefined && (
            <p className="mb-3 flex items-center gap-3 font-bold text-lg">
              <BrandMark brand={SERVICER_THEME.brand} />
              {SERVICER_THEME.brand.productName}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            Mortgage servicer, modelled on {site.servicerOrganization}
          </p>
          <h2 className="mt-2 font-semibold text-2xl" id="transfer-title">
            Manage access after servicing transfers
          </h2>
        </header>
        <ConceptDemoBanner
          organization={site.servicerOrganization}
          orgRole="mortgage servicer"
          placement="static"
        />
        <div className="bg-background p-6">
          <p className="max-w-3xl text-muted-foreground">
            The old and new servicers each send Alex a notice of servicing transfer (
            <a
              className="underline underline-offset-4"
              href="https://www.consumerfinance.gov/rules-policy/regulations/1024/33/"
            >
              12 CFR 1024.33(b)(3)
            </a>
            ); here they are simulated. Separately, Alex controls who can read the closing record.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              disabled={active !== undefined || granted || closing === undefined}
              onClick={() => run("grant", "grant-servicer", "POST")}
              type="button"
            >
              {active === "grant"
                ? "Granting…"
                : granted
                  ? "Servicer access granted"
                  : "Grant servicer access"}
            </button>
            <button
              className="rounded-lg border border-border bg-card px-5 py-3 font-semibold disabled:opacity-50"
              disabled={active !== undefined || !granted || revoked}
              onClick={() => run("revoke", "revoke-lender", "POST")}
              type="button"
            >
              {active === "revoke"
                ? "Revoking…"
                : revoked
                  ? "Lender access revoked"
                  : "Revoke lender access"}
            </button>
          </div>
          {granted && (
            <p className="mt-4 text-sm" role="status">
              Servicer read access granted. A consent receipt was saved.
            </p>
          )}
          {revoked && (
            <p className="mt-2 text-sm" role="status">
              Lender read access revoked. Copies the lender already holds are unaffected. A consent
              receipt was saved.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="ledger-title" className="mt-12">
        <h2 className="font-semibold text-2xl" id="ledger-title">
          Consent receipts
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Each consent receipt records when Alex gave or revoked access. It is not a log of every
          read. This app saves the receipts; Solid&apos;s permission system does not.
        </p>
        <button
          className="mt-5 rounded-lg border border-border bg-card px-5 py-3 font-semibold disabled:opacity-50"
          disabled={active !== undefined}
          onClick={() => run("ledger", "ledger", "GET")}
          type="button"
        >
          {active === "ledger" ? "Loading receipts…" : "Show consent receipts"}
        </button>
        <div className="mt-6 grid gap-4" aria-live="polite">
          {receipts.map((receipt) => (
            <ReceiptCard key={receipt.iri} {...receipt} />
          ))}
          {receipts.length === 0 && (
            <p className="text-muted-foreground text-sm">No receipts loaded yet.</p>
          )}
        </div>
      </section>

      {unauthenticated && (
        <p
          className="mt-8 rounded-lg border border-border bg-card p-4 text-muted-foreground text-sm"
          data-closing-unauthenticated=""
          role="status"
        >
          No authenticated borrower session. Sign-in is simulated here, so nothing was saved to a
          pod.
        </p>
      )}

      {error !== undefined && (
        <p className="mt-8 rounded-lg border border-border bg-card p-4 text-sm" role="alert">
          {error}
        </p>
      )}

      <HonestyPanel
        className="mt-12"
        defaultOpen
        real={
          <p>
            Pod sign-in, data-shape checks on each write, permission changes (Web Access Control)
            and consent receipts.
          </p>
        }
        simulated={
          <p>
            The eSigning, the eVault and eNote registry, servicing notices, the organisations&apos;
            involvement, all figures and Alex.
          </p>
        }
      />
    </main>
  );
}
