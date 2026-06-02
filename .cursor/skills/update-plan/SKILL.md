---
description: Validate and improve an implementation plan by cross-checking docs/SPEC.md, docs/ROADMAP.md, and src/. Superset of update-design. Use in plan mode when planning bdusage features — run before finalizing the plan, and again before exit if the plan changed materially. Trigger examples — "プランを作成", "実装計画", "plan this feature", "validate the plan", "整合性チェック".
---

# update-plan

実装計画を完成させる直前に、SPEC・ROADMAP・ソースとの横断検証とプラン改善を行う統合スキル。update-design の評価観点を内包する。

## 発動タイミング

**プランが完成したと判断した直後、ユーザー提示または plan 確定の直前**に実行する。

1. ユーザーが実装タスクを依頼する
2. エージェントが調査・計画を作成する
3. プラン完成時点で **本スキルを発動**
4. 検証結果に基づきプランを改善する
5. 改善済みプランで確定する

## Phase 1: コンテキスト収集

1. プランファイル（または計画ドラフト）から対象機能・バージョン（v0.1 等）を特定する
2. `docs/SPEC.md` の関連セクションを読む
3. `docs/ROADMAP.md` の該当 Phase を読む
4. 変更対象の `src/` モジュールを読む

## Phase 2: 設計書品質評価（update-design 互換）

プランが触れる領域について、次のカテゴリで評価する:

1. ドメインモデル（actual / estimate、principal）
2. AWS 連携設計（CUR、Athena、権限）
3. CLI / UX 設計（コマンド、出力、help）
4. セキュリティ（本文非取得、principal スコープ）
5. バージョン分割（v0.1 逸脱の有無）

**合格ライン: 各カテゴリ 90 点以上**（update-design と同じ採点表を用いる）

## Phase 3: 整合性チェック

### 3-1. SPEC ↔ ソースコード

- プランの API / コマンド / 型が SPEC と一致しているか
- 未実装の依存（Athena クライアント等）がプランに含まれているか

### 3-2. ROADMAP ↔ SPEC ↔ プラン

- プランのスコープが ROADMAP の Phase と一致しているか（例: v0.1 タスクに logs estimate を含めない）
- 受け入れ条件（SPEC §25）を満たすテスト・検証がプランに含まれているか

## Phase 4: プラン改善と出力

### 4-1. プランの検証

1. **Tidy First?** — 構造変更と機能変更が分離されているか
2. **イテレーション単位** — 各ステップが最小単位か
3. **影響範囲** — CLI、設定、Athena クエリ、テストの波及が記載されているか
4. **CI** — 各イテレーション末に `bun run ci` が通るか

### 4-2. 優先度付きフィードバック

- **P0（必須）**: v0.1 スコープ逸脱、actual/estimate 混在設計、本文取得、スコア 50 未満のカテゴリ
- **P1（推奨）**: テスト戦略不足、doctor 案内漏れ、スコア 50-69
- **P2（情報）**: ドキュメント追従、将来 Phase へのメモ、スコア 70-89

### 4-3. 検証サマリ（プラン末尾に追記）

```markdown
## update-plan 検証結果

### 設計品質評価
| カテゴリ | スコア |
|---------|--------|
| ドメインモデル | XX/100 |
| AWS 連携 | XX/100 |
| CLI / UX | XX/100 |
| セキュリティ | XX/100 |
| バージョン分割 | XX/100 |

**総合判定**: 🟢/🟡/🟠/🔴

### 整合性チェック
| チェック項目 | スコア | 詳細 |
|-------------|--------|------|
| SPEC ↔ ソース | XX/100 | |
| ROADMAP ↔ プラン | XX/100 | |

### 修正事項
- **P0**: ...
- **P1**: ...
- **P2**: ...
```

### 4-4. 完了アクション

1. P0・P1 をプランに反映する
2. 検証サマリ付きでプランを確定する

## 記述ルール

- コード例は TypeScript
- レポート・プラン追記は日本語
- ROADMAP の完了状態は実装実態にのみ基づいて更新する
- プラン修正には根拠（SPEC / ROADMAP / AGENTS.md の該当箇所）を明示する
