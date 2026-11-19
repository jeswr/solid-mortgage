# SLOW-COMMANDS.md

| Command | Cold | Warm | Notes |
|---|---|---|---|
| `pnpm run test:e2e:site` | – | ~8 min | Builds the site, then runs the root acceptance suite (74 tests) against `dist/` |
