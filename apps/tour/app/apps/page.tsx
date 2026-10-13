import type { Metadata } from "next";
import { AppDirectory } from "../components/app-directory";

export const metadata: Metadata = {
  description: "Open any app in the Solid Mortgage Showcase on its own.",
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
        Each app plays one organisation's seat in the mortgage. They all work against the same
        borrower pod, so what you do in one shows up in the others. When the demo runs locally you
        are signed in automatically as Alex Rivera, and the pod activity panel shows every read,
        write and access change.
      </p>
      <AppDirectory />
    </main>
  );
}
