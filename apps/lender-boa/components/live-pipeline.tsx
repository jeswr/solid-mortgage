"use client";

import { IllustrativeFigure } from "@mortgage/ui";
import { useCallback, useEffect, useState } from "react";
import { formatUsd } from "../lib/format";
import type { PipelineFile } from "../lib/server/pipeline";

const STATUS_LABEL: Record<string, string> = {
  Approved: "Approved, clear to close",
  ApprovedWithConditions: "Approved with conditions",
  Denied: "Denied",
};

/**
 * Live files in the loan officer's queue: what the borrower (or their assistant)
 * submitted, read straight from the borrower's pod on every refresh.
 */
export function LivePipeline({ apiBase }: { apiBase: string }) {
  const [files, setFiles] = useState<readonly PipelineFile[] | undefined>();
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/pipeline`, { cache: "no-store" });
      if (!response.ok) {
        setUnavailable(true);
        return;
      }
      const body = (await response.json()) as { files: readonly PipelineFile[] };
      setFiles(body.files);
    } catch {
      setUnavailable(true);
    }
  }, [apiBase]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function clear(file: PipelineFile) {
    setBusy(file.id);
    setError(undefined);
    try {
      const response = await fetch(`${apiBase}/pipeline/clear-to-close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: file.id }),
      });
      if (!response.ok) setError(`Could not clear the file (${response.status}).`);
      await load();
    } finally {
      setBusy(undefined);
    }
  }

  if (unavailable) {
    return (
      <p className="mt-6 text-muted-foreground text-sm" data-live-pipeline="off">
        The live queue is only available when the demo runs locally (`pnpm demo`); the sample files
        below show what it looks like.
      </p>
    );
  }
  if (files === undefined) {
    return <p className="mt-6 text-muted-foreground text-sm">Loading the queue…</p>;
  }
  if (files.length === 0) {
    return (
      <p
        className="mt-6 rounded-lg border border-border border-dashed p-5 text-muted-foreground text-sm"
        data-live-pipeline="empty"
      >
        No applications yet. Submit one from the application page or with the assistant, and it
        appears here.
      </p>
    );
  }
  return (
    <ul className="mt-6 flex flex-col gap-4" data-live-pipeline="">
      {files.map((file) => {
        const cleared = file.decisionStatus === "Approved";
        return (
          <li
            className="rounded-xl border border-border bg-card p-5"
            data-pipeline-file={file.id}
            data-pipeline-stage={cleared ? "clear-to-close" : "review"}
            key={file.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-card-foreground text-lg">{file.borrowerName}</p>
                <p className="text-muted-foreground text-sm">
                  Submitted {new Date(file.submittedAt).toLocaleString()} ·{" "}
                  {file.channel === "assistant" ? "by the borrower's assistant" : "online form"}
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 font-medium text-sm">
                <IllustrativeFigure>
                  {STATUS_LABEL[file.decisionStatus ?? ""] ?? "No decision yet"}
                </IllustrativeFigure>
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[12rem_1fr]">
              <dt className="text-muted-foreground">Evidence</dt>
              <dd className="m-0">
                Verified credentials in the borrower's pod, read under their grant — nothing
                uploaded, nothing to chase.
              </dd>
              <dt className="text-muted-foreground">Application</dt>
              <dd className="m-0 break-all">
                {file.applicationInPod ? "In the borrower's pod" : "Missing"}:{" "}
                <code className="text-xs">{file.applicationIri}</code>
              </dd>
              {file.housing !== undefined && (
                <>
                  <dt className="text-muted-foreground">Current housing</dt>
                  <dd className="m-0">
                    Renting,{" "}
                    <IllustrativeFigure>
                      {formatUsd(file.housing.monthlyRentUsd)}
                    </IllustrativeFigure>{" "}
                    a month (
                    {file.housing.source === "email"
                      ? "found in the borrower's email by their assistant"
                      : "entered by the borrower"}
                    )
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">Open conditions</dt>
              <dd className="m-0">
                {file.conditions.length === 0 ? "None" : file.conditions.join(" ")}
              </dd>
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground text-sm disabled:opacity-50"
                data-pipeline-action="clear-to-close"
                disabled={cleared || busy !== undefined}
                onClick={() => void clear(file)}
                type="button"
              >
                {cleared
                  ? "Cleared to close"
                  : busy === file.id
                    ? "Writing to the pod…"
                    : "Clear to close"}
              </button>
              <span className="text-muted-foreground text-xs">
                Writes the final decision into the borrower's pod.
              </span>
            </div>
            {error !== undefined && (
              <p className="mt-2 text-accent text-sm" role="alert">
                {error}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
