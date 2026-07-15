#!/usr/bin/env bash
# drain-daemon.sh — headless bead drain for solid-mortgage.
#
# Loops forever: when dispatchable ready beads exist (status open, not needs:user, not an
# epic), launches a headless Claude Code run that invokes the committed drain-ready-beads
# workflow (.claude/workflows/drain-ready-beads.js). This keeps the frontier draining
# WITHOUT the lead session being available. A lock directory prevents overlapping drains.
#
# Start:  nohup scripts/drain-daemon.sh >/dev/null 2>&1 &
# Stop:   pkill -f drain-daemon.sh
# Logs:   .beads/drain.log
# Tuning: DRAIN_INTERVAL_SECS (default 900), DRAIN_MAX_BEADS (default 4),
#         DRAIN_CLAUDE_FLAGS — defaults to "--permission-mode acceptEdits", which relies on
#         the committed .claude/settings.json allowlist (bd/git/gh/pnpm/jq) for the drain's
#         command surface; anything outside it is auto-denied in headless mode and the drain
#         reports rather than acts. Fully-unattended operation with the permission gate OFF
#         is an OPERATOR opt-in, never a default:
#             export DRAIN_CLAUDE_FLAGS="--dangerously-skip-permissions"
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
INTERVAL="${DRAIN_INTERVAL_SECS:-900}"
MAX_BEADS="${DRAIN_MAX_BEADS:-4}"
CLAUDE_FLAGS="${DRAIN_CLAUDE_FLAGS:---permission-mode acceptEdits}"
LOCK="$REPO/.beads/drain.lock"
LOG="$REPO/.beads/drain.log"

cd "$REPO"
echo "[$(date -u +%FT%TZ)] drain-daemon started (interval=${INTERVAL}s maxBeads=${MAX_BEADS})" >>"$LOG"

while true; do
  n="$(bd ready --json 2>/dev/null | jq '[.[]
        | select(.status == "open")
        | select(.issue_type != "epic")
        | select(([.labels[]? | select(. == "needs:user")] | length) == 0)
      ] | length' 2>/dev/null || echo 0)"

  if [ "${n:-0}" -gt 0 ]; then
    if mkdir "$LOCK" 2>/dev/null; then
      echo "[$(date -u +%FT%TZ)] $n dispatchable bead(s) — launching drain" >>"$LOG"
      # shellcheck disable=SC2086
      claude -p "Invoke the Workflow tool with {\"name\": \"drain-ready-beads\", \"args\": {\"maxBeads\": $MAX_BEADS}}, wait for it to complete, then print its JSON result. Do no other work." \
        $CLAUDE_FLAGS >>"$LOG" 2>&1 \
        || echo "[$(date -u +%FT%TZ)] drain run FAILED (see above)" >>"$LOG"
      rmdir "$LOCK" 2>/dev/null || true
      echo "[$(date -u +%FT%TZ)] drain run finished" >>"$LOG"
    else
      echo "[$(date -u +%FT%TZ)] $n dispatchable bead(s) but a drain is already running — skipping tick" >>"$LOG"
    fi
  fi
  sleep "$INTERVAL"
done
