"use client";

import { appGuides } from "@/app/content/app-guide";
import { launcherApps } from "@/app/content/services";
import { StatusDot } from "./status-dot";
import { useServiceStatuses } from "./use-service-status";

/** The `/apps` launcher: every zone app with its live status and the pages worth opening. */
export function AppDirectory() {
  const apps = launcherApps.filter((app) => appGuides[app.slug] !== undefined);
  const statuses = useServiceStatuses(apps.map((app) => app.healthPath));

  return (
    <ul className="mt-8 grid gap-4 md:grid-cols-2">
      {apps.map((app) => {
        const guide = appGuides[app.slug];
        if (guide === undefined) return null;
        const status = statuses[app.healthPath] ?? "checking";
        const live = status === "live";
        return (
          <li
            className="flex flex-col rounded-xl border border-border bg-card p-5"
            data-app-card={app.slug}
            key={app.slug}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-card-foreground text-lg">{app.appName}</h2>
                <p className="text-muted-foreground text-sm">Modelled on {app.modelledOn}</p>
              </div>
              <StatusDot className="shrink-0" status={status} />
            </div>
            <p className="mt-3 text-card-foreground text-sm">{guide.purpose}</p>
            <p className="mt-1 text-muted-foreground text-sm">Viewing as {guide.youAre}.</p>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {guide.pages.map((page) => (
                <li key={page.path}>
                  <a
                    aria-disabled={live ? undefined : "true"}
                    className={
                      live
                        ? "font-medium text-foreground underline underline-offset-2 hover:opacity-80"
                        : "cursor-not-allowed font-medium text-muted-foreground"
                    }
                    href={live ? page.path : undefined}
                  >
                    {page.label}
                  </a>
                  <span className="text-muted-foreground"> — {page.tryThis}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <a
                aria-disabled={live ? undefined : "true"}
                className={
                  live
                    ? "inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground text-sm hover:opacity-90"
                    : "inline-block cursor-not-allowed rounded-lg bg-muted px-4 py-2 font-semibold text-muted-foreground text-sm"
                }
                data-app-open={app.slug}
                href={live ? app.path : undefined}
              >
                {live ? `Open ${app.appName}` : "Not running here"}
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
