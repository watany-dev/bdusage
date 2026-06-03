# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.0-beta.0] - 2026-06-03

初回 beta リリース。開発 Step 1–5 の機能を v0.1 としてまとめる。

### Added

- **CUR actual**: `summary`, `daily`, `monthly`, `models`, `whoami`, `doctor`（Athena backend）
- **Cost Explorer fallback**: `--source ce`, `--source auto`, `--principal-tag`
- **Logs estimate**: `today --source logs`, CloudWatch Logs + Price List API
- **CUR DuckDB engine**: `--cur-engine duckdb|athena|auto`, `[cur.duckdb]` / `[cur.athena]` 設定
- **weekly / users**: 週次レポート、`users --all`（CUR principal ランキング）
- Report headers: `source:` + CUR 時 `engine:`、`--json` / `--csv` 出力

### Fixed

- CLI async コマンドが `process.exit` 前に終了し出力されない問題（`parseAsync` + `process.exitCode`）

### Changed

- npm バージョンを v0.1 系に整理（旧内部ラベル v0.2–v0.3.2 は ROADMAP の実装ステップへ移行）
- beta 公開: `git tag v0.1.0-beta.0` → npm dist-tag `beta`

## [0.1.0] — 未リリース（scaffold のみ）

- Project scaffold: README, docs/SPEC.md, docs/ROADMAP.md
- CI/CD（actionlint, zizmor, lint, typecheck, security, test, build, npm publish workflow）
- Minimal CLI stub（`--version`, `--help`）
