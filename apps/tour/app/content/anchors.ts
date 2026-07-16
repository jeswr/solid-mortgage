/**
 * Quantified anchors for the landing pitch (SPEC §1; master-narrative §2), each cited to
 * a public source. Numbers here must not drift from docs/research/mortgage-process.md §4.
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
      "Average cost to originate a loan (Q3 2023), up about $3,000 since late 2020 — mostly fulfillment and verification labour.",
    id: "cost-to-originate",
    label: "to originate one loan",
    source: {
      name: "Freddie Mac, 2024 Cost to Originate Study",
      url: "https://sf.freddiemac.com/docs/pdf/cost-to-originate-full-study-2024.pdf",
    },
    value: "~$11,600",
  },
  {
    detail:
      "Average time from offer to close (ICE, 2024–2025). The delay is ordering, waiting for, and re-checking verifications — not underwriting judgement.",
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
      "Time the GSEs' own data-validation programmes already cut from the process — proof, from inside the industry, that verified data fixes this.",
    id: "gse-days-saved",
    label: "days saved by GSE data-validation programmes",
    source: {
      name: "Fannie Mae, Day 1 Certainty",
      url: "https://singlefamily.fanniemae.com/applications-technology/day-1-certainty",
    },
    value: "Up to 12",
  },
  {
    detail:
      "People exposed in the Mr. Cooper breach (2023); a single 2019 title-data exposure spanned 885 million documents. Every unmanaged copy is a liability.",
    id: "breach-scale",
    label: "people exposed in one mortgage-sector breach",
    source: {
      name: "BleepingComputer (Mr. Cooper); Cybersecurity Dive (First American)",
      url: "https://www.bleepingcomputer.com/news/security/mortgage-giant-mr-cooper-data-breach-affects-147-million-people/",
    },
    value: "14.7M",
  },
];
