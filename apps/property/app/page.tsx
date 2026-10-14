import { BrandMark, ConceptDemoBanner, orgThemes, themeCssProperties } from "@mortgage/ui";
import Link from "next/link";
import { appraisalBrand, site, titleBrand } from "./site";

const flows = [
  {
    themeId: "property-appraisal",
    href: "/appraisal",
    title: "Appraisal",
    org: appraisalBrand.organization,
    role: appraisalBrand.role,
    body: "Saves a signed appraisal credential, showing the appraised value, in Alex's pod.",
  },
  {
    themeId: "property-title",
    href: "/title",
    title: "Title search result",
    org: titleBrand.organization,
    role: titleBrand.role,
    body: "Saves a signed title search result in Alex's pod. It is not a title commitment or insurance policy.",
  },
] as const;

export default function Home() {
  return (
    <>
      <header className="border-border border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          {flows.map((flow) => {
            const theme = orgThemes[flow.themeId];
            return (
              theme.brand !== undefined && (
                <Link
                  className="flex items-center gap-3 no-underline hover:underline"
                  href={flow.href}
                  key={flow.href}
                  style={themeCssProperties(theme)}
                >
                  <BrandMark brand={theme.brand} />
                  <span>
                    <span className="block font-semibold text-foreground">
                      {theme.brand.productName}
                    </span>
                    <span className="block text-muted-foreground text-xs">
                      {flow.role} · modelled on {flow.org}
                    </span>
                  </span>
                </Link>
              )
            );
          })}
        </div>
      </header>
      {/* In flow directly below the brand header (R1 adjacency). */}
      <ConceptDemoBanner organization={site.organization} placement="static" />
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Apply with data from the pod
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {site.appName}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Two simulated property records for Alex&apos;s loan: the appraisal and the title search
          result.
        </p>
        <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2">
          {flows.map((flow) => (
            <li key={flow.href} className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {flow.role}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-card-foreground">
                <Link className="hover:underline" href={flow.href}>
                  {flow.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{flow.body}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
