"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type BorrowerProfileView, readBorrowerProfile } from "@/lib/pod/credentials";
import { useVault } from "@/lib/pod/vault-context";

/**
 * The vault overview: pod boot state, the persona profile READ FROM THE POD
 * (not a hardcoded object — scene 1's "the data lives in the pod" beat), and
 * the section launcher.
 */
export function VaultHome() {
  const vault = useVault();
  const [profile, setProfile] = useState<BorrowerProfileView | undefined>();
  const [profileError, setProfileError] = useState<string | undefined>();

  useEffect(() => {
    if (vault.status !== "ready") return;
    let cancelled = false;
    readBorrowerProfile(vault.connection.session.authFetch, vault.connection.webId).then(
      (view) => {
        if (!cancelled) setProfile(view);
      },
      (error: unknown) => {
        if (!cancelled) setProfileError(error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [vault]);

  if (vault.status === "booting") {
    return (
      <p className="mt-8 rounded-lg border border-border bg-card p-4 text-sm" data-vault-booting="">
        Starting your in-browser pod (a real WASM Solid server) and seeding the demo persona…
      </p>
    );
  }
  if (vault.status === "error") {
    return (
      <p
        className="mt-8 rounded-lg border border-border bg-card p-4 text-sm"
        data-vault-boot-error=""
        role="alert"
      >
        The in-browser pod failed to start: {vault.message}
      </p>
    );
  }

  return (
    <div className="mt-8" data-vault-ready="">
      <section aria-labelledby="profile-heading">
        <h2 className="text-xl font-semibold text-foreground" id="profile-heading">
          Borrower profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read live from <code className="break-all">{vault.connection.podBaseUrl}</code> —{" "}
          {vault.connection.kind === "remote"
            ? "the shared pod on your local demo server."
            : "a pod running entirely in this browser."}
        </p>
        {profile === undefined ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {profileError === undefined
              ? "Reading the profile document from the pod…"
              : `Could not read the profile: ${profileError}`}
          </p>
        ) : (
          <dl className="mt-3 grid gap-2 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="font-medium text-muted-foreground">Name</dt>
            <dd className="m-0" data-profile-name="">
              {profile.name}
            </dd>
            <dt className="font-medium text-muted-foreground">WebID</dt>
            <dd className="m-0 break-all">{vault.connection.webId}</dd>
            <dt className="font-medium text-muted-foreground">Email</dt>
            <dd className="m-0">{profile.emails.join(", ")}</dd>
            {profile.telephone !== undefined && (
              <>
                <dt className="font-medium text-muted-foreground">Phone</dt>
                <dd className="m-0">{profile.telephone}</dd>
              </>
            )}
            <dt className="font-medium text-muted-foreground">Address</dt>
            <dd className="m-0">
              {profile.addressLines.map((line) => (
                <span className="block" key={line}>
                  {line}
                </span>
              ))}
            </dd>
          </dl>
        )}
      </section>

      <nav aria-label="Vault sections" className="mt-8">
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {[
            {
              href: "/credentials",
              title: "Credential wallet",
              body: "Your verifications as reusable, signed credentials — verified on view.",
            },
            {
              href: "/prequal",
              title: "Shop without undressing",
              body: "Prove income and score thresholds to two lenders — revealing neither value.",
            },
            {
              href: "/grants",
              title: "Access grants",
              body: "Who can read what, granted and revoked by you — enforced by your pod.",
            },
            {
              href: "/ledger",
              title: "Consent-receipt ledger",
              body: "Every grant and revocation, receipted. The scene-5 payoff.",
            },
          ].map((item) => (
            <li className="rounded-lg border border-border bg-card p-4" key={item.href}>
              <Link
                className="font-semibold text-card-foreground underline-offset-4 hover:underline"
                href={item.href}
              >
                {item.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
