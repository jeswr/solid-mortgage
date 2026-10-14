import { StatCard } from "@mortgage/ui";
import { DemoIdentityCard } from "./components/demo-identity-card";
import { EcosystemMap } from "./components/ecosystem-map";
import { GuidedDemoCta } from "./components/guided-demo-cta";
import { anchors } from "./content/anchors";
import { chapters } from "./content/chapters";
import { site } from "./site";

/** Why the journey matters, by audience (astra-review-1 M3). Each line states a possibility, not a result. */
const reasons = [
  "Lenders could reuse verified data that Alex already holds, instead of ordering it again.",
  "Verification providers issue a signed credential once. Each lender decides whether to accept it.",
  "Alex could let each organisation read only named items, with a consent receipt for each change.",
  "Examiners can compare the journey with public rules in the Examiner View.",
];

export default function Home() {
  const walkthroughHref = `/chapters/${chapters[0].slug}`;
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
          Follow Alex's mortgage from verification to servicing. See how Solid could give each
          organisation consumer-permissioned access to verified data.
        </p>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          The walkthrough takes about ten minutes. Each app also works on its own.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <GuidedDemoCta walkthroughHref={walkthroughHref} />
          <a
            className="rounded-lg border border-border px-5 py-3 font-semibold text-foreground text-sm hover:bg-muted"
            data-cta-apps=""
            href="/apps"
          >
            Browse apps
          </a>
        </div>
      </section>

      <section aria-labelledby="why-heading">
        <h2 className="font-semibold text-2xl text-foreground tracking-tight" id="why-heading">
          Why this matters to your organisation
        </h2>
        <ul className="mt-4 flex max-w-3xl list-disc flex-col gap-2 pl-5 text-muted-foreground">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="chapters-heading" id="chapters">
        <h2 className="font-semibold text-2xl text-foreground tracking-tight" id="chapters-heading">
          The journey: five scenes
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Alex Rivera, a fictional borrower, goes from verification to a closed loan with a new
          servicer.
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
              <p className="text-muted-foreground text-sm">For examiners</p>
              <p className="mt-1 font-semibold text-card-foreground">Examiner View</p>
              <p className="mt-2 text-muted-foreground text-sm">
                Compares the demo with public TRID and RESPA rules. Unbranded; not affiliated with
                any agency.
              </p>
            </a>
          </li>
        </ol>
      </section>

      <section
        aria-labelledby="cop-heading"
        className="rounded-xl border border-border bg-card p-6"
        data-cop-invitation=""
      >
        <h2 className="font-semibold text-2xl text-card-foreground tracking-tight" id="cop-heading">
          Discuss a mortgage-data pilot
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Join the {site.organization} to test verification reuse, permissioned access and audit
          records with your organisation.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <a
            className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground text-sm transition-opacity hover:opacity-90"
            data-cta-pilot=""
            href={site.copContactUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Discuss a pilot
          </a>
          <a
            className="font-medium text-foreground text-sm underline underline-offset-2 hover:opacity-80"
            href="/apps"
          >
            Explore the apps
          </a>
        </div>
      </section>

      <section aria-labelledby="ecosystem-heading" id="ecosystem">
        <h2
          className="font-semibold text-2xl text-foreground tracking-tight"
          id="ecosystem-heading"
        >
          Twelve roles, one borrower
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Select a role to see what the demo shows.
        </p>
        <div className="mt-6">
          <EcosystemMap />
        </div>
      </section>

      <section aria-labelledby="anchors-heading">
        <h2 className="font-semibold text-2xl text-foreground tracking-tight" id="anchors-heading">
          Industry context
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Published industry figures. They are not results of this demo.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {anchors.map((anchor) => (
            <StatCard key={anchor.id} label={anchor.label} value={anchor.value} />
          ))}
        </div>
        <ul className="mt-5 flex flex-col gap-3" data-anchor-sources="">
          {anchors.map((anchor) => (
            <li className="text-muted-foreground text-sm" key={anchor.id}>
              <span className="font-medium text-foreground">{anchor.value}</span>: {anchor.detail}{" "}
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

      <section aria-labelledby="identity-heading" className="max-w-xl">
        <h2 className="font-semibold text-2xl text-foreground tracking-tight" id="identity-heading">
          Demo data
        </h2>
        <p className="mt-2 text-muted-foreground">Copy these values when presenting.</p>
        <div className="mt-5">
          <DemoIdentityCard />
        </div>
      </section>
    </main>
  );
}
