import { ConceptDemoBanner } from "@mortgage/ui";
import Link from "next/link";
import { appraisalBrand, site, titleBrand } from "./site";

const flows = [
  {
    href: "/appraisal",
    title: "Property appraisal",
    org: appraisalBrand.organization,
    role: appraisalBrand.role,
    body: "Issue an appraisal credential with the appraised value as a disclosed, signed claim — never a zero-knowledge proof — into the borrower's pod.",
  },
  {
    href: "/title",
    title: "Title clearance",
    org: titleBrand.organization,
    role: titleBrand.role,
    body: "Issue a title-clear credential recording the clear/clouded outcome of a public-records search into the borrower's pod.",
  },
] as const;

export default function Home() {
  return (
    <>
      <ConceptDemoBanner organization={site.organization} placement="fixed" />
      <main className="mx-auto w-full max-w-5xl px-6 py-12 pb-24">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Solid Mortgage Showcase
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {site.appName}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Two property-side issuer flows, modelled on {site.organization}: the appraisal that values
          the property and the title search that clears it. Each writes a verifiable credential into
          the borrower's pod.
        </p>
        <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2">
          {flows.map((flow) => (
            <li key={flow.href} className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                modelled on {flow.org} · {flow.role}
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
