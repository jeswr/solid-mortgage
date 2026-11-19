// AUTHORED-BY Claude Opus 5.5
import { podUrl, statusOf } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { MORT } from "@mortgage/data-model";
import { isAppSlug } from "@mortgage/demo-kit/registry";
import { useState } from "react";
import { useSearch } from "wouter";
import { Screen } from "../App.tsx";
import { Icon } from "../components/Icon.tsx";
import { Loading, OrgBadge, Problem } from "../components/ui.tsx";
import { labelOfPath, safeReturnUrl, slugOfReturnUrl } from "../explain.ts";
import { usePodData, useWallet } from "../runtime.tsx";

/** The two lenders that ask for pre-qualification, in the order the journey answers them. */
const LENDERS = ["lender-b", "lender"] as const;

const FIELD_WORDS: Readonly<Record<string, { label: string; format: (n: number) => string }>> = {
  [MORT.creditScoreValue]: { format: (n) => String(n), label: "Credit score" },
  [MORT.monthlyGrossIncomeUsd]: {
    format: (n) => `$${n.toLocaleString("en-US")} a month`,
    label: "Monthly income before tax",
  },
};

const OPS: Readonly<Record<string, string>> = {
  ge: "at least",
  gt: "more than",
  le: "at most",
  lt: "less than",
};

const nameOfApp = (slug: string) =>
  Object.hasOwn(ORGS, slug)
    ? ORGS[slug as keyof typeof ORGS].organisation
    : "the app you came from";

/**
 * Prove: answer both lenders' two questions with threshold proofs made on this device
 * (tour step 5). This route is served cross-origin isolated, so the prover can use threads.
 */
export function Prove() {
  const { runApart } = useWallet();
  // A lender that sent the visitor here may be returned to: only an app of this site.
  const returnTo = safeReturnUrl(
    new URLSearchParams(useSearch()).get("return"),
    window.location,
    isAppSlug,
  );
  const sources = usePodData(async (world) => {
    const alex = world.fetchAs("alex");
    // Loaded at the point of use: the statements live beside the prover's code.
    const { PREQUALIFICATION_STATEMENTS, STATEMENT_SOURCES } = await import(
      "@mortgage/content/mortgage/prequalification"
    );
    const entries = [];
    for (const statement of PREQUALIFICATION_STATEMENTS) {
      const source = STATEMENT_SOURCES[statement.field];
      if (source === undefined) continue;
      const anchor = await statusOf(alex, podUrl(world, "alex", source.anchor));
      entries.push({ issuer: source.issuer, ready: anchor === 200, source, statement });
    }
    return entries;
  });
  const [state, setState] = useState<"idle" | "proving" | "done">("idle");
  const [error, setError] = useState<unknown>();
  const [seconds, setSeconds] = useState<number>();
  const isolated = globalThis.crossOriginIsolated === true;
  const ready = sources.data?.every((entry) => entry.ready) === true;

  const prove = async () => {
    setState("proving");
    setError(undefined);
    const started = performance.now();
    try {
      // The proofs grant nothing, so they run outside the grant queue (runtime.tsx).
      await runApart(async (world) =>
        (await import("@mortgage/content/mortgage/journey")).proveToLenders(world),
      );
      setSeconds(Math.round((performance.now() - started) / 1000));
      setState("done");
    } catch (caught) {
      setError(caught);
      setState("idle");
    }
  };

  return (
    <Screen title="Prove" back={{ href: "/", label: "Home" }}>
      <p className="lede">
        Two lenders ask the same two questions. Cairn answers each with a proof made on this device.
        A lender learns yes or no, and who vouches for it. Not the figure.
      </p>
      <section className="card" aria-labelledby="questions-heading">
        <h2 id="questions-heading">The questions</h2>
        {sources.error !== undefined ? <Problem error={sources.error} /> : null}
        {sources.data === undefined && sources.error === undefined ? (
          <Loading what="your proof anchors" />
        ) : null}
        <ul className="questions">
          {sources.data?.map(({ statement, source, issuer, ready: has }) => {
            const words = FIELD_WORDS[statement.field];
            return (
              <li key={statement.field}>
                <span className="question">
                  {words?.label ?? statement.field} {OPS[statement.op] ?? statement.op}{" "}
                  {words?.format(statement.bound) ?? statement.bound}?
                </span>
                <span className="muted small">
                  Proved from {labelOfPath(source.credential)}, against the anchor{" "}
                  {ORGS[issuer].organisation} signed.{" "}
                  {has ? "" : "Not in your pod yet: ask the issuer to share it first."}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card" aria-labelledby="lenders-heading">
        <h2 id="lenders-heading">Asked by</h2>
        <ul className="lenders">
          {LENDERS.map((slug) => (
            <li key={slug}>
              <OrgBadge slug={slug} /> {ORGS[slug].organisation}
              {state === "done" ? (
                <span className="state state-active">
                  <Icon name="check" /> Checked: yes
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {error !== undefined ? <Problem error={error} /> : null}
        <button
          type="button"
          className="button primary wide"
          data-tour="wallet-prove"
          disabled={!ready || state === "proving"}
          onClick={prove}
        >
          {state === "proving" ? "Making proofs on this device…" : "Prove to two lenders"}
        </button>
        <p className="small muted" role="status">
          {state === "proving"
            ? `Proving with ${isolated ? "several threads" : "one thread"}. This can take a little while.`
            : state === "done"
              ? `Done in ${seconds ?? 0} s. Each lender got two proofs and two issuer anchors. Neither got your income, your score, or access to your pod.`
              : isolated
                ? "This page can prove with several threads."
                : "This page proves with one thread."}
        </p>
        {state === "done" && returnTo !== undefined ? (
          <a className="button ghost wide" href={returnTo}>
            Back to {nameOfApp(slugOfReturnUrl(returnTo, window.location))}
          </a>
        ) : null}
      </section>
      <p className="small muted">
        The proofs go to each lender's own inbox. No access to your pod is granted.
      </p>
    </Screen>
  );
}
