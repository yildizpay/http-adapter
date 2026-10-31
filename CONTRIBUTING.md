# Contributing to @yildizpay/http-adapter

Thank you for your interest in contributing. This document covers everything you need to get started.

## Prerequisites

- Node.js >= 22
- pnpm >= 10

## Setup

```bash
git clone https://github.com/yildizpay/http-adapter.git
cd http-adapter
pnpm install
```

## Development Workflow

### Running tests

```bash
pnpm test            # run all tests (Vitest)
pnpm test:watch      # re-run tests on change
pnpm test:coverage   # run with coverage report (100% required)
```

### Type checking, linting and formatting

```bash
pnpm typecheck       # tsc --noEmit over src and test
pnpm lint            # Biome lint
pnpm check           # Biome lint + format + import sorting, with fixes applied
```

### Building

```bash
pnpm build           # tsup: ESM + CJS bundles and type declarations in dist/
pnpm lint:package    # publint + are-the-types-wrong on the packed tarball
```

## Making Changes

1. **Open an issue first** — for anything beyond a trivial fix, open an issue to discuss the change before writing code. This avoids wasted effort if the direction isn't aligned.

2. **Fork and branch** — create a branch with a descriptive name. Branch from `next` for v4 work and from `main` for v3.11.x fixes:
   - `fix/circuit-breaker-half-open-race`
   - `feat/request-level-retry-override`
   - `chore/update-dependencies`

3. **Write tests** — all changes must be covered by tests. The project maintains 100% test coverage.

4. **Keep commits focused** — one logical change per commit. Follow [Conventional Commits](https://www.conventionalcommits.org):
   - `fix:` for bug fixes
   - `feat:` for new features
   - `chore:` for maintenance tasks
   - `docs:` for documentation changes

5. **Add a changeset** — run `pnpm changeset`, pick the bump type and describe the change for users. The text becomes the CHANGELOG entry. For changes that don't need a release (CI, tests, internal docs), run `pnpm changeset add --empty`. CI fails on a PR without one.

6. **Open a PR** — fill in the PR template. Link the related issue.

## Releasing

Releases are automated with [changesets](https://github.com/changesets/changesets) and npm [staged publishing](https://docs.npmjs.com/cli/commands/npm-stage):

1. While changesets are pending on `main` or `next`, CI keeps a **`chore: release`** PR open that bumps the version and writes CHANGELOG.md.
2. Merging that PR runs `scripts/release.sh`, which stages the version on npm through trusted publishing (no npm token) with provenance, then creates the git tag and GitHub release.
3. A maintainer approves the staged version with 2FA, on npmjs.com or with `npm stage approve <stage-id>`. Until then nothing is installable.

`next` is in prerelease mode: its versions are `4.0.0-rc.N` and go to the `next` dist-tag, so `latest` is untouched. Run `pnpm changeset pre exit` there before the final 4.0.0 release.

## Guidelines

- **No breaking changes without discussion.** Breaking changes require a major version bump and prior agreement in an issue.
- **No new production dependencies.** This library is zero-dependency by design. Discuss in an issue before proposing one.
- **Match the existing code style.** Biome enforces linting and formatting — run `pnpm check` before committing.
- **Describe user-facing changes in the changeset.** Don't edit CHANGELOG.md by hand.

## Reporting Bugs

Use the [bug report template](https://github.com/yildizpay/http-adapter/issues/new?template=bug_report.md). Include a minimal reproduction — the easier it is to reproduce, the faster it gets fixed.

## Security Vulnerabilities

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.
