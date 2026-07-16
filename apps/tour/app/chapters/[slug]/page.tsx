import { HonestyPanel } from "@mortgage/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterPlayer } from "@/app/components/chapter-player";
import { chapterBySlug, chapters } from "@/app/content/chapters";

interface ChapterPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return chapters.map((chapter) => ({ slug: chapter.slug }));
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const chapter = chapterBySlug(slug);
  if (chapter === undefined) return {};
  return { title: `Scene ${chapter.scene}: ${chapter.title} — Concept Demo` };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { slug } = await params;
  const chapter = chapterBySlug(slug);
  if (chapter === undefined) notFound();

  const index = chapters.findIndex((entry) => entry.slug === chapter.slug);
  const previous = index > 0 ? chapters[index - 1] : undefined;
  const next = index < chapters.length - 1 ? chapters[index + 1] : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-24">
      <nav aria-label="Chapters" className="flex flex-wrap items-center gap-2 text-sm">
        <a className="text-muted-foreground underline-offset-2 hover:underline" href="/#chapters">
          All chapters
        </a>
        {chapters.map((entry) => (
          <a
            aria-current={entry.slug === chapter.slug ? "page" : undefined}
            className={
              entry.slug === chapter.slug
                ? "rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs"
                : "rounded-full border border-border px-3 py-1 text-muted-foreground text-xs hover:bg-muted"
            }
            href={`/chapters/${entry.slug}`}
            key={entry.slug}
          >
            {entry.scene}
          </a>
        ))}
        <a
          className="rounded-full border border-border border-dashed px-3 py-1 text-muted-foreground text-xs hover:bg-muted"
          href="/examiner"
        >
          Examiner
        </a>
      </nav>

      <header className="mt-8">
        <p className="text-muted-foreground text-sm">Scene {chapter.scene} of 5</p>
        <h1 className="mt-1 font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
          {chapter.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{chapter.lead}</p>
        <p className="mt-3 rounded-lg border border-border bg-muted/50 px-4 py-2 text-foreground text-sm">
          <span className="font-semibold">Anchor:</span> {chapter.anchor}
        </p>
      </header>

      <div className="mt-8">
        <ChapterPlayer chapter={chapter} />
      </div>

      {chapter.scene === 2 && (
        <HonestyPanel
          className="mt-6"
          real={
            <p>
              The threshold proofs are real zero-knowledge circuits, proved and verified in the
              browser, anchored to real issuer signatures over the credentials.
            </p>
          }
          simulated={
            <p>
              Sign-in — including holder binding when a proof is presented — is simulated in the
              default visitor mode, and the lenders' quotes are illustrative figures, not offers.
              The proving stack is research-grade; external audit is pending.
            </p>
          }
        />
      )}

      <nav
        aria-label="Chapter navigation"
        className="mt-10 flex items-center justify-between gap-3"
      >
        {previous !== undefined ? (
          <a
            className="rounded-lg border border-border px-4 py-2 font-medium text-sm hover:bg-muted"
            data-previous-chapter=""
            href={`/chapters/${previous.slug}`}
          >
            ← Scene {previous.scene}: {previous.title}
          </a>
        ) : (
          <span />
        )}
        {next !== undefined ? (
          <a
            className="rounded-lg border border-border px-4 py-2 font-medium text-sm hover:bg-muted"
            data-next-chapter=""
            href={`/chapters/${next.slug}`}
          >
            Scene {next.scene}: {next.title} →
          </a>
        ) : (
          <a
            className="rounded-lg border border-border px-4 py-2 font-medium text-sm hover:bg-muted"
            data-next-chapter=""
            href="/examiner"
          >
            The regulator lens: Examiner View →
          </a>
        )}
      </nav>
    </main>
  );
}
