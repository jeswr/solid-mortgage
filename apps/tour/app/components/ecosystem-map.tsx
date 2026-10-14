"use client";

import { useState } from "react";
import { centerService, demoApps, roleServices, type Service } from "@/app/content/services";
import { cn } from "@/lib/utils";
import { StatusDot } from "./status-dot";
import { TryLiveButton } from "./try-live";
import { type ServiceStatus, useServiceStatuses } from "./use-service-status";

function serviceHealthPaths(service: Service): string[] {
  return service.apps.map((slug) => demoApps[slug].healthPath);
}

function serviceStatus(
  service: Service,
  statuses: Record<string, ServiceStatus>,
): ServiceStatus | undefined {
  const paths = serviceHealthPaths(service);
  if (paths.length === 0) return undefined;
  const resolved = paths.map((path) => statuses[path] ?? "checking");
  if (resolved.includes("live")) return "live";
  if (resolved.every((status) => status === "not-deployed")) return "not-deployed";
  return "checking";
}

/**
 * Interactive ecosystem map: the borrower's pod at the centre, the twelve value-chain
 * roles (org-map) around it. Click or focus a node to read its role; roles with a demo app
 * expose a try-this-live launch with a status dot; roles with no app say so.
 * Driven entirely by the single service registry.
 */
export function EcosystemMap() {
  const [selectedSlug, setSelectedSlug] = useState(centerService.slug);
  const allPaths = [...roleServices, centerService].flatMap(serviceHealthPaths);
  const statuses = useServiceStatuses([...new Set(allPaths)]);
  const selected =
    [centerService, ...roleServices].find((service) => service.slug === selectedSlug) ??
    centerService;
  const selectedStatus = serviceStatus(selected, statuses);

  return (
    <div data-ecosystem-map="">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          aria-pressed={selectedSlug === centerService.slug}
          className={cn(
            "rounded-xl border-2 p-4 text-left transition-colors sm:col-span-2 lg:col-span-3",
            selectedSlug === centerService.slug
              ? "border-primary bg-primary/5"
              : "border-primary/40 bg-card hover:border-primary",
          )}
          data-map-center=""
          data-map-node={centerService.slug}
          key={centerService.slug}
          onClick={() => setSelectedSlug(centerService.slug)}
          type="button"
        >
          <p className="font-semibold text-card-foreground">
            {centerService.role}{" "}
            <span className="font-normal text-muted-foreground">— at the centre</span>
          </p>
          <p className="mt-0.5 text-muted-foreground text-sm">
            modelled on {centerService.modelledOn}
          </p>
          <StatusDot
            className="mt-2"
            status={serviceStatus(centerService, statuses) ?? "checking"}
          />
        </button>
        {roleServices.map((service) => {
          const status = serviceStatus(service, statuses);
          const isSelected = selectedSlug === service.slug;
          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/60",
              )}
              data-map-node={service.slug}
              data-map-role={service.roleNumber}
              key={service.slug}
              onClick={() => setSelectedSlug(service.slug)}
              type="button"
            >
              <p className="text-muted-foreground text-xs">Role {service.roleNumber}</p>
              <p className="mt-0.5 font-semibold text-card-foreground text-sm">{service.role}</p>
              <p className="mt-0.5 truncate text-muted-foreground text-sm">{service.modelledOn}</p>
              {status === undefined ? (
                <span className="mt-2 inline-block text-muted-foreground text-xs">
                  No app in this demo
                </span>
              ) : (
                <StatusDot className="mt-2" status={status} />
              )}
            </button>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className="mt-4 rounded-xl border border-border bg-card p-5"
        data-map-detail=""
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-card-foreground">
            {selected.roleNumber !== undefined && (
              <span className="text-muted-foreground">Role {selected.roleNumber} · </span>
            )}
            {selected.role}
          </h3>
          {selected.membership !== undefined && (
            <p className="text-muted-foreground text-sm">{selected.membership}</p>
          )}
        </div>
        <p className="mt-1 text-muted-foreground text-sm">modelled on {selected.modelledOn}</p>
        <p className="mt-3 text-card-foreground text-sm">{selected.summary}</p>
        {selected.apps.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {selected.apps.map((slug) => (
              <TryLiveButton app={slug} key={slug} label={`Open ${demoApps[slug].appName}`} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground text-sm" data-map-no-app="">
            This role has no app in this demo.
          </p>
        )}
        {selectedStatus === "not-deployed" && (
          <p className="mt-2 text-muted-foreground text-xs">This app is not running here.</p>
        )}
      </div>
    </div>
  );
}
