"use client";

import {
  ConceptDemoBanner,
  HonestyPanel,
  IllustrativeFigure,
  orgThemes,
  ReceiptCard,
  themeCssProperties,
} from "@mortgage/ui";
import { useState } from "react";
import { site } from "./site";

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
  const [closing, setClosing] = useState<ClosingView | undefined>();
  const [granted, setGranted] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [receipts, setReceipts] = useState<readonly ReceiptView[]>([]);

  async function run(operation: Operation, path: string, method: "GET" | "POST") {
    setActive(operation);
    setError(undefined);
    try {
      const payload = await responseJson(
        await fetch(`${API_BASE}/${path}`, {
          method,
          headers: method === "POST" ? { "content-type": "application/json" } : undefined,
          body: method === "POST" ? "{}" : undefined,
        }),
      );
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
    <main className="mx-auto w-full max-w-5xl px-6 py-10" id="main-content" tabIndex={-1}>
      <section aria-labelledby="scene-title">
        <p className="font-semibold text-muted-foreground text-sm uppercase tracking-[0.18em]">
          Scene 5 · Close and stay in control
        </p>
        <h1
          className="mt-3 max-w-3xl font-semibold text-4xl tracking-tight sm:text-5xl"
          id="scene-title"
        >
          Sign once. See every consent change.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          Alex Rivera receives the Closing Disclosure, completes a simulated digital signing
          ceremony, transfers servicing, and reads the application&apos;s consent-receipt ledger.
        </p>
      </section>

      <section aria-labelledby="timeline-title" className="mt-12">
        <h2 className="font-semibold text-2xl" id="timeline-title">
          Closing Disclosure timeline
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Consumer receives the Closing Disclosure no later than three business days before
          consummation (
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
            <p className="font-medium text-sm">Tuesday · disclosure received</p>
            <p className="mt-2 text-muted-foreground text-sm">
              Borrower copy lands in Alex&apos;s pod.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-card p-5">
            <p className="font-medium text-sm">Three-business-day review</p>
            <p className="mt-2 text-muted-foreground text-sm">
              The borrower keeps the review window.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-card p-5">
            <p className="font-medium text-sm">Friday · consummation</p>
            <p className="mt-2 text-muted-foreground text-sm">
              The simulated eSign ceremony completes.
            </p>
          </li>
        </ol>
      </section>

      <section
        aria-labelledby="ceremony-title"
        className="mt-12 rounded-xl border border-border bg-card p-6"
      >
        <p className="text-muted-foreground text-sm">
          eClose ceremony · modelled on {site.eCloseOrganization}
        </p>
        <h2 className="mt-2 font-semibold text-2xl" id="ceremony-title">
          Review and eSign the closing package
        </h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-sm">Principal</dt>
            <dd className="mt-1 font-semibold">
              <IllustrativeFigure>$335,000</IllustrativeFigure>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Note rate</dt>
            <dd className="mt-1 font-semibold">
              <IllustrativeFigure>6.125%</IllustrativeFigure>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Closing costs</dt>
            <dd className="mt-1 font-semibold">
              <IllustrativeFigure>$11,600</IllustrativeFigure>
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
            ? "Writing closing record…"
            : closing
              ? "Closing package signed"
              : "eSign closing package"}
        </button>
        {closing !== undefined && (
          <div className="mt-5 rounded-lg bg-muted p-4 text-sm" role="status">
            <p className="font-semibold">ClosingRecord written to Alex&apos;s pod</p>
            <p className="mt-1 break-all text-muted-foreground">
              eNote reference: {closing.eNoteReference}
            </p>
            <p className="mt-1 text-muted-foreground">
              The authoritative eNote remains in the simulated eVault; the pod stores only
              Alex&apos;s borrower-facing record and reference.
            </p>
          </div>
        )}
        <p className="mt-5 text-muted-foreground text-sm">
          Historical context only: eOriginal managed about 92% of MERS eRegistry eNotes through
          January 2022; the share today is unverified.
        </p>
      </section>

      <section
        aria-labelledby="transfer-title"
        className="mt-12 overflow-hidden rounded-xl border border-border"
        style={themeCssProperties(orgThemes["closing-servicing"])}
      >
        <header className="bg-card p-6">
          <p className="text-muted-foreground text-sm">
            Mortgage servicer · modelled on {site.servicerOrganization}
          </p>
          <h2 className="mt-2 font-semibold text-2xl" id="transfer-title">
            Approve the servicing transfer
          </h2>
        </header>
        <ConceptDemoBanner
          organization={site.servicerOrganization}
          orgRole="mortgage servicer"
          placement="static"
        />
        <div className="bg-background p-6">
          <p className="max-w-3xl text-muted-foreground">
            RESPA transfer notices come from the transferor no less than 15 days before the
            effective date and from the transferee no more than 15 days after it (
            <a
              className="underline underline-offset-4"
              href="https://www.consumerfinance.gov/rules-policy/regulations/1024/33/"
            >
              12 CFR 1024.33(b)(3)
            </a>
            ). This demo pairs that timeline with borrower-controlled pod access.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              disabled={active !== undefined || granted}
              onClick={() => run("grant", "grant-servicer", "POST")}
              type="button"
            >
              {active === "grant"
                ? "Approving…"
                : granted
                  ? "Servicer approved"
                  : "Approve servicer access"}
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
              Servicer read access granted; an app-level DPV receipt was written.
            </p>
          )}
          {revoked && (
            <p className="mt-2 text-sm" role="status">
              Lender read access revoked by a real WAC ACL change; a separate app-level DPV receipt
              was written.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="ledger-title" className="mt-12">
        <h2 className="font-semibold text-2xl" id="ledger-title">
          Consent-receipt ledger
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          This trail is maintained by the application as DPV consent resources in Alex&apos;s pod.
          WAC enforces the access change; WAC and the Solid protocol do not provide this audit
          ledger.
        </p>
        <button
          className="mt-5 rounded-lg border border-border bg-card px-5 py-3 font-semibold disabled:opacity-50"
          disabled={active !== undefined}
          onClick={() => run("ledger", "ledger", "GET")}
          type="button"
        >
          {active === "ledger" ? "Reading ledger…" : "Read consent-receipt ledger"}
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

      {error !== undefined && (
        <p className="mt-8 rounded-lg border border-border bg-card p-4 text-sm" role="alert">
          {error}. The authenticated server rail fails closed; the concept UI never falls back to
          caller-supplied pod or WebID parameters.
        </p>
      )}

      <HonestyPanel
        className="mt-12"
        defaultOpen
        real={
          <p>
            Authenticated pod binding, SHACL-validated RDF writes, WAC grant/revocation, and DPV
            receipt resources.
          </p>
        }
        simulated={
          <p>
            The signing ceremony, organisations&apos; involvement, figures, eVault/eNote registry,
            notices, and demo persona.
          </p>
        }
      />
    </main>
  );
}
