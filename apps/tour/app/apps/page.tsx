import type { Metadata } from "next";
import { AppDirectory } from "../components/app-directory";

export const metadata: Metadata = {
  description: "Choose a role and open its app in the Solid Mortgage Showcase.",
  title: "All apps — Concept Demo",
};

export default function AppsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-10 pb-24" data-apps-page="">
      <p className="font-semibold text-muted-foreground text-sm uppercase tracking-[0.2em]">
        Explore on your own
      </p>
      <h1 className="mt-2 font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
        All apps
      </h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Choose a role to explore the demo. All apps share Alex's pod, so a change in one shows in
        the others. Local requests run as Alex; separate organisation permissions are not enforced
        here.
      </p>
      <AppDirectory />
    </main>
  );
}
