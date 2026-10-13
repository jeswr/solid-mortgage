# Running the demo locally

One command starts the whole Solid Mortgage Showcase locally: every app as its own
application on its own address (as each would have its own subdomain when deployed), the
borrower's pod seeded, and every app signed in for you.

```bash
pnpm install
pnpm build
pnpm demo
```

Then open **http://127.0.0.1:4400/**, the overview. Each app has its own port:

| App | Address |
|---|---|
| Overview and launcher | http://127.0.0.1:4400/ |
| Data Vault | http://127.0.0.1:4401/wallet |
| Verification Services | http://127.0.0.1:4402/verifications |
| Mortgage Origination (primary lender) | http://127.0.0.1:4403/lender-boa |
| Mortgage Pre-qualification (competing lender) | http://127.0.0.1:4404/lender-53 |
| Automated Underwriting | http://127.0.0.1:4405/gse |
| Property Services | http://127.0.0.1:4406/property |
| Digital Closing | http://127.0.0.1:4407/closing |

Everything runs on your machine, in memory, and disappears when you press Ctrl-C.

## Three ways in

| You want to… | Go to |
|---|---|
| Be walked through the whole journey | **Guided click-through** on the home page, or `http://127.0.0.1:4400/?guided=1` |
| Open one app and play with it | **Open the apps** on the home page, or `http://127.0.0.1:4400/apps` |
| Watch what happens in the pod | **Pod activity** (bottom left on every page), or pop it out: `http://127.0.0.1:4400/__demo/activity` |

### Guided click-through

A card on every page says which scene you are in, what is happening, and which button to
press (it is highlighted). **Do it for me** presses it; **Next** moves on. When the journey
moves to another organisation, Next opens that organisation's app at the right page (the
step travels in the URL), and **← Overview** on every page leaves the app and returns to the
overview. The 24 steps cover the five scenes: fill the vault, assistant-led zero-knowledge
pre-qualification with two lenders, the assistant-led application and the loan officer's
queue, underwriting, the freshness re-issue and clear-to-close, and closing with the access
hand-over from lender to servicer. Each app still shows its own concept-demo notice first;
accept it and carry on.

### Assistants

Two apps offer an assistant instead of forms. In the Data Vault (`/wallet/assistant`) it
shops for a pre-qualification; on the lender's site (`/lender-boa/assistant`) it fills in
and submits the application. Each asks for consent **per source** before reading anything
(your pod; your inbox, which is simulated), offers to let you do it yourself instead, shows
each action it takes, and only submits on your yes. The assistants are scripted (no language
model) and say so; every action they take is a real call the manual pages also make. The
loan officer's side is the lender's pipeline (`/lender-boa/pipeline`), which reads each file
live from the borrower's pod and can clear it to close.

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
every page. Each app's pages are served only on its own port; opening another app's page
redirects there, while API calls between apps (the vault sending proofs to the lenders) are
proxied. The guided steps live in `scripts/demo/steps.ts`; the pod log in
`scripts/demo/activity.ts`. When it is served by this gateway, the Data Vault reads the same
shared pod as the other apps instead of its in-browser pod.

`pnpm demo:check` (with `pnpm demo` running) drives all 24 guided steps in a headless
browser, the way a visitor would, and checks that the pod log recorded the journey's writes
and access changes. `DEMO_SCREENSHOTS=<dir>` saves a screenshot per step. `DEMO_PORT`
changes the overview's port (the apps take the next seven).
