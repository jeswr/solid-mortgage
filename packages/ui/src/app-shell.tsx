import { cn } from "@jeswr/app-shell";
import type { CSSProperties, ReactNode } from "react";
import { ConceptDemoBanner } from "./concept-demo-banner";
import { type DisclaimerVariant, footerLegalLine } from "./disclaimers";
import {
  type BrandMarkShape,
  brandCssProperties,
  type OrgBrand,
  type OrgTheme,
  type ThemeStyleProperties,
} from "./themes";

/** The demo persona shown in the signed-in chip (never a real account). */
export interface ShellAccount {
  name: string;
  /** Small qualifier under the name; defaults to "demo account". */
  label?: string;
}

export interface AppShellProps {
  appName: string;
  /** Org theme entry supplying `modelledOn`, `role`, the palette tokens, and the brand. */
  theme: OrgTheme;
  /** "own" only for surfaces published under the convener's own branding (apps/tour). */
  variant?: DisclaimerVariant;
  /** Destination of the banner's "About this demo" link (the tour app). */
  aboutHref?: string;
  /** Optional header nav slot. */
  headerActions?: ReactNode;
  /** Optional right-side signed-in chip for borrower-facing apps (demo persona). */
  account?: ShellAccount;
  /**
   * Staff screens: the role the visitor is viewing as, e.g. "lender underwriter". Renders
   * "Viewing as: {viewingAs}" below the banner, separate from the demo-account identity.
   */
  viewingAs?: string;
  children: ReactNode;
  className?: string;
}

/** Shared class for header nav links (reads on light and dark brand headers). */
export const headerNavLinkClass =
  "rounded-md px-1 py-0.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

/** The demo borrower persona for borrower-facing apps' signed-in chip. */
export const DEMO_BORROWER_ACCOUNT: ShellAccount = { name: "Alex Rivera" };

const WIDTH_CLASS = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

const DENSITY_CLASS = {
  comfortable: "py-4",
  compact: "py-2.5",
  spacious: "py-6",
} as const;

/** Header styles that sit on a dark primary surface (light text). */
const DARK_HEADERS = new Set<OrgBrand["header"]>(["solid", "gradient"]);

/** Re-points the text tokens at light values so nav links read on a dark surface. */
const ON_DARK_STYLE: ThemeStyleProperties = {
  "--foreground": "var(--primary-foreground)",
  "--muted-foreground": "color-mix(in oklch, var(--primary-foreground) 82%, var(--primary))",
};

function MarkShape({ shape }: { shape: BrandMarkShape }) {
  switch (shape) {
    case "circle":
      return <circle cx="20" cy="20" r="19" />;
    case "hexagon":
      return <polygon points="20,1 37,10.5 37,29.5 20,39 3,29.5 3,10.5" />;
    case "diamond":
      return <polygon points="20,0.5 39.5,20 20,39.5 0.5,20" />;
    case "notch":
      return <path d="M1 1H28L39 12V39H1Z" />;
    default:
      return <rect height="38" rx="10" width="38" x="1" y="1" />;
  }
}

/**
 * An original abstract monogram: the brand's initials inside a plain geometric shape.
 * Decorative only (`aria-hidden`) — the product name is always rendered as text beside it.
 */
export function BrandMark({ brand, onDark = false }: { brand: OrgBrand; onDark?: boolean }) {
  const fill = onDark ? "var(--primary-foreground)" : "var(--primary)";
  const ink = onDark ? "var(--primary)" : "var(--primary-foreground)";
  const twoChar = brand.markText.length > 1;
  const fontSize = twoChar ? (brand.markShape === "diamond" ? 12 : 15) : 18;
  return (
    <svg
      aria-hidden="true"
      className="h-10 w-10 shrink-0"
      data-brand-mark=""
      focusable="false"
      viewBox="0 0 40 40"
    >
      <g fill={fill}>
        <MarkShape shape={brand.markShape} />
      </g>
      <text
        dominantBaseline="central"
        fill={ink}
        fontFamily="var(--font-heading, inherit)"
        fontSize={fontSize}
        fontWeight={700}
        textAnchor="middle"
        x="20"
        y="20.5"
      >
        {brand.markText}
      </text>
    </svg>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function AccountChip({ account, onDark }: { account: ShellAccount; onDark: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1",
        onDark ? "border-current/30" : "border-border bg-card",
      )}
      data-account-chip=""
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full font-semibold text-xs",
          onDark ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
        )}
      >
        {initials(account.name)}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-medium text-foreground text-sm">{account.name}</span>
        <span className="text-[0.7rem] text-muted-foreground">
          {account.label ?? "demo account"}
        </span>
      </span>
    </div>
  );
}

export interface BrandHeaderProps {
  appName: string;
  theme: OrgTheme;
  /** The role-first framing line ("{role} · modelled on {X}"). */
  framing: string;
  headerActions?: ReactNode;
  account?: ShellAccount;
}

/**
 * The branded product header: original mark + fictional product name, the app name, the
 * role-first framing line, nav, and an optional demo-persona chip. Themes without a
 * `brand` block render the plain header.
 */
