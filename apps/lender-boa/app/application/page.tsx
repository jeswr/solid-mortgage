import { ApplicationForm } from "../../components/application-form";
import { demoPrefill, prefillFromPod, type UrlaPrefill } from "../../lib/server/prefill";
import { lenderConfig } from "../../lib/server/service";
import { site } from "../site";

export const metadata = {
  title: `Application — Concept Demo (not ${site.organization})`,
};

interface ApplicationSearchParams {
  pod?: string;
  webid?: string;
}

/**
 * Scene 3: the one-click application. With a granted pod (`?pod=&webid=`) the
 * URLA subset prefills FROM the pod (server-side read through the granted
 * access); otherwise the demo persona backs the form. Every field is
 * demo-locked (R7).
 */
export default async function ApplicationPage({
  searchParams,
}: {
  searchParams: Promise<ApplicationSearchParams>;
}) {
  const { pod, webid } = await searchParams;
  let prefill: UrlaPrefill;
  let podError: string | null = null;
  if (pod !== undefined && webid !== undefined) {
    try {
      prefill = await prefillFromPod(pod, webid, lenderConfig());
    } catch (error) {
      podError = (error as Error).message;
      prefill = demoPrefill();
    }
  } else {
    prefill = demoPrefill();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 3 · one-click application
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Your application, prefilled from your pod
      </h1>
      <p className="mt-4 text-muted-foreground">
        {prefill.source === "pod"
          ? "These values were read live from your granted pod data — not re-typed into a form. (Full credential-signature verification runs at underwriting; this prefill is a display convenience.)"
          : "Showing the demo persona. Connect a granted pod to prefill from live pod data."}
      </p>
      {podError !== null && (
        <p className="mt-2 text-sm text-accent" role="alert">
          Pod read failed ({podError}); showing the demo persona instead.
        </p>
      )}
      <div className="mt-8">
        <ApplicationForm
          apiBase="/lender-boa/api"
          prefill={prefill}
          {...(prefill.source === "pod" && pod !== undefined && webid !== undefined
            ? { pod, webid }
            : {})}
        />
      </div>
    </main>
  );
}
