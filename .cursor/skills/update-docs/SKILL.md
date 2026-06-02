---
description: Update bdusage documentation (README.md, docs/SPEC.md, docs/ROADMAP.md, CHANGELOG.md) to match current source. Use when the user asks to update docs, refresh README, sync spec with implementation, or check doc/code consistency. Trigger examples — "ドキュメントを最新化して", "設計書を更新", "update docs", "README を直して", "docs と src の乖離を確認", "sync documentation".
---

# update-docs

ソースコードの現状に基づき、すべてのドキュメントを一括で最新化するスキル。

## Phase 1: ソースコードの現状把握

1. `src/` 配下の TypeScript を読み込む
   - `src/cli.ts` — CLI エントリ
   - `src/cli/run.ts` — 引数パース、help、コマンドディスパッチ
   - `src/commands.ts` — コマンド名レジストリ
   - `src/version.ts` — ツール名・バージョン
   - `src/index.ts` — ライブラリ公開 API
2. `package.json` の `scripts` / `version` / `bin` を確認する
3. `build.ts` のビルド成果物（`dist/cli.mjs` 等）を確認する
4. 公開 export・CLI オプション（実装済み分）の一覧を把握する

## Phase 2: 各ドキュメントの更新

### 2-1. 仕様書 (`docs/SPEC.md`)

1. SPEC の内容をソースと照合する
2. 以下を更新する:
   - コマンド体系（§9）と `COMMAND_NAMES` の一致
   - 実装済み / 未実装の区別（v0.1 スコープ）
   - モジュール構成・データフロー（実装が進んだ場合）
3. 仕様にない実装や、実装のない仕様記述を洗い出す

### 2-2. ロードマップ (`docs/ROADMAP.md`)

1. v0.1 受け入れ条件と実装状況を照合する
2. 完了した項目のみ ✅ に更新する（推測で完了にしない）

### 2-3. README.md

1. クイックスタート・コマンド表が最新か確認する
2. `bun run ci` 等の開発手順が `package.json` と一致しているか
3. データソース表（actual / estimate）が SPEC と一致しているか
4. セキュリティ注意（本文非取得、`--principal self`）が SPEC と一致しているか

### 2-4. CHANGELOG.md（リリース作業時）

バージョン bump 時のみ、ユーザー向け変更を追記する。

## Phase 3: 一貫性チェック

1. **コマンド名の統一** — README、SPEC、help テキスト、`COMMAND_NAMES`
2. **バージョン表記** — `package.json`, `src/version.ts`, README バッジ
3. **コマンド例** — `npx bdusage` / `bunx` の表記統一
4. **用語** — actual / estimate / principal / source の定義が SPEC と README で一致
5. **存在しないパス** — 未作成モジュールへの参照がないか

## Phase 4: 更新レポートの出力

```markdown
## ドキュメント更新レポート

### 更新したドキュメント
| ファイル | 更新内容 |
|---------|---------|
| docs/SPEC.md | [変更概要] |
| README.md | [変更概要] |
| ... | ... |

### 新規作成を提案するドキュメント
- [ファイル名]: [理由]

### 検出した不整合
- [不整合の詳細]
```

## 記述ルール

- コード例は TypeScript / bash で記述すること
- README・SPEC・ROADMAP は日本語で記述すること
- AGENTS.md は英語のまま維持すること
- CLI フラグ名は SPEC の表記に合わせること
