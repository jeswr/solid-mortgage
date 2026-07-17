/**
 * Shared banner / interstitial / axe assertions (sm-35 apps.spec helpers,
 * hoisted for the sm-36 cross-app journey — ONE copy of the R1 banner
 * contract and the WCAG severity bar, consumed by both suites).
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import {
  bannerFullText,
  copyText,
  type DisclaimerVariant,
  INTERSTITIAL_CONTINUE_LABEL,
  INTERSTITIAL_HEADING,
  interstitialParagraphs,
} from "../../packages/ui/src/disclaimers";

/** One branded surface's R1 banner identity (org/role/variant). */
export interface BannerIdentity {
  readonly organization: string;
  readonly role?: string;
  readonly variant?: DisclaimerVariant;
}

/** The unremovable ConceptDemoBanner, with its full required copy. */
export async function expectBannerVisible(page: Page, identity: BannerIdentity): Promise<void> {
  // `.first()`: pages may carry additional per-section banners (e.g. the
  // closing app's servicer section); the shell banner always renders first.
  const banner = page.locator("[data-concept-demo-banner]").first();
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(
    bannerFullText({
      organization: identity.organization,
      role: identity.role,
      variant: identity.variant,
    }),
  );
  await expect(banner.getByRole("link", { name: "About this demo" })).toBeVisible();
}

/** Acknowledge the consent interstitial, asserting the verbatim negation copy. */
export async function acknowledgeInterstitial(
  page: Page,
  organization: string,
  variant: DisclaimerVariant = "modelled",
): Promise<void> {
  const dialog = page.getByRole("dialog", { name: INTERSTITIAL_HEADING });
  await expect(dialog).toBeVisible();
  // Negation paragraph (regn-optics §4.2; own variant per sm-90e) must be present verbatim.
  await expect(dialog).toContainText(copyText(interstitialParagraphs(organization, variant)[1]));
  await dialog.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL }).click();
  await expect(dialog).toBeHidden();
}

/** Click through an interstitial IF one is showing (fresh-context page loads). */
export async function dismissInterstitialIfPresent(page: Page): Promise<void> {
  const consent = page.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL });
  if (await consent.isVisible().catch(() => false)) {
    await consent.click();
    await expect(consent).toBeHidden();
  }
}

/**
 * The suite-wide axe bar: WCAG 2.x A/AA, zero violations. (The axe
 * "best-practice" bucket is excluded across the per-app suites: its
 * landmark-containment rule flags the shared ConceptDemoBanner — a
 * packages/ui surface with its own follow-up bead.)
 */
export async function expectAxeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}
