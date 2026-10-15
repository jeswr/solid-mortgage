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
| Watch what happens in the pod | **Pod activity** on every page, or pop it out: `http://127.0.0.1:4400/__demo/activity` |

### Guided click-through

A card on each page names the stage, says what happens, and highlights the button to press.
**Do it for me** presses it. **Next** moves on, and opens the next app at the right page when
the journey changes organisation. On an action step, Next reads **Skip step** until the action
is done. **Details** shows what to look for in Pod activity. On wide screens the card and the
demo buttons sit in a column beside the page, so they do not cover it.

The 23 steps follow the five stages in `docs/glossary.md` §3:

1. Verify income, assets and credit
2. Prequalify without disclosing income or credit score
3. Apply with data from the pod (Alex gives the AUS access before underwriting runs)
4. Re-verify employment before closing
5. Close the loan and transfer servicing

Each app shows its concept-demo notice first. Accept it and carry on.

### Assistants

Two apps offer an assistant instead of forms. In Data Vault (`/wallet/assistant`) it gets
prequalification quotes. On the lender's site (`/lender-boa/assistant`) it prefills and submits
the application. Each asks which sources it may read (the pod, and a simulated inbox) and
offers the manual route instead. It shows each action and submits only when you say yes. You
can type to it in plain language, for example "you can read my pod but not my email".

**Language model.** When the Claude Code CLI is installed and signed in on the machine
running `pnpm demo`, the assistants are answered by **Claude Opus 5.5** through it
(`claude -p`, headless, no tools), so every turn counts against that Claude Code account's
usage. The model only chooses one of the actions the page allows at that moment and writes
the reply; the app performs the action with its normal, authenticated calls. The zero-knowledge
assistant never shows the model the borrower's income or score. Without Claude Code (or with
`DEMO_LLM=off`) the assistants fall back to scripted replies, and the chat header says which
is answering. `DEMO_LLM_MODEL` picks another model. This only works for local runs: a public
deployment would need an API key instead of a personal login.

The loan officer's view is the lender's pipeline (`/lender-boa/pipeline`). It reads each loan
file from the borrower's pod and can mark it clear to close.

## What is real and what is simplified

- **Real:** every app is the production build; every app API call carries a real
  DPoP-bound Solid-OIDC token for the demo borrower, minted by a local identity provider and
  verified by the app's own auth boundary (decision 0015); credentials are really signed,
  verified, issued and revoked; zero-knowledge proofs are really computed in the browser and
  verified by both lenders; every pod read and write in the panel really happened.
- **Automatic login:** the local gateway adds the borrower's credentials to each app's API
  calls, so nobody types a password. Untick **Sign in automatically** in the panel to see
  the apps refuse anonymous calls.
- **Simplified:** the pod runs in development mode. Permission changes are saved and shown
  as the apps make them, but the pod answers every request as Alex. It does not enforce each
  organisation's access. The Pod activity panel says so too.

## How it fits together

`scripts/demo/start.ts` boots the borrower's identity provider, one service identity per
organisation that writes to the pod, the pod itself (sparq's Solid server) behind a
recording proxy, every app (`next start`), and the gateway. The gateway
(`scripts/demo/gateway.ts`) routes `/<app>/…` to each app, adds the borrower's
credentials to API calls, and injects the overlay (`scripts/demo/overlay/overlay.js`) into
every page. Each app's pages are served only on its own port; opening another app's page
redirects there, while API calls between apps (Data Vault sending proofs to the lenders) are
proxied. The guided steps live in `scripts/demo/steps.ts`; the pod log in
`scripts/demo/activity.ts`. When it is served by this gateway, Data Vault reads the same
shared pod as the other apps instead of its in-browser pod.

`pnpm demo:check` (with `pnpm demo` running) drives all 23 guided steps in a headless
browser, the way a visitor would, and checks that the pod log recorded the journey's writes
and access changes. `DEMO_SCREENSHOTS=<dir>` saves a screenshot per step. `DEMO_PORT`
changes the overview's port (the apps take the next seven).
