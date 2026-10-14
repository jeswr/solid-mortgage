/**
 * Industry context for the landing page (SPEC §1; master-narrative §2), each cited to a
 * public source. Numbers here must not drift from docs/research/mortgage-process.md §4.
 * These are industry figures, not results of this demo (astra-review-1 M14); the breach
 * statistic was removed from the main journey.
 */

export interface Anchor {
  id: string;
  value: string;
  label: string;
  detail: string;
  source: { name: string; url: string };
}

export const anchors: Anchor[] = [
  {
    detail:
      "Average lender cost to originate one loan (Q3 2023). This is the lender's cost, not the borrower's closing costs.",
    id: "cost-to-originate",
    label: "lender cost to originate one loan",
    source: {
      name: "Freddie Mac, 2024 Cost to Originate Study",
      url: "https://sf.freddiemac.com/docs/pdf/cost-to-originate-full-study-2024.pdf",
    },
    value: "~$11,600",
  },
  {
    detail: "Average days from offer to closing (ICE, 2024–2025).",
    id: "days-to-close",
    label: "days to close",
    source: {
      name: "ICE Mortgage Technology (via Rocket Mortgage)",
      url: "https://www.rocketmortgage.com/learn/time-to-close-on-a-house",
    },
    value: "41–44",
  },
  {
    detail:
      "Fannie Mae reports that its Day 1 Certainty validation can cut up to 12 days. This demo's savings are not measured.",
    id: "gse-days-saved",
    label: "days saved by digital validation, as Fannie Mae reports",
    source: {
      name: "Fannie Mae, Day 1 Certainty",
      url: "https://singlefamily.fanniemae.com/applications-technology/day-1-certainty",
    },
    value: "Up to 12",
  },
];
