import type { Metadata } from "next";
import { EXAMINER_NON_AFFILIATION, examinerChecks } from "@/app/content/examiner";

export const metadata: Metadata = {
  description:
    "Illustrative, unbranded examiner-facing checklist over public TRID and RESPA timing rules. Not affiliated with or endorsed by the CFPB or any government agency.",
  title: "Examiner View — Concept Demo",
};

/**
 * Examiner View (decision 0002; org-map role 11): deliberately UNBRANDED — neutral
 * grayscale styling, no agency name in the chrome, no seal-like imagery — with an explicit
 * CFPB non-affiliation statement. Content is the journey's TRID/RESPA timing beats rendered
 * as an examiner-facing checklist referencing public rules.
 */
export default function ExaminerPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-24" data-examiner-view="">
      <header className="border-neutral-400 border-b-2 pb-6">
        <p className="font-medium text-neutral-500 text-sm uppercase tracking-[0.2em]">
          Regulator lens — illustrative
        </p>
        <h1 className="mt-2 font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
          Examiner View
        </h1>
        <p className="mt-4 rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-3 font-medium text-neutral-800 text-sm">
          {EXAMINER_NON_AFFILIATION}
        </p>
        <p className="mt-4 text-muted-foreground">
          The demo journey dramatizes public compliance clocks. This view renders those beats the
          way an examiner would read them: the rule, its public source, and what the borrower-held
          record makes checkable. Every timing artifact in the demo — grants, deliveries,
          revocations — is receipted, so the trail below exists as structured data rather than
          reconstructed correspondence.
        </p>
      </header>

      <ol className="mt-8 flex flex-col gap-5">
        {examinerChecks.map((check, index) => (
          <li
            className="rounded-lg border border-neutral-300 bg-white p-5"
            data-examiner-check={check.id}
            key={check.id}
          >
            <div className="flex items-baseline gap-3">
              <span aria-hidden="true" className="font-mono text-neutral-400 text-sm tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-lg text-neutral-900">{check.rule}</h2>
                <p className="mt-1 text-neutral-500 text-sm">
                  <a
                    className="underline underline-offset-2 hover:text-neutral-800"
                    href={check.citationUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {check.citation}
                  </a>
                </p>
                <p className="mt-3 text-neutral-700 text-sm">{check.observe}</p>
                <p className="mt-3 text-sm">
                  <a
                    className="font-medium text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
                    href={`/chapters/${check.chapterSlug}`}
                  >
                    Dramatized in scene {check.scene} →
                  </a>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-neutral-500 text-sm">
        All rules referenced are public. {EXAMINER_NON_AFFILIATION} For the partner phase, the
        regulator lens is convened through member public bodies as supervisory observers.
      </p>
    </main>
  );
}
