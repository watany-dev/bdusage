# bdusage ロードマップ

仕様の全文は [SPEC.md](./SPEC.md) を参照してください。Source / engine 分離と DuckDB direct mode の設計は [DESIGN.md](./DESIGN.md) を正とします。

## プロダクト方針（要約）

- **actual**: AWS Billing / CUR 2.0 / Cost Explorer — 実請求ベース
- **estimate**: CloudWatch Logs / Metrics / Price List API — 概算（表示で必ず区別）
- 実請求と概算を混ぜない
- プロンプト / レスポンス本文は取得・表示しない
- `source` はデータの意味、`engine` は実行基盤として分離する
- CUR actual は DuckDB / Athena を別 backend として実装する

## リリース計画

### v0.1 — CUR actual MVP（リリース済み）

**目的**: IAM principal 単位の Bedrock 実コストを CUR 2.0 + Athena で CLI から確認する。

| 機能 | 内容 |
|------|------|
| コマンド | `summary`, `daily`, `monthly`, `models`, `whoami`, `doctor`（`npx bdusage` は `summary` と同義） |
| データソース | `cur`（CUR 2.0 + Athena）のみ。`--source auto` は cur → 失敗時 doctor 案内 |
| principal | `self`, `<arn>`, `--principal-role`, `--all` |
| 出力 | table（デフォルト）, `--json`, `--csv` |
| 設定 | `~/.config/bdusage/config.toml` |

**v0.1 で実装しない**: CloudWatch Logs estimate、Cost Explorer fallback、Metrics、managed mode、本文表示

**受け入れ条件**（[SPEC.md §25](./SPEC.md#25-受け入れ条件)）:

1. CUR 2.0 / Athena 設定済み環境で `npx bdusage daily --principal self` が成功する
2. `line_item_iam_principal` 欠如時、`doctor` が明確な修正案を出す
3. `--principal-role` で assumed role session をまとめられる
4. actual cost は CUR の cost 列のみ（独自単価計算なし）
5. `--json` が機械処理可能
6. CloudWatch Logs 本文は取得・表示しない
7. `--all` は help に管理者向けと明記
8. `cur` と `logs` 出力で actual / estimate を明確に区別（logs は v0.3 以降）

---

### v0.2 — Cost Explorer fallback（リリース済み）

**目的**: CUR 未設定環境でも Bedrock 実コスト（actual-lite）を Cost Explorer から確認する。

| 機能 | 内容 |
|------|------|
| `--source ce` | Cost Explorer actual-lite |
| `--source auto` | cur 試行 → 失敗時 ce → 両方失敗時 doctor 案内 |
| principal tag | `--principal-tag <key=value>` フィルタ |
| 集計 | `USAGE_TYPE` グループ |
| doctor | Cost Explorer アクセス・tag 利用の診断 |

表示例: `source: Cost Explorer actual-lite`

**受け入れ条件**:

1. `--source ce --principal-tag user=alice --all` 相当で Bedrock コストが取得できる（要 AWS 環境）
2. `--source auto` で CUR 不可時に CE にフォールバックする
3. CE では IAM principal ARN フィルタを試みず、明示エラーで `--principal-tag` を案内
4. レポートヘッダに `source: Cost Explorer actual-lite` を表示（actual と estimate を混在しない）
5. `doctor` が Cost Explorer と tag フィルタの案内を出す

---

### v0.3 — Logs estimate（リリース済み）

**目的**: 請求反映前の Bedrock 利用を CloudWatch Logs から速報（estimate）する。

| 機能 | 内容 |
|------|------|
| `--source logs` | CloudWatch Logs から速報 |
| `today` | 今日の概算レポート |
| メトリクス | request 数、input/output tokens、latency p50/p95 |
| 概算コスト | Price List API（`~$` 表記、`estimated cost, not billing data`） |
| セキュリティ | 本文フィールドを query で返さない |

**受け入れ条件**:

1. `bdusage today --source logs` が CloudWatch Logs 設定済み環境で成功する（要 AWS 環境）
2. レポートヘッダに `source: CloudWatch Logs estimate` を表示（actual と混在しない）
3. 概算コストに `~$` と `estimated cost, not billing data` 注記
4. Logs Insights クエリに本文フィールドを含めない
5. `doctor` が log group / Insights の案内を出す

---

### v0.3.1 — CUR DuckDB engine

**目的**: Athena query cost を避け、CUR 2.0 Parquet を DuckDB で直接読む。ユーザー向けには `init` / `doctor` / `auto` で設定負荷を吸収し、内部実装は Athena と DuckDB を別 backend として分離する。

| 機能 | 内容 |
|------|------|
| `--cur-engine duckdb` | CUR Parquet を DuckDB で直接読む |
| `--cur-engine athena` | 既存 Athena backend を明示使用 |
| `--cur-engine auto` | DuckDB → Athena の順に probe |
| `bdusage init` | CUR export / S3 prefix / backend を検出して config 作成 |
| `doctor` | source / engine 別診断 |
| config migration | 旧 `[athena]` を `[cur.athena]` へ互換読み込み |

表示例:

```text
source: CUR 2.0 actual
engine: DuckDB direct Parquet
```

**受け入れ条件**:

1. `cur.duckdb.files` 指定だけで `summary`, `daily`, `monthly`, `models` が成功する
2. Athena 設定なしでも DuckDB backend が動作する
3. 旧 `[athena]` config は互換読み込みされる
4. レポートヘッダに `source: CUR 2.0 actual` と `engine: DuckDB direct Parquet` を表示する
5. `doctor` が DuckDB package, httpfs, S3 credentials, files glob, required columns, `line_item_iam_principal` を診断する
6. 同一 fixture Parquet に対して DuckDB と Athena query の集計結果が一致する
7. `--source cur --cur-engine duckdb` 失敗時に Athena / CE へ暗黙 fallback しない
8. `--source cur --cur-engine auto` は DuckDB → Athena のみを試し、CE には fallback しない

**非ゴール**:

- CUR 2.0 の全列を TypeScript schema として固定しない
- AWS 側の Data Export 作成を初期実装で自動化しない
- Athena と DuckDB の SQL を完全共通化しない
- `source=cur` 指定時に Cost Explorer へ暗黙 fallback しない

---

### v0.4 — Managed mode

| 機能 | 内容 |
|------|------|
| `--managed <url>` | API Gateway / Lambda 経由クエリ |
| 認証 | SigV4 / IAM Identity Center |
| サーバー | caller 検証、SQL WHERE のサーバー側生成、principal map（DynamoDB） |
| スコープ | `self` / `team` / `admin` |

CLI direct mode の `--principal self` は UX フィルタのみ。厳密なマルチテナント分離は managed mode で実現。

---

### v0.5 以降

- application inference profiles / projects / workspaces の tag 対応
- anomaly summary
- budget threshold warning
- GitHub Actions / CI usage report
- Slack / Datadog export
- local cache / Redshift / managed backend などの追加 engine

---

## 実装構成（予定）

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
v0.1 CUR actual MVP       ← リリース済み
    ↓
v0.2 Cost Explorer        ← リリース済み（CUR 未設定環境の fallback）
    ↓
v0.3 Logs estimate        ← リリース済み（today / 速報）
    ↓
v0.3.1 CUR DuckDB engine  ← Athena cost を避ける direct Parquet backend
    ↓
v0.4 Managed mode         ← 組織内の厳密な principal スコープ
    ↓
v0.5+ FinOps 拡張         ← anomaly, budget, CI/Slack 連携
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
