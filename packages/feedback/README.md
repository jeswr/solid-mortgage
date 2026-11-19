<!-- AUTHORED-BY Claude Opus 5.5 -->
# @mortgage/feedback

The feedback interview for EDMA members, used by the `/feedback/` page (`apps/feedback`) and the
Vercel functions in `api/feedback/`.

- `@mortgage/feedback` (browser-safe): the question guide, answer and submission validation, the
  Markdown record and the download archive.
- `@mortgage/feedback/server` (Node only): the interviewer prompt, the request guards, signed
  recording receipts, the GitHub store and the `/api/feedback/*` handlers.

## Switching it on (Vercel project environment variables)

With none of these set, the page runs the plain questionnaire, offers a download and the
community links, and says sending is not switched on. Set them in the Vercel project's settings
(Production, and Preview if wanted); they are read only by the functions and never reach a page.

| Variable | Contents |
| --- | --- |
| `ANTHROPIC_API_KEY` | An Anthropic API key from a workspace with a spend limit (see below). Switches the interviewer on. |
| `FEEDBACK_GITHUB_TOKEN` | A fine-grained personal access token for one private repository only, with repository permissions Contents: Read and write, Issues: Read and write, Metadata: Read. |
| `FEEDBACK_GITHUB_REPO` | `owner/name` of that repository. It must be private (`visibility: private`) and have a default branch with at least one commit. |
| `FEEDBACK_RECEIPT_SECRET` | Optional: 32 or more random bytes that sign recording receipts. Without it the key is derived from the token. |
| `FEEDBACK_MODEL` | Optional: the interviewer model, `claude-opus-5-5` by default. |
| `FEEDBACK_ALLOWED_ORIGINS` | Optional: a comma-separated list of the only origins allowed to call the API. By default: the deployment's own origin, `https://solid-mortgage.vercel.app` and `VERCEL_PROJECT_PRODUCTION_URL`, plus loopback outside production. |

`GET /api/feedback/status` answers only `{ interviewer, sending }`. `sending` is true only after the
repository answered as private (checked at most every ten minutes, re-tried after a minute when
the check fails).

## Spend limit: required before setting `ANTHROPIC_API_KEY`

**Set a monthly spend limit on the Anthropic workspace that owns the key** (Anthropic Console,
workspace settings, limits), sized for the interviews you expect. The API's own limits are a
backstop only:

- The origin check stops other websites using the API through their visitors' browsers. A script
  can still send any `Origin` header it likes.
- Rate limits (per visitor and a daily total) are kept in each serverless instance's memory.
  Vercel runs and replaces instances freely, so they do not add up to a deployment-wide quota.

The workspace spend limit is the only deployment-wide cap on interviewer cost. This package adds
no shared store or other service to enforce one.

## What a submission stores

Each Send stores one commit adding `feedback/<submission id>/` (`submission.json`,
`summary.md`, any recordings) to the repository's default branch, and opens one issue whose
number is the visitor's reference. The page makes the submission id once and reuses it on every
retry, and the store looks for that id's issue and record before writing, so a retried Send
stores one record and opens one issue.

Recordings stay in the page until the visitor presses Send. Only then are they uploaded, each with
a receipt bound to that submission id.

The interviewer cannot confirm the read-back for the participant. A turn counts as confirmed only
when the previous message showed the stored summary word for word and the participant answered
with a plain yes. The summary then stays as shown.
