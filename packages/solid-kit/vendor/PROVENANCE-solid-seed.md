# Vendored @jeswr/synthetic-rdf + @jeswr/solid-seed — provenance

The sm-62 seeder design's generic tooling (sm-63/sm-64) lives in the `jeswr/solid-sdk`
monorepo and has not had its npm bootstrap publish yet; npm cannot install a subdirectory of
a git repo, so — exactly like the sparq solid server (`PROVENANCE.md`) — the packages are
built from a clean checkout and committed here as packed tarballs (decision 0009 mechanism).
Delete the tarballs and switch to registry versions once the upstream publish lands.

| Field | Value |
| --- | --- |
| Packages | `@jeswr/synthetic-rdf@0.1.0` (`jeswr-synthetic-rdf-0.1.0.tgz`, 44900 bytes, sha256 `ae340039d04254eab49d4e52f5c77ff12d9cff2bd4105eea9051469afb4c73dc`), `@jeswr/solid-seed@0.1.0` (`jeswr-solid-seed-0.1.0.tgz`, 16023 bytes, sha256 `f283c55569965cca6088e8452896dc4cede148b135cd168ebabde5ce87a36bc7`) |
| Source | <https://github.com/jeswr/solid-sdk> @ `8efdde94e0ff122054d7a51825908c7936996623` |
| Build command | `pnpm install --filter @jeswr/solid-seed... --filter @jeswr/synthetic-rdf...`, `pnpm --filter <pkg> run build`, then `pnpm pack` (per package, in dependency order after `@jeswr/rdf-serialize`) |
| Toolchain | node v24.18.0; pnpm 10.4.1 |
| Vendored | 2026-07-17 (sm-65) |

## Dependency wiring

`pnpm pack` rewrites the packages' `workspace:*` dependencies to bare versions
(`@jeswr/rdf-serialize@0.1.0`, `@jeswr/synthetic-rdf@0.1.0`) that do not exist on the
registry, so the ROOT `package.json` carries `pnpm.overrides` mapping:

- `@jeswr/synthetic-rdf` → this directory's tarball;
- `@jeswr/rdf-serialize` → the same `github:jeswr/rdf-serialize` commit ref
  `@mortgage/data-model` already depends on.

`shacl-engine` is an optional peer of `@jeswr/synthetic-rdf` (the `./validate` adapter);
`@mortgage/solid-kit` declares it directly.

## Refresh

```sh
git clone https://github.com/jeswr/solid-sdk && cd solid-sdk
pnpm install --filter @jeswr/solid-seed... --filter @jeswr/synthetic-rdf...
pnpm --filter @jeswr/rdf-serialize run build
pnpm --filter @jeswr/synthetic-rdf run build && (cd packages/synthetic-rdf && pnpm pack)
pnpm --filter @jeswr/solid-seed run build && (cd packages/solid-seed && pnpm pack)
# copy the tarballs here, update the hashes above, then `pnpm install` at the workspace root
```
