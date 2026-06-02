# bdusage

Amazon Bedrock の使用量と利用料金をターミナルから確認する CLI。体験は [`ccusage`](https://ccusage.com/guide/) に近く、AWS の課金データ（実請求）と監視データ（概算）を分けて表示します。

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-v0.3.1-green)

> **注意**: IAM principal 単位の正確な実コストには **CUR 2.0** が必要です。読み取りは **DuckDB direct Parquet**（推奨、`cur.duckdb.files`）または **Athena**（`cur.athena`）を選べます。CUR 未設定時は `--source ce` または `--source auto`（cur → ce フォールバック）で Cost Explorer の actual-lite を利用できます。

## 概要

`bdusage` は次のような課題を CLI で解決します。

- 今月・昨日いくら使ったか（自分の IAM principal 単位）
- どのモデル・トークン種別（input / output / prompt cache）がコストを押し上げているか
- 請求反映前の「今日」を概算で見たい（`bdusage today --source logs`）
- 管理者が全 principal のランキングを見る（`--all`、v0.1 から help に明記）

**最重要方針**: 実請求（actual）と概算（estimate）を混ぜません。出力には常に `source:` を表示し、CUR actual では `engine:`（DuckDB / Athena）も表示します。

## クイックスタート

```bash
# サマリー（今月・昨日・上位モデルなど）
npx bdusage

# 日次レポート（デフォルト用途）
npx bdusage daily

# 月次・モデル別
npx bdusage monthly
npx bdusage models

# 認証情報とレポート対象 principal の確認
npx bdusage whoami

# CUR / Athena / 権限の診断
npx bdusage doctor

# 今日の概算（CloudWatch Logs + Price List API）
npx bdusage today --source logs
```

## コマンド一覧

| コマンド | 説明 | v0.1 |
|----------|------|------|
| `bdusage` / `summary` | 今月合計・昨日・上位モデル等 | ✅ |
| `daily` | 日次の利用料金 | ✅ |
| `monthly` | 月次の利用料金 | ✅ |
| `models` | モデル別の使用量・コスト | ✅ |
| `whoami` | 現在の AWS 認証と principal 解決結果 | ✅ |
| `doctor` | 設定・権限・CUR（DuckDB / Athena）・CE・Logs の診断 | ✅ |
| `users --all` | principal / tag 別ランキング（管理者向け） | 計画 |
| `cache` | prompt cache read/write の内訳 | 計画 |
| `today --source logs` | 今日の概算（CloudWatch Logs） | ✅ |

## グローバルオプション

```bash
--profile <name>              # AWS API 用プロファイル
--region <region>             # AWS API 実行リージョン
--source <cur|ce|logs|metrics|auto>   # データソース（デフォルト: auto → cur 優先）
--cur-engine <auto|duckdb|athena>    # CUR backend（デフォルト: auto → DuckDB → Athena）
--principal self              # 自分の caller identity のみ（デフォルト）
--principal <arn>             # 指定 IAM principal ARN
--principal-role <role-arn>   # assumed role を role 単位で集計
--principal-tag <key=value>   # cost allocation tag で絞り込み（--source ce）
--principal-from-profile <p>  # 別 profile の GetCallerIdentity を対象 principal に
--all                         # 全 principal（管理者向け・権限に依存）
--since <date|duration>       # 例: 7d, 2026-05-01
--until <date>
--group <date|model|principal|usage-type|operation|account|region>
--json | --csv | --table      # 出力形式（デフォルト: table）
--currency USD                # 初期版は USD のみ
--config <path>               # 設定ファイル（デフォルト: ~/.config/bdusage/config.toml）
```

### 使用例

```bash
# 直近 7 日の日次（自分のみ）
npx bdusage daily --since 7d --principal self

# Billing 読み取り profile と Bedrock 実行 profile を分離
npx bdusage daily \
  --profile billing-readonly \
  --principal-from-profile alice-bedrock

# assumed role セッションを role 単位でまとめる
npx bdusage daily --principal-role arn:aws:iam::123456789012:role/BedrockDeveloper

# JSON 出力（自動化向け）
npx bdusage daily --since 30d --json

# CUR 未設定時: Cost Explorer + cost allocation tag
npx bdusage daily --source ce --principal-tag user=alice --all

# 今日の概算（estimate。本文はクエリに含めない）
npx bdusage today --source logs --principal self

# 管理者: 全 principal（help に記載のとおり権限が必要）
npx bdusage users --all --since 30d
```

## データソース

| source | 表示 | 用途 |
|--------|------|------|
| `cur` | actual | IAM principal 別の正確な実コスト（CUR 2.0。DuckDB または Athena） |
| `ce` | actual-lite | CUR 未設定時の fallback（Cost Explorer API） |
| `logs` | estimate | 今日の速報（`today` コマンド） |
| `metrics` | estimate/volume | モデル別全体傾向（principal 別不可） |

金額系レポートのデフォルト優先順位: **cur → ce → 失敗時は `doctor` を案内**。

## 前提条件

### CUR（`--source cur` / `--source auto` の第一選択）

