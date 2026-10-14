import { cn } from "@jeswr/app-shell";
import type { CSSProperties, ReactNode } from "react";

export type CredentialStatus = "valid" | "pending" | "expired" | "revoked";

/** Which verification a card shows; rendered as `data-credential-kind`. */
export type CredentialKind = "employment" | "assets" | "credit";

export interface CredentialCardProps {
  /** Credential type, e.g. "Employment and income". */
  title: string;
  /** Issuer display name (role-first framing, e.g. "employment and income verifier"). */
  issuer: string;
  /** Pre-formatted validity-window bounds (this component does no date localisation). */
  validFrom?: string;
  validUntil?: string;
  status: CredentialStatus;
  /** Verification kind, rendered as `data-credential-kind`. Omit for other record types. */
  kind?: CredentialKind;
  /**
   * The card previews a credential that has not been issued: the issuer line reads
   * "Demo issuer: …" plus "Preview — not issued." instead of "Issued by …".
   */
  preview?: boolean;
  /** Optional extra claim rows. */
  children?: ReactNode;
  className?: string;
}

const STATUS_PRESENTATION: Record<CredentialStatus, { color: string; label: string }> = {
  expired: { color: "#64748b", label: "Expired" },
  pending: { color: "#d97706", label: "Pending" },
  revoked: { color: "#dc2626", label: "Revoked" },
  valid: { color: "#16a34a", label: "Valid" },
};

function dotStyle(color: string): CSSProperties {
  return {
    background: color,
    borderRadius: "9999px",
    display: "inline-block",
    height: "0.5rem",
    width: "0.5rem",
  };
}

/**
 * Visual for a verifiable credential: issuer, validity window, and a status dot that is
 * never colour-only (the status label is always rendered as text).
 */
export function CredentialCard({
  title,
  issuer,
  validFrom,
  validUntil,
  status,
  kind,
  preview = false,
  children,
  className,
}: CredentialCardProps) {
  const presentation = STATUS_PRESENTATION[status];
  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-4", className)}
      data-credential-card=""
      data-credential-kind={kind}
      data-credential-preview={preview ? "" : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-card-foreground text-sm">{title}</p>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {preview ? `Demo issuer: ${issuer}` : `Issued by ${issuer}`}
          </p>
          {preview && <p className="mt-0.5 text-muted-foreground text-xs">Preview — not issued.</p>}
        </div>
        <p className="flex items-center gap-1.5 text-sm" data-credential-status={status}>
          <span aria-hidden="true" style={dotStyle(presentation.color)} />
          {presentation.label}
        </p>
      </div>
      {(validFrom !== undefined || validUntil !== undefined) && (
        <p className="mt-2 text-muted-foreground text-xs">
          {validFrom !== undefined && `Valid from ${validFrom}`}
          {validFrom !== undefined && validUntil !== undefined && " · "}
          {validUntil !== undefined && `until ${validUntil}`}
        </p>
      )}
      {children !== undefined && <div className="mt-3 text-sm">{children}</div>}
    </div>
  );
}
