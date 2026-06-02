---
description: Evaluate and improve bdusage design documents (docs/SPEC.md, docs/ROADMAP.md, docs/adr/*.md) for clarity and implementability. Use when reviewing spec quality, preparing a large feature, or before v0.x milestone work. Trigger examples — "仕様をレビュー", "設計書を評価", "SPEC の品質チェック", "update design".
---

# update-design

仕様・ロードマップの品質を評価し、改善提案を行うスキル。

## Phase 1: ドキュメントの収集

1. `docs/SPEC.md` を読み込む（主設計書）
2. `docs/ROADMAP.md` を読み込む
3. `docs/adr/*.md` があれば一覧し、関連 ADR を読む
4. 対象機能に限定する場合は、SPEC の該当セクションのみ深掘りする

## Phase 2: 設計書の評価

### 評価カテゴリ

1. **ドメインモデル**
   - actual / estimate の分離原則が明確か
   - principal 解決（self / arn / role / all）が一貫しているか
   - データソース（cur / ce / logs / metrics / auto）の優先順位が明記されているか

2. **AWS 連携設計**
   - CUR 2.0 + Athena の前提（`INCLUDE_IAM_PRINCIPAL_DATA` 等）が記載されているか
   - クエリ境界（Bedrock フィルタ、本文非取得）が明確か
   - 権限・設定ファイル・`doctor` の診断範囲が定義されているか

3. **CLI / UX 設計**
   - コマンド・グローバルオプションが ccusage 風 UX と矛盾しないか
   - 出力形式（table / json / csv）とヘッダ（`source:` 行）が定義されているか
   - エラー時のユーザー向けメッセージ方針があるか

4. **セキュリティ・コンプライアンス**
   - 本文非取得が要件として明記されているか
   - `--principal self` と managed mode（v0.4）の境界が誤解されないか
   - `--all` の管理者向け注記が help / SPEC で揃っているか

5. **バージョン分割**
   - v0.1 スコープ外の機能が v0.1 セクションに紛れ込んでいないか
   - ROADMAP の Phase と SPEC の章が対応しているか

### 評価基準

各カテゴリを 100 点満点で評価する。**合格ライン: 90 点以上**

| スコア | レベル | 意味 |
|--------|--------|------|
| 90-100 | 優秀 | 実装に即移れる |
| 70-89 | 良好 | 軽微な補足で十分 |
| 50-69 | 改善推奨 | 曖昧さの解消が必要 |
| 30-49 | 要改善 | 実装前に修正必須 |
| 1-29 | 重大不備 | 欠落または矛盾 |

## Phase 3: ソースコードとの整合性チェック

1. `src/` の実装範囲を確認する
2. SPEC に記載されているが未実装の機能を列挙する
3. 実装されているが SPEC に未記載の挙動を列挙する
4. `src/commands.ts` と SPEC §9 のコマンド一覧を突合する

## Phase 4: 改善提案の出力

```markdown
## 設計書評価レポート

### 対象: docs/SPEC.md（および関連ドキュメント）

#### 評価サマリ
| カテゴリ | スコア |
|---------|--------|
| ドメインモデル | XX/100 |
| AWS 連携設計 | XX/100 |
| CLI / UX 設計 | XX/100 |
| セキュリティ・コンプライアンス | XX/100 |
| バージョン分割 | XX/100 |

**平均スコア**: XX.X / 100 — 🟢/🟡/🟠/🔴 [判定]

#### 改善提案
1. [具体的な改善内容]

#### ソースコードとの差分
- [差分の詳細]
```

## 記述ルール

- 改善提案のコード例は TypeScript で記述すること
- レポート本文は日本語で記述すること
- バージョンや完了状態は推測で書き換えないこと