IAM principal 単位の実コストには **CUR 2.0** が必要です。

1. AWS Data Exports / CUR 2.0 を有効化（`INCLUDE_IAM_PRINCIPAL_DATA=true` 推奨）
2. **DuckDB（推奨）**: CUR Parquet の S3 パスを指定するか、**Athena**: Glue/Athena テーブルを設定
3. `~/.config/bdusage/config.toml` に backend を設定

```toml
[aws]
profile = "default"
region = "ap-northeast-1"

[cur]
engine = "auto"

[cur.duckdb]
files = "s3://my-cur-bucket/export/**/*.parquet"
s3_region = "ap-northeast-1"

[cur.athena]
database = "cur"
table = "cost_and_usage_report"
workgroup = "primary"
output_location = "s3://my-athena-query-results/bdusage/"

[logs]
log_group = "/aws/bedrock/modelinvocations"
```

旧 `[athena]` セクションも互換読み込みされます。レポートには `source: CUR 2.0 actual` と `engine: DuckDB direct Parquet`（または Athena）が表示されます。

### CloudWatch Logs（`today --source logs`）

1. Bedrock コンソールで Model invocation logging を CloudWatch Logs に有効化
2. `config.toml` の `[logs].log_group` にロググループ名を設定
3. `logs:StartQuery` / `logs:GetQueryResults` 権限を付与

診断:

```bash
npx bdusage doctor
```

権限の詳細は [docs/SPEC.md](./docs/SPEC.md) §15 を参照してください。

## セキュリティ上の注意

- `--principal self` は **UX 上のフィルタ** であり、CLI 単体ではセキュリティ境界ではありません。一般ユーザーに自分の分だけを厳密に見せるには v0.4 の **managed mode** を利用してください。
- プロンプト / レスポンス本文は **取得・表示しません**（Invocation Logging に本文が含まれ得るため）。
- `--all` は管理者向けです。一般ユーザーが指定しても、付与された AWS 権限の範囲で読める場合があります。

## 出力例

### summary

```text
bdusage v0.3.1
source: CUR 2.0 actual
engine: DuckDB direct Parquet
profile: default
principal: arn:aws:sts::123456789012:assumed-role/BedrockDeveloper/alice@example.com
period: 2026-06-01..2026-06-02
billing data: partial, latest line item 2026-06-01 23:00 UTC

This month: $12.43
Yesterday:   $3.91
Top model:   Claude Sonnet
Top driver:  output tokens
```

### daily

```text
Date         Cost      Input     Output    Cache Read  Cache Write  Top Model
2026-05-27   $0.18     42.1k     5.8k      81.0k       3.2k         Claude Sonnet
...
Total        $1.72     361.2k    49.5k     812.0k      24.1k
```

### today（estimate）

```text
bdusage v0.3.0
source: CloudWatch Logs estimate
profile: default
principal: arn:aws:sts::123456789012:assumed-role/BedrockDeveloper/alice@example.com
period: 2026-06-02
estimated cost, not billing data

Requests:      42
Input tokens:  120.5k
Output tokens: 18.2k
Latency:       p50 890 ms, p95 2100 ms
Estimated cost: ~$4.12
Top model:     Claude 3.5 Sonnet
```

## 開発

[Bun](https://bun.sh/) を使用します（`review-codecommit` と同様の CI 構成）。

```bash
bun install
bun run ci          # lint, format, typecheck, dead-code, audit, test, build
bun run test
bun run build
```

### Cursor / エージェント

| パス | 内容 |
|------|------|
| [AGENTS.md](./AGENTS.md) | エージェント共通のプロジェクト概要・CI・ドメインルール |
| `.cursor/rules/` | Cursor プロジェクトルール（常時 / TypeScript / ドキュメント） |
| `.cursor/skills/` | スキル（`update-docs`, `update-design`, `update-plan`, `grill-me`） |

リポジトリルートの `Skills` は `.cursor/skills` へのシンボリックリンクです（[zghalint](https://github.com/watany-dev/zghalint) と同様の構成）。

## ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [docs/ROADMAP.md](./docs/ROADMAP.md) | バージョン別ロードマップ |
| [docs/SPEC.md](./docs/SPEC.md) | 開発者向け仕様書（Draft v0.1） |

## ロードマップ（要約）

| バージョン | 内容 |
|------------|------|
| **v0.1** | CUR actual MVP — summary / daily / monthly / models / whoami / doctor |
| **v0.2** | Cost Explorer fallback、`--source ce`、`--principal-tag` |
| **v0.3** | CloudWatch Logs estimate、`today --source logs` |
| v0.4 | Managed mode（サーバー側 principal スコープ） |
| v0.5+ | anomaly, budget, CI/Slack 連携 |

詳細は [docs/ROADMAP.md](./docs/ROADMAP.md) を参照してください。

## Release Process

`review-codecommit` と同様、GitHub Actions + npm Trusted Publishing（OIDC）で公開します。

1. `package.json` の `version` を更新
2. `bun install` で lockfile を更新
3. `bun run ci` をローカルで成功させる
4. `git tag vX.Y.Z` を push

## License

[MIT](LICENSE)
