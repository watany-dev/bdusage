# AGENTS.md

Do not include any closing suggestions such as "if needed" or similar conditional offers at the end of your response.

## Project Overview

bdusage is a CLI to view Amazon Bedrock usage and costs from AWS billing and monitoring data. The UX is inspired by [ccusage](https://ccusage.com/guide/); data comes from AWS (CUR 2.0 + Athena, Cost Explorer, CloudWatch) rather than local agent logs.

**Core principle**: Never mix **actual** (billing) and **estimate** (monitoring) costs in one report. Every report header must show the data source, e.g. `source: CUR 2.0 actual` or `source: CloudWatch Logs estimate`.

## Build & Development

```bash
bun install
bun run ci          # lint, format, typecheck, dead-code, audit, test:coverage, build
bun run test
bun run build
```

### Prerequisites

- [Bun](https://bun.sh/) (see CI for version)
- Node.js >= 20 (engines field)

### Completion Requirements

Before considering a task complete, run:

```bash
bun run ci
```

1. `bun run lint` must pass (oxlint, deny warnings)
2. `bun run format:check` must pass (Biome)
3. `bun run check` must pass (`tsc --noEmit`)
4. `bun run dead-code` must pass (knip)
5. `bun run test:coverage` must pass (Vitest)
6. `bun run build` must succeed

Do not skip these checks.

## Architecture (current)

| Path | Role |
|------|------|
| `src/cli.ts` | CLI entry (`process.exit(runCli(...))`) |
| `src/cli/program.ts` | Commander program, global options, command dispatch |
| `src/cli/context.ts` | Config load, principal resolution, error mapping |
| `src/commands/*.ts` | summary, daily, monthly, models, whoami, doctor |
| `src/sources/cur/` | CUR SQL builders, Athena aggregation |
| `src/aws/` | STS, Athena clients |
| `src/bedrock/` | usage-type parser, model normalizer |
| `src/output/` | table / json / csv formatters |
| `src/doctor/` | Setup diagnostics |
| `src/config/` | `config.toml` load/merge |
| `docs/SPEC.md` | Full product & engineering spec (Draft v0.1) |
| `docs/ROADMAP.md` | Version-scoped release plan |

## Commands (v0.1 target)

`summary`, `daily`, `monthly`, `models`, `whoami`, `doctor` — `npx bdusage` aliases `summary`.

Not in v0.1: `today --source logs`, Cost Explorer fallback, managed mode, prompt/response body display.

## Domain Rules (must preserve)

1. **actual vs estimate**: Do not sum CUR costs with log-based estimates in one row.
2. **CUR actual**: Use billing `cost` columns only; no custom per-token pricing for actual reports.
3. **IAM principal**: Filter via `line_item_iam_principal` (CUR 2.0 with `INCLUDE_IAM_PRINCIPAL_DATA`).
4. **Security**: Never fetch or display invocation log bodies (`inputBody`, `outputBody`, etc.).
5. **`--principal self`**: UX filter in direct mode, not a security boundary (managed mode in v0.4).
6. **`--all`**: Document as admin-oriented in help; behavior depends on AWS permissions.

## Engineering Approach

### TDD Cycle

1. Red: write a failing test (Vitest)
2. Green: minimum implementation
3. Refactor: improve without behavior change

### Tidy First

Separate structural cleanup from behavioral changes where practical.

### Iteration Size

Split work into the smallest meaningful increment; align with [docs/ROADMAP.md](./docs/ROADMAP.md) version scope (do not implement v0.2+ features in v0.1 tasks unless explicitly requested).

## Documentation

| Document | Language | Purpose |
|----------|----------|---------|
| `README.md` | Japanese (user-facing) | Quick start, commands, examples |
| `docs/SPEC.md` | Japanese | Authoritative spec |
| `docs/ROADMAP.md` | Japanese | Release phases and acceptance criteria |

When changing CLI surface or data-source behavior, update SPEC/ROADMAP/README together.

## Cursor Skills

Project skills for Cursor live under `.cursor/skills/`. Codex-compatible copies: `.agents/skills/` (same content).

| Skill | Use when |
|-------|----------|
| `update-docs` | Sync README / SPEC / ROADMAP with `src/` |
| `update-design` | Review spec quality before large features |
| `update-plan` | Validate implementation plans against SPEC & ROADMAP |
| `grill-me` | Stress-test a design via Q&A; record ADR under `docs/adr/` |
