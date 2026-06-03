# bdusage ロードマップ

仕様の全文は [SPEC.md](./SPEC.md) を参照してください。Source / engine 分離と DuckDB direct mode の設計は [DESIGN.md](./DESIGN.md) を正とします。

## プロダクト方針（要約）

- **actual**: AWS Billing / CUR 2.0 / Cost Explorer — 実請求ベース
- **estimate**: CloudWatch Logs / Metrics / Price List API — 概算（表示で必ず区別）
- 実請求と概算を混ぜない
- プロンプト / レスポンス本文は取得・表示しない
- `source` はデータの意味、`engine` は実行基盤として分離する
- CUR actual は DuckDB / Athena を別 backend として実装する

## バージョンと実装ステップの関係

**npm バージョン**（`v0.1`, `v0.2` …）はユーザー向けリリース単位。**実装ステップ**（Step 1–5）は開発マイルストーンであり、バージョン番号とは 1:1 ではない。

| npm バージョン | 内容 | 状態 |
|---------------|------|------|
| **v0.1** | Step 1–5 の機能を含む初回 beta | beta 公開予定 |
| v0.2 | Managed mode | 未着手 |
| v0.3+ | FinOps 拡張（anomaly, budget, CI/Slack 等） | 未着手 |

---

## リリース計画

### v0.1 — 初回 beta（Step 1–5 完了分）

**目的**: Bedrock の actual / estimate を CLI 一発で確認できる初回リリース。

| カテゴリ | 内容 |
|---------|------|
| コマンド | `summary`, `daily`, `weekly`, `monthly`, `models`, `users --all`, `whoami`, `doctor`, `today --source logs`（`npx bdusage` は `summary` と同義） |
| actual | CUR 2.0（DuckDB / Athena）、Cost Explorer fallback（`--source ce`） |
| estimate | CloudWatch Logs（`today --source logs`） |
| principal | `self`, `<arn>`, `--principal-role`, `--principal-tag`, `--all` |
| 出力 | table（デフォルト）, `--json`, `--csv` |
| 設定 | `~/.config/bdusage/config.toml` |

**v0.1 に含めない**: managed mode、本文表示、`bdusage init`、`doctor --fix`、`cache` コマンド

