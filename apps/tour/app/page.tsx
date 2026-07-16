import { StatCard } from "@mortgage/ui";
import { DemoIdentityCard } from "./components/demo-identity-card";
import { EcosystemMap } from "./components/ecosystem-map";
import { anchors } from "./content/anchors";
import { chapters } from "./content/chapters";
import { site } from "./site";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 pt-14 pb-24">
      <section aria-labelledby="hero-heading">
        <p className="mb-3 font-semibold text-muted-foreground text-sm uppercase tracking-[0.2em]">
          {site.organization}
        </p>
        <h1
          className="max-w-3xl font-semibold text-4xl text-foreground tracking-tight sm:text-5xl"
          id="hero-heading"
        >
          {site.appName}
        </h1>
        <p className="mt-4 max-w-3xl font-medium text-foreground text-xl">
          Borrowers own their data. Every party in the mortgage gets scoped, revocable, receipted
          access — instead of yet another unmanaged copy.
        </p>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          A US mortgage today is expensive and slow largely because the same facts about the
          borrower are collected, verified, copied, and re-verified by over a dozen parties — none
          of whom the borrower can see or control. This showcase rebuilds that journey on Solid:
          verified data lives in a pod the borrower controls, verifications arrive once as reusable
          credentials, and each application is modelled on a real organisation's seat in the value
          chain — most of them EDMA members — so every member watching sees their own role, working,
          on screen.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <a
            className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground text-sm transition-opacity hover:opacity-90"
            data-cta-start-tour=""
            href={`/chapters/${chapters[0].slug}`}
          >
            Start the tour
          </a>
          <a
            className="rounded-lg border border-border px-5 py-3 font-semibold text-foreground text-sm hover:bg-muted"
            href="#ecosystem"
          >
            Explore the ecosystem
          </a>
        </div>
      </section>

      <section aria-labelledby="anchors-heading">
        <h2 className="font-semibold text-2xl text-foreground tracking-tight" id="anchors-heading">
          Why now — four numbers
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {anchors.map((anchor) => (
            <StatCard key={anchor.id} label={anchor.label} value={anchor.value} />
          ))}
        </div>
        <ul className="mt-5 flex flex-col gap-3" data-anchor-sources="">
          {anchors.map((anchor) => (
            <li className="text-muted-foreground text-sm" key={anchor.id}>
              <span className="font-medium text-foreground">{anchor.value}</span> — {anchor.detail}{" "}
              <a
                className="underline underline-offset-2 hover:text-foreground"
                href={anchor.source.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                Source: {anchor.source.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ecosystem-heading" id="ecosystem">
        <h2
          className="font-semibold text-2xl text-foreground tracking-tight"
          id="ecosystem-heading"
        >
          The ecosystem — twelve roles, one borrower
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Every application maps to a role a real organisation holds today; seven of the twelve land
          on EDMA members. Click a seat to see who holds it, what the demo shows in its colours, and
          — where an app exists — launch it live.
        </p>
        <div className="mt-6">
          <EcosystemMap />
        </div>
      </section>

      <section aria-labelledby="chapters-heading" id="chapters">
        <h2 className="font-semibold text-2xl text-foreground tracking-tight" id="chapters-heading">
          The journey — five scenes, ten minutes
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          One borrower — Alex Rivera, a fictional persona — goes from first verification to a
          closed, transferred loan. Each scene names the regulation it dramatizes.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <li key={chapter.slug}>
              <a
                className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60"
                data-chapter-card={chapter.slug}
                href={`/chapters/${chapter.slug}`}
              >
                <p className="text-muted-foreground text-sm">Scene {chapter.scene}</p>
                <p className="mt-1 font-semibold text-card-foreground">{chapter.title}</p>
                <p className="mt-2 text-muted-foreground text-sm">{chapter.lead}</p>
              </a>
            </li>
          ))}
          <li>
            <a
              className="flex h-full flex-col rounded-xl border border-border border-dashed bg-card p-5 transition-colors hover:border-primary/60"
              data-chapter-card="examiner"
              href="/examiner"
            >
              <p className="text-muted-foreground text-sm">Regulator lens</p>
              <p className="mt-1 font-semibold text-card-foreground">Examiner View</p>
              <p className="mt-2 text-muted-foreground text-sm">
                The journey's TRID and RESPA timing beats as an examiner-facing checklist over
                public rules. Unbranded; not affiliated with any agency.
              </p>
            </a>
          </li>
        </ol>
      </section>

      <section aria-labelledby="identity-heading" className="max-w-xl">
        <h2 className="font-semibold text-2xl text-foreground tracking-tight" id="identity-heading">
          The demo identity
        </h2>
        <p className="mt-2 text-muted-foreground">
          Values a presenter can copy in seconds — pinned to the thresholds the scene-2 proofs
          assert.
        </p>
        <div className="mt-5">
          <DemoIdentityCard />
        </div>
      </section>
    </main>
  );
}
