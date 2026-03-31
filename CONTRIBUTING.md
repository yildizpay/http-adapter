# Contributing to @yildizpay/http-adapter

Thank you for your interest in contributing. This document covers everything you need to get started.

## Prerequisites

- Node.js >= 18
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
pnpm test          # run all tests
pnpm test:cov      # run with coverage report
```

### Linting

```bash
pnpm lint          # check for lint errors
pnpm lint:fix      # auto-fix lint errors
```

### Building

```bash
pnpm build
```

## Making Changes

1. **Open an issue first** — for anything beyond a trivial fix, open an issue to discuss the change before writing code. This avoids wasted effort if the direction isn't aligned.

2. **Fork and branch** — create a branch from `main` with a descriptive name:
   - `fix/circuit-breaker-half-open-race`
   - `feat/request-level-retry-override`
   - `chore/update-dependencies`

3. **Write tests** — all changes must be covered by tests. The project maintains 100% test coverage.

4. **Keep commits focused** — one logical change per commit. Follow [Conventional Commits](https://www.conventionalcommits.org):
   - `fix:` for bug fixes
   - `feat:` for new features
   - `chore:` for maintenance tasks
   - `docs:` for documentation changes

5. **Open a PR** — fill in the PR template. Link the related issue.

## Guidelines

- **No breaking changes without discussion.** Breaking changes require a major version bump and prior agreement in an issue.
- **No new production dependencies.** This library is zero-dependency by design. Discuss in an issue before proposing one.
- **Match the existing code style.** Prettier and ESLint enforce the formatting — run `pnpm lint:fix` before committing.
- **Update CHANGELOG.md** for any user-facing change.

## Reporting Bugs

Use the [bug report template](https://github.com/yildizpay/http-adapter/issues/new?template=bug_report.md). Include a minimal reproduction — the easier it is to reproduce, the faster it gets fixed.

## Security Vulnerabilities

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.
