import { cn } from "@jeswr/app-shell";
import type { ReactNode } from "react";
import { ConceptDemoBanner } from "./concept-demo-banner";
import { type DisclaimerVariant, footerLegalLine } from "./disclaimers";
import { type OrgTheme, themeCssProperties } from "./themes";

export interface AppShellProps {
  appName: string;
  /** Org theme entry supplying `modelledOn`, `role`, and the palette tokens. */
  theme: OrgTheme;
  /** "own" only for surfaces published under the convener's own branding (apps/tour). */
  variant?: DisclaimerVariant;
  /** Destination of the banner's "About this demo" link (the tour app). */
  aboutHref?: string;
  /** Optional right-hand header slot (nav, account menu, …). */
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shared app frame: brand header with role-first framing, the R1 banner rendered directly
 * below the header (four-Ps adjacency — the banner is not a removable slot), and the §4.3
 * footer legal line. Applies the org theme's CSS custom properties to the whole frame.
 */
export function AppShell({
  appName,
  theme,
  variant = "modelled",
  aboutHref = "/",
  headerActions,
  children,
  className,
}: AppShellProps) {
  const framing =
    variant === "own"
      ? `${theme.role} · ${theme.modelledOn}`
      : `${theme.role} · modelled on ${theme.modelledOn}`;
  return (
    <div
      className={cn("flex min-h-dvh flex-col bg-background text-foreground", className)}
      data-app-shell=""
      style={themeCssProperties(theme)}
    >
      <a
        className="sr-only z-50 rounded bg-card px-4 py-2 text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        href="#main-content"
      >
        Skip to main content
      </a>
      <header className="border-border border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-semibold text-foreground text-lg">{appName}</p>
            <p className="text-muted-foreground text-sm">{framing}</p>
          </div>
          {headerActions}
        </div>
      </header>
      <ConceptDemoBanner
        aboutHref={aboutHref}
        organization={theme.modelledOn}
        orgRole={theme.role}
        placement="static"
        variant={variant}
      />
      {/* The skip link's target lives HERE so every consumer gets a working
          "Skip to main content" without declaring its own #main-content. */}
      <div className="flex-1" id="main-content" tabIndex={-1}>
        {children}
      </div>
      <footer className="border-border border-t bg-card" data-demo-footer="">
        <p className="mx-auto w-full max-w-5xl px-6 py-4 text-muted-foreground text-xs">
          {footerLegalLine({ organization: theme.modelledOn, variant })}
        </p>
      </footer>
    </div>
  );
}