**受け入れ条件**（[SPEC.md §25](./SPEC.md#25-受け入れ条件)）:

1. CUR 2.0 設定済み環境で `npx bdusage daily --principal self` が成功する
2. `line_item_iam_principal` 欠如時、`doctor` が明確な修正案を出す
3. `--principal-role` で assumed role session をまとめられる
4. actual cost は CUR / CE の cost 列のみ（独自単価計算なし）
5. `--json` が機械処理可能
6. CloudWatch Logs 本文は取得・表示しない
7. `--all` は help に管理者向けと明記
8. actual / estimate をレポートヘッダで明確に区別

**beta 公開手順**:

1. npm Trusted Publishing（OIDC）を GitHub リポジトリに紐付け
2. `bun run ci` が通ることを確認
3. `git tag v0.1.0-beta.0` を push → publish workflow が `--tag beta` で公開

---

### v0.2 — Managed mode

| 機能 | 内容 |
|------|------|
| `--managed <url>` | API Gateway / Lambda 経由クエリ |
| 認証 | SigV4 / IAM Identity Center |
| サーバー | caller 検証、SQL WHERE のサーバー側生成、principal map（DynamoDB） |
| スコープ | `self` / `team` / `admin` |

CLI direct mode の `--principal self` は UX フィルタのみ。厳密なマルチテナント分離は managed mode で実現。

---

### v0.3 以降

- application inference profiles / projects / workspaces の tag 対応
- anomaly summary
- budget threshold warning
- GitHub Actions / CI usage report
- Slack / Datadog export
- local cache / Redshift / managed backend などの追加 engine
- `bdusage init`（CUR export / S3 prefix / backend 検出）

---

## 実装ステップ（開発マイルストーン）

開発順序の記録。npm バージョンとは独立。

### Step 1 — CUR actual MVP ✅

**目的**: IAM principal 単位の Bedrock 実コストを CUR 2.0 + Athena で CLI から確認する。

| 機能 | 内容 |
|------|------|
| コマンド | `summary`, `daily`, `monthly`, `models`, `whoami`, `doctor` |
| データソース | `cur`（CUR 2.0 + Athena）。`--source auto` は cur → 失敗時 doctor 案内 |
| principal | `self`, `<arn>`, `--principal-role`, `--all` |
| 出力 | table, `--json`, `--csv` |

---

### Step 2 — Cost Explorer fallback ✅

**目的**: CUR 未設定環境でも Bedrock 実コスト（actual-lite）を Cost Explorer から確認する。

| 機能 | 内容 |
|------|------|
| `--source ce` | Cost Explorer actual-lite |
| `--source auto` | cur 試行 → 失敗時 ce → 両方失敗時 doctor 案内 |
| principal tag | `--principal-tag <key=value>` フィルタ |
| doctor | Cost Explorer アクセス・tag 利用の診断 |

表示例: `source: Cost Explorer actual-lite`

---

### Step 3 — Logs estimate ✅

**目的**: 請求反映前の Bedrock 利用を CloudWatch Logs から速報（estimate）する。

| 機能 | 内容 |
|------|------|
| `--source logs` | CloudWatch Logs から速報 |
| `today` | 今日の概算レポート |
| 概算コスト | Price List API（`~$` 表記、`estimated cost, not billing data`） |
| セキュリティ | 本文フィールドを query で返さない |

---

### Step 4 — CUR DuckDB engine ✅（一部未実装あり）

**目的**: Athena query cost を避け、CUR 2.0 Parquet を DuckDB で直接読む。

| 機能 | 内容 | 状態 |
|------|------|------|
| `--cur-engine duckdb` | CUR Parquet を DuckDB で直接読む | ✅ |
| `--cur-engine athena` | 既存 Athena backend を明示使用 | ✅ |
| `--cur-engine auto` | DuckDB → Athena の順に probe | ✅ |
| `doctor` | DuckDB / Athena 各チェック | ✅ |
| config migration | 旧 `[athena]` を `[cur.athena]` へ互換読み込み | ✅ |
| `bdusage init` | CUR export / S3 prefix / backend を検出して config 作成 | 未実装 |
| `doctor --fix` | 安全な config 補完のみ | 未実装 |

---

### Step 5 — weekly / users ✅

**目的**: 週次レポートと管理者向け IAM principal ランキングを追加する。

| 機能 | 内容 |
|------|------|
| `weekly` | 週次コスト・トークン（ISO 週・月曜始まり UTC） |
| `users --all` | CUR の `line_item_iam_principal` 別ランキング（`--source cur` 必須） |

---

## 実装構成

```
bdusage/
  src/
    cli.ts
    commands/       # summary, daily, monthly, models, users, cache, today, whoami, doctor, init
    aws/            # credentials, sts, athena, cost-explorer, cloudwatch-*, pricing
    sources/
      billing-source.ts
      resolve.ts
      cur-athena/   # Athena backend
      cur-duckdb/   # DuckDB direct Parquet backend
      ce/
      logs/
      metrics/
    bedrock/        # usage-type-parser, model-normalizer, token-types
    output/         # table, json, csv
    config/
    security/       # redaction, principal-scope
    managed/
    doctor/
  tests/
    unit/
    integration/
    fixtures/cur/
```

## 優先順位

```
Step 1 CUR actual MVP          ✅
    ↓
Step 2 Cost Explorer           ✅
    ↓
Step 3 Logs estimate           ✅
    ↓
Step 4 CUR DuckDB engine       ✅（init / doctor --fix は未実装）
    ↓
Step 5 weekly / users          ✅
    ↓
v0.1 beta 公開                 ← 現在
    ↓
v0.2 Managed mode
    ↓
v0.3+ FinOps 拡張
```

## 未決定事項

[SPEC.md §26](./SPEC.md#26-未決定事項) を参照。Source / engine 分離の判断は [DESIGN.md](./DESIGN.md) を正とする。

- package 名（`bdusage` vs scope 付き）
- Node.js のみ vs Bun 正式対応
- デフォルト cost metric（`net_unblended` vs `unblended`）
- `bedrock-runtime` / `bedrock-mantle` の区別範囲
- Organizations 複数 account の表示粒度
- `bdusage init` で Data Exports API まで見るか、初期版は S3 prefix 入力に留めるか
- DuckDB を通常 dependency にするか optional dependency にするか

## 参考

- [ccusage](https://ccusage.com/guide/)
- [Amazon Bedrock: Managing costs](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-management.html)
- [IAM principal attribution](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-mgmt-iam-principal-tracking.html)
- [CUR 2.0 table dictionary](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)
- [DESIGN.md](./DESIGN.md)
