# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.3.2] - 2026-06-02

### Added

- `weekly` command: ISO week (Monday start, UTC) cost and token rollup (CUR Athena/DuckDB, CE)
- `users --all` command: IAM principal cost ranking from CUR (`--source cur` required)

### Fixed

- `COMMAND_NAMES` includes `weekly`; docs aligned with DuckDB merge from main
- CE weekly `top_model` via usage-type rollup; `users` rejects `--principal-from-profile`

## [0.3.1] - 2026-06-02

### Added

- CUR **DuckDB direct Parquet** backend (`--cur-engine duckdb|athena|auto`)
- Config sections `[cur]`, `[cur.duckdb]`, `[cur.athena]`; legacy `[athena]` migration on load
- Report headers: `engine: DuckDB direct Parquet` or `engine: Athena` for CUR actual reports
- JSON fields `engine` / `engine_label` when applicable
- `doctor` checks for DuckDB (files, httpfs, sample query, required columns, IAM principal)

### Changed

- CUR Athena implementation moved to `src/sources/cur-athena/`
- `@duckdb/node-api` added as runtime dependency (external in CLI bundle)

## [0.3.0]

### Added

- CloudWatch Logs estimate source and `today --source logs`
- Cost Explorer fallback (`--source ce`)

## [0.1.0] and earlier

### Added

- Project scaffold: README (user-facing CLI), docs/SPEC.md, docs/ROADMAP.md
- CI/CD aligned with watany-dev/review-codecommit (actionlint, zizmor, lint, typecheck, security, test, build, npm publish)
- Minimal CLI stub (`--version`, `--help`, unimplemented command message)
