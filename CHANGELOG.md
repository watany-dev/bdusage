# Changelog

All notable changes to this project will be documented in this file.

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

- CloudWatch Logs estimate (`today --source logs`)

## [0.2.0]

- Cost Explorer fallback (`--source ce`, `--principal-tag`)

## [0.1.0]

- CUR actual MVP via Athena