export function BrandHeader({ appName, theme, framing, headerActions, account }: BrandHeaderProps) {
  const brand = theme.brand;
  if (brand === undefined) {
    return (
      <header className="border-border border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-semibold text-foreground text-lg">{appName}</p>
            <p className="text-muted-foreground text-sm">{framing}</p>
          </div>
          {headerActions}
          {account !== undefined && <AccountChip account={account} onDark={false} />}
        </div>
      </header>
    );
  }
  const width = WIDTH_CLASS[brand.width ?? "5xl"];
  const onDark = DARK_HEADERS.has(brand.header);
  const identity = (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark brand={brand} onDark={onDark} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              "font-bold text-foreground text-xl leading-tight",
              brand.uppercaseName === true && "text-lg uppercase tracking-[0.12em]",
            )}
            data-product-name=""
            style={{ fontFamily: "var(--font-heading, inherit)" }}
          >
            {brand.productName}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-medium text-xs",
              onDark
                ? "bg-primary-foreground/15 text-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {appName}
          </span>
        </p>
        <p className="mt-0.5 text-muted-foreground text-sm">{framing}</p>
      </div>
    </div>
  );
  const row = (withChip: boolean) => (
    <div
      className={cn(
        "mx-auto flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6",
        width,
        DENSITY_CLASS[brand.density],
      )}
    >
      {identity}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {headerActions}
        {withChip && account !== undefined && <AccountChip account={account} onDark={onDark} />}
      </div>
    </div>
  );
  const onDarkStyle = ON_DARK_STYLE as CSSProperties;

  switch (brand.header) {
    case "solid":
      return (
        <header
          className="border-black/20 border-b bg-primary text-primary-foreground"
          data-brand-header="solid"
          style={onDarkStyle}
        >
          {row(true)}
        </header>
      );
    case "gradient":
      return (
        <header
          className="text-primary-foreground"
          data-brand-header="gradient"
          style={{
            ...onDarkStyle,
            background:
              "linear-gradient(115deg, var(--primary) 0%, var(--primary) 45%, color-mix(in oklch, var(--primary) 72%, var(--accent)) 100%)",
          }}
        >
          {row(true)}
        </header>
      );
    case "underline":
      return (
        <header className="border-primary border-b-4 bg-card" data-brand-header="underline">
          {row(true)}
        </header>
      );
    case "topbar":
      return (
        <header className="border-border border-b bg-card" data-brand-header="topbar">
          <div aria-hidden="true" className="h-1.5 bg-primary" />
          {row(true)}
        </header>
      );
    case "split":
      return (
        <header className="border-border border-b bg-card" data-brand-header="split">
          <div className="bg-primary text-primary-foreground" style={onDarkStyle}>
            <div
              className={cn(
                "mx-auto flex w-full flex-wrap items-center justify-between gap-3 px-6 py-1.5 text-xs",
                width,
              )}
            >
              <span className="text-muted-foreground">{brand.tagline ?? theme.role}</span>
              {account !== undefined && <AccountChip account={account} onDark />}
            </div>
          </div>
          <div aria-hidden="true" className="h-1 bg-accent" />
          {row(false)}
        </header>
      );
    case "pill":
      return (
        <header className="px-3 pt-4 pb-2 sm:px-6" data-brand-header="pill">
          <div
            className={cn(
              "mx-auto w-full rounded-2xl border border-border bg-card shadow-sm",
              width,
            )}
          >
            {row(true)}
          </div>
        </header>
      );
    default:
      return (
        <header className="border-border border-b bg-card" data-brand-header="minimal">
          {row(true)}
        </header>
      );
  }
}

/** The role-first framing line for a theme. */
export function framingLine(theme: OrgTheme, variant: DisclaimerVariant = "modelled"): string {
  return variant === "own"
    ? `${theme.role} · ${theme.modelledOn}`
    : `${theme.role} · modelled on ${theme.modelledOn}`;
}

/**
 * Shared app frame: branded product header with role-first framing, the R1 banner rendered
 * directly below the header (four-Ps adjacency — the banner is not a removable slot), and the
 * §4.3 footer legal line. Applies the org theme's CSS custom properties (palette, brand font,
 * radius scale) to the whole frame.
 */
export function AppShell({
  appName,
  theme,
  variant = "modelled",
  aboutHref = "/",
  headerActions,
  account,
  viewingAs,
  children,
  className,
}: AppShellProps) {
  const width = WIDTH_CLASS[theme.brand?.width ?? "5xl"];
  const style = brandCssProperties(theme) as CSSProperties;
  // Body copy uses the shared readable sans-serif; brand fonts stay on headings (h1–h3 via
  // --font-heading) and the product name.
  if (theme.brand !== undefined) style.fontFamily = "var(--font-body)";
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-background text-foreground [&_:is(h1,h2,h3)]:[font-family:var(--font-heading)]",
        className,
      )}
      data-app-shell=""
      data-brand={theme.id}
      style={style}
    >
      <a
        className="sr-only z-50 rounded bg-card px-4 py-2 text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        href="#main-content"
      >
        Skip to main content
      </a>
      <BrandHeader
        account={account}
        appName={appName}
        framing={framingLine(theme, variant)}
        headerActions={headerActions}
        theme={theme}
      />
      <ConceptDemoBanner
        aboutHref={aboutHref}
        organization={theme.modelledOn}
        orgRole={theme.role}
        placement="static"
        variant={variant}
      />
      {viewingAs !== undefined && (
        <p
          className={cn("mx-auto w-full px-6 pt-3 text-muted-foreground text-sm", width)}
          data-viewing-as=""
        >
          Viewing as: <span className="font-medium text-foreground">{viewingAs}</span>
        </p>
      )}
      {/* The skip link's target lives HERE so every consumer gets a working
          "Skip to main content" without declaring its own #main-content. */}
      <div className="flex-1" id="main-content" tabIndex={-1}>
        {children}
      </div>
      <footer className="border-border border-t bg-card" data-demo-footer="">
        <p className={cn("mx-auto w-full px-6 py-4 text-muted-foreground text-xs", width)}>
          {footerLegalLine({ organization: theme.modelledOn, variant })}
        </p>
      </footer>
    </div>
  );
}
