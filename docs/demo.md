# Running the demo locally

One command starts the whole Solid Mortgage Showcase on one local address, with the
borrower's pod seeded and every app signed in for you.

```bash
pnpm install
pnpm build
pnpm demo
```

Then open **http://127.0.0.1:4400/**. Everything runs on your machine, in memory, and
disappears when you press Ctrl-C.

## Three ways in

| You want to… | Go to |
|---|---|
| Be walked through the whole journey | **Guided click-through** on the home page, or `http://127.0.0.1:4400/?guided=1` |
| Open one app and play with it | **Open the apps** on the home page, or `http://127.0.0.1:4400/apps` |
| Watch what happens in the pod | **Pod activity** (bottom left on every page), or pop it out: `http://127.0.0.1:4400/__demo/activity` |

### Guided click-through

A card on every page says which scene you are in, what is happening, and which button to
press (it is highlighted). **Do it for me** presses it; **Next** moves on, opening the
next app when the journey moves to another organisation. The 20 steps cover the five
scenes: fill the vault, zero-knowledge pre-qualification with two lenders, the pod-prefilled
application and underwriting, the freshness re-issue, and closing with the access hand-over
from lender to servicer. Each app still shows its own concept-demo notice first; accept it
and carry on.

### Pod activity

Every request that reaches Alex Rivera's pod is listed live, newest first: reads, writes,
deletes, and **access changes**. For an access change the panel shows the rules that were
added (+), removed (−) and kept, with each party named. Filter by kind, or pop the panel
out into its own window to keep it beside the apps during a presentation. Sign-ins the demo
performs for you are listed too.

**Reset demo data** (in the panel) puts the pod back to its starting state so the journey
can be run again.

## What is real and what is simplified

- **Real:** every app is the production build; every app API call carries a real
  DPoP-bound Solid-OIDC token for the demo borrower, minted by a local identity provider and
  verified by the app's own auth boundary (decision 0015); credentials are really signed,
  verified, issued and revoked; zero-knowledge proofs are really computed in the browser and
  verified by both lenders; every pod read and write in the panel really happened.
- **Automatic login:** the local gateway adds the borrower's credentials to each app's API
  calls, so nobody types a password. Untick **Sign in automatically** in the panel to see
  the apps refuse anonymous calls.
- **Simplified:** the pod runs in development mode. Access rules are written, read and shown
  exactly as the apps produce them, but the pod answers every request as its owner instead
  of enforcing them. Each app's notice and the vault's simulated-login strip say so too.

## How it fits together

`scripts/demo/start.ts` boots the borrower's identity provider, one service identity per
organisation that writes to the pod, the pod itself (sparq's Solid server) behind a
recording proxy, every app (`next start`), and the gateway. The gateway
(`scripts/demo/gateway.ts`) routes `/<app>/…` to each app, adds the borrower's
credentials to API calls, and injects the overlay (`scripts/demo/overlay/overlay.js`) into
every page. The guided steps live in `scripts/demo/steps.ts`; the pod log in
`scripts/demo/activity.ts`. When it is served by this gateway, the Data Vault reads the same
shared pod as the other apps instead of its in-browser pod.

`pnpm demo:check` (with `pnpm demo` running) drives all 20 guided steps in a headless
browser, the way a visitor would, and checks that the pod log recorded the journey's writes
and access changes. `DEMO_SCREENSHOTS=<dir>` saves a screenshot per step. `DEMO_PORT`
changes the gateway port.
