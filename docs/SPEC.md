# bdusage 仕様書

作成日: 2026-06-02  
想定読者: 開発者、FinOps担当、AWS管理者  
ステータス: Draft v0.3

## 1. 概要

`bdusage` は、Amazon Bedrock の使用量と利用料金を CLI で確認するためのツールである。体験としては `npx ccusage` に近く、ユーザーが手元のターミナルから以下のように実行するだけで、自分に紐づく IAM principal の Bedrock 利用状況を確認できることを目指す。

```bash
npx bdusage
npx bdusage daily
npx bdusage monthly
npx bdusage models
npx bdusage today --source logs
npx bdusage doctor
```

`ccusage` はローカルの coding agent CLI 利用ログを読み、daily / weekly / monthly / session などのレポートを出す CLI である。一方で Bedrock の実コストは AWS Billing / Cost and Usage Report / Cost Explorer に存在する。そのため `bdusage` では、ローカルログ解析型ではなく、AWS 課金データと監視データを統合して読む設計にする。

## 2. 背景と解決する課題

Bedrock を利用する開発者・FinOps 担当者は、次のような問いに答えにくい。

| 課題 | 現状の問題 |
|------|-----------|
| 自分がいくら使ったか | Billing Console はアカウント全体。IAM principal 単位の内訳が見えない |
| どのモデルが高いか | Cost Explorer では Bedrock の粒度が粗い。トークン種別（input / output / cache）の把握が難しい |
| 今日の利用 | CUR は 24 時間程度の遅延がある。請求反映前の速報が欲しい |
| チーム内の利用状況 | assumed role session ごとに ARN が分かれ、role 単位の集計が手作業 |

`bdusage` はこれらを CLI 一発で解決する。データソースごとに **actual**（実請求）と **estimate**（概算）を明確に区別し、混在させない。

## 3. ゴールと非ゴール

### 3.1 ゴール

- IAM principal 単位で Bedrock の実コストを CUR 2.0 + Athena から取得する（v0.1）
- `ccusage` に近い UX（`npx bdusage daily` 等）を提供する
- 出力に常にデータソース種別（actual / estimate）を明示する
- `doctor` で CUR / Athena / 権限の設定問題を診断する
- `--json` / `--csv` で FinOps 自動化に対応する

### 3.2 非ゴール（v0.1）

- プロンプト / レスポンス本文の取得・表示
- ローカル coding agent ログの解析（ccusage の領域）
- 独自単価計算による actual cost の再計算
- 厳密なマルチテナント分離（v0.4 managed mode まで CLI direct mode では UX フィルタのみ）
- Organizations 横断の統合ダッシュボード

## 4. ccusage との比較

| 観点 | ccusage | bdusage |
|------|---------|---------|
| データ所在 | ローカルファイル（`~/.claude/` 等） | AWS（CUR, CE, CloudWatch） |
| コスト精度 | 推定（モデル単価 × トークン） | actual: CUR 実請求 / estimate: Price List 概算 |
| principal 単位 | ローカルユーザー（暗黙） | IAM principal ARN |
| 速報 | リアルタイム（ローカル） | logs source（v0.3、estimate） |
| 実行 | `npx ccusage daily` | `npx bdusage daily` |

`bdusage` は ccusage の「ターミナルから手軽にレポートを見る」体験を Bedrock / AWS 課金ドメインに移植する。

## 5. 用語定義

| 用語 | 定義 |
|------|------|
| actual | AWS 請求データに基づく実コスト。CUR 2.0 または Cost Explorer |
| actual-lite | Cost Explorer 経由の実コスト。principal 粒度が粗い場合あり |
| estimate | CloudWatch Logs / Metrics / Price List API による概算。請求確定前 |
| principal | Bedrock API を呼び出した IAM エンティティ（user / role / assumed-role session） |
| IAM principal ARN | CUR 2.0 の `line_item_iam_principal` 列に記録される ARN |
| usage type | Bedrock の課金単位（例: `USE1-Claude-3.5-Sonnet-Input-Tokens`） |
| token type | input / output / cache read / cache write 等のトークン種別 |

## 6. actual / estimate の設計原則

1. **混在禁止**: 同一レポート行に actual と estimate の金額を合算しない
2. **明示表示**: すべてのレポートヘッダに `source:` 行を出力する
   - `source: CUR 2.0 actual`
   - `source: Cost Explorer actual-lite`
   - `source: CloudWatch Logs estimate`
3. **概算のラベル**: estimate コストには `~$` プレフィックスと `estimated cost, not billing data` 注記
4. **優先順位**: 金額系レポートは `cur` → `ce` → 失敗時 `doctor` 案内
5. **本文非取得**: Invocation Logging に本文が含まれ得るため、logs source でも本文フィールドを query に含めない

## 7. データソース

| source | 種別 | データ取得元 | principal 粒度 | v0.1 |
|--------|------|-------------|---------------|------|
| `cur` | actual | CUR 2.0 + Athena | IAM principal ARN | ✅ |
| `ce` | actual-lite | Cost Explorer API | tag / account 依存 | ✅ |
| `logs` | estimate | CloudWatch Logs Insights | IAM principal（ログ設定依存） | ✅ |
| `metrics` | estimate/volume | CloudWatch Metrics | 不可（モデル別のみ） | 計画 |
| `auto` | — | cur を試行 → 失敗時 ce → 失敗時 doctor | — | ✅ |

### 7.1 CUR 2.0 前提

- AWS Data Exports で Standard data export（CUR 2.0）を有効化
- **Include caller identity (IAM principal) allocation data** を ON（`INCLUDE_IAM_PRINCIPAL_DATA=true`）
- Athena で CUR テーブルを作成・クエリ可能にする
- `line_item_product_code = 'AmazonBedrock'` でフィルタ

### 7.2 Cost Explorer（v0.2）

- CUR 未設定環境の fallback
- `Amazon Bedrock` サービスフィルタ
- `--principal-tag` による cost allocation tag フィルタ
- `USAGE_TYPE` グループ集計

### 7.3 CloudWatch Logs（v0.3）

- Bedrock Invocation Logging から request 数、トークン数、latency を取得
- Price List API で概算コストを算出
- 本文フィールド（`inputBody`, `outputBody` 等）は SELECT に含めない

## 8. バージョン別スコープ

| バージョン | スコープ |
|-----------|---------|
| **v0.1** | CUR actual MVP: summary, daily, monthly, models, whoami, doctor |
| v0.2 | Cost Explorer fallback, `--source ce`, `--principal-tag` |
| v0.3 | CloudWatch Logs estimate, `today`, `--source logs` |
| v0.4 | Managed mode（API Gateway / Lambda、サーバー側 principal スコープ） |
| v0.5+ | anomaly, budget, CI/Slack 連携, inference profiles tag 対応 |

v0.1 で実装しない: CloudWatch Logs estimate、Cost Explorer fallback、Metrics、managed mode、本文表示

## 9. コマンド体系

| コマンド | 説明 | v0.1 |
|----------|------|------|
| `bdusage` / `summary` | 今月合計・昨日・上位モデル等 | ✅ |
| `daily` | 日次の利用料金 | ✅ |
| `monthly` | 月次の利用料金 | ✅ |
| `models` | モデル別の使用量・コスト | ✅ |
| `whoami` | 現在の AWS 認証と principal 解決結果 | ✅ |
| `doctor` | 設定・権限・CUR・Athena の診断 | ✅ |
| `users --all` | principal / tag 別ランキング（管理者向け） | 計画 |
| `cache` | prompt cache read/write の内訳 | 計画 |
| `today --source logs` | 今日の概算（CloudWatch Logs） | ✅ |

`npx bdusage` は `summary` と同義。

## 10. グローバルオプション

```bash
--profile <name>              # AWS API 用プロファイル
--region <region>             # AWS API 実行リージョン
--source <cur|ce|logs|metrics|auto>   # データソース（デフォルト: auto）
--principal self              # 自分の caller identity のみ（デフォルト）
--principal <arn>             # 指定 IAM principal ARN
--principal-role <role-arn>   # assumed role を role 単位で集計
--principal-tag <key=value>   # principal tag で絞り込み（v0.2+）
--principal-from-profile <p>  # 別 profile の GetCallerIdentity を対象 principal に
--all                         # 全 principal（管理者向け・権限に依存）
--since <date|duration>       # 例: 7d, 2026-05-01
--until <date>
--group <date|model|principal|usage-type|operation|account|region>
--json | --csv | --table      # 出力形式（デフォルト: table）
--currency USD                # 初期版は USD のみ
--config <path>               # 設定ファイル（デフォルト: ~/.config/bdusage/config.toml）
--managed <url>               # managed mode API エンドポイント（v0.4）
```

### 10.1 principal 解決

| オプション | 動作 |
|-----------|------|
| `--principal self`（デフォルト） | `GetCallerIdentity` の ARN を WHERE 句に使用 |
| `--principal <arn>` | 指定 ARN でフィルタ |
| `--principal-role <role-arn>` | `line_item_iam_principal LIKE '<role-arn>/%'` で session を role 単位集計 |
| `--principal-from-profile <p>` | 別 profile で GetCallerIdentity し、その ARN をフィルタに使用 |
| `--all` | principal フィルタなし（管理者向け。help に明記） |

### 10.2 日付指定

- `--since 7d`: 本日から 7 日前まで
- `--since 2026-05-01`: 絶対日付
- `--until 2026-05-31`: 終了日（inclusive）
- デフォルト: summary は当月、daily は直近 30 日

## 11. summary コマンド

今月・昨日・上位モデル等のサマリーを表示する。

### 11.1 出力例

```text
bdusage v0.1.0
source: CUR 2.0 actual
profile: default
principal: arn:aws:sts::123456789012:assumed-role/BedrockDeveloper/alice@example.com
period: 2026-06-01..2026-06-02
billing data: partial, latest line item 2026-06-01 23:00 UTC

This month: $12.43
Yesterday:   $3.91
Top model:   Claude Sonnet
Top driver:  output tokens
```

### 11.2 集計内容

- 今月合計コスト（`line_item_unblended_cost` または設定 metric）
- 昨日合計コスト
- 上位モデル（コスト順）
- 上位ドライバー（usage type / token type 別）
- billing data の鮮度（最新 line item のタイムスタンプ）

## 12. daily コマンド

日次の利用料金を表形式で表示する。

### 12.1 出力例

```text
Date         Cost      Input     Output    Cache Read  Cache Write  Top Model
2026-05-27   $0.18     42.1k     5.8k      81.0k       3.2k         Claude Sonnet
2026-05-28   $0.22     51.3k     7.1k      92.4k       4.0k         Claude Sonnet
...
Total        $1.72     361.2k    49.5k     812.0k      24.1k
```

### 12.2 列定義

| 列 | ソース |
|----|--------|
| Date | `line_item_usage_start_date`（日付 trunc） |
| Cost | `SUM(line_item_unblended_cost)` |
| Input / Output / Cache Read / Cache Write | usage type パース結果のトークン数（CUR usage amount） |
| Top Model | 当該日の最大コストモデル |

## 13. monthly コマンド

月次の利用料金を表示する。`--group model` 等でグループ化可能。

### 13.1 デフォルト出力

月ごとの Cost, Input, Output, Cache Read, Cache Write, Top Model。

### 13.2 グループ化

```bash
npx bdusage monthly --since 2026-01-01 --group model
npx bdusage monthly --group principal --all
```

## 14. models コマンド

モデル別の使用量・コストを表示する。

### 14.1 集計軸

- モデル名（usage type / product から正規化）
- トークン種別別コスト
- リクエスト相当量（usage amount から推定）

### 14.2 モデル正規化

`bedrock/usage-type-parser` と `bedrock/model-normalizer` で CUR の usage type 文字列を表示用モデル名に変換する。例:

- `USE1-Claude-3.5-Sonnet-Input-Tokens` → `Claude 3.5 Sonnet` / input
- `USE1-Claude-3.5-Sonnet-Output-Tokens` → `Claude 3.5 Sonnet` / output

## 15. 権限と IAM

### 15.1 v0.1 必要権限（CUR + Athena）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "athena:StartQueryExecution",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "athena:StopQueryExecution",
        "athena:GetWorkGroup"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:GetDatabase",
        "glue:GetTable",
        "glue:GetPartitions"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-cur-bucket/*",
        "arn:aws:s3:::my-athena-query-results/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "sts:GetCallerIdentity",
      "Resource": "*"
    }
  ]
}
```

### 15.2 管理者向け（`--all`）

CUR テーブル全体を読める権限が必要。Billing 読み取り専用 profile の利用を推奨:

```bash
npx bdusage daily --profile billing-readonly --principal self
npx bdusage users --all --profile billing-readonly --since 30d
```

### 15.3 profile 分離

Bedrock 実行用 profile と Billing 読み取り用 profile を分離する場合:

```bash
npx bdusage daily \
  --profile billing-readonly \
  --principal-from-profile alice-bedrock
```

- `--profile`: Athena / S3 / Glue 等 API 実行に使用
- `--principal-from-profile`: GetCallerIdentity のみ別 profile で実行

## 16. whoami / doctor コマンド

### 16.1 whoami

現在の AWS 認証情報と principal 解決結果を表示する。

```text
bdusage whoami
profile: default
region: ap-northeast-1
account: 123456789012
caller arn: arn:aws:sts::123456789012:assumed-role/BedrockDeveloper/alice@example.com
resolved principal filter: arn:aws:sts::123456789012:assumed-role/BedrockDeveloper/alice@example.com
config: ~/.config/bdusage/config.toml
athena: cur.cost_and_usage_report (workgroup: primary)
```

### 16.2 doctor

設定・権限・CUR・Athena の診断を行う。

| チェック項目 | 内容 |
|-------------|------|
| AWS 認証 | profile / region / GetCallerIdentity |
| 設定ファイル | config.toml の存在と必須キー |
| Athena | workgroup, database, table の到達性 |
| CUR スキーマ | `line_item_iam_principal` 列の存在 |
| IAM principal データ | 直近データに principal が populated されているか |
| S3 | output_location への書き込み権限 |
| サンプルクエリ | Bedrock 行が 1 件以上返るか |

`line_item_iam_principal` 欠如時の修正案例:

```text
✗ line_item_iam_principal column not found or always NULL

Fix:
1. AWS Billing → Data Exports → your CUR 2.0 export
2. Enable "Include caller identity (IAM principal) allocation data"
3. Wait for new CUR files (data available from export change date)
4. Refresh Athena table schema if needed
```

## 17. 設定ファイル

デフォルトパス: `~/.config/bdusage/config.toml`

```toml
[aws]
profile = "default"
region = "ap-northeast-1"

[athena]
database = "cur"
table = "cost_and_usage_report"
workgroup = "primary"
output_location = "s3://my-athena-query-results/bdusage/"

[cost]
# デフォルト cost 列（未決定事項 §26 参照）
metric = "unblended"  # unblended | net_unblended

[output]
default_format = "table"
currency = "USD"
```

### 17.1 設定優先順位

1. CLI 引数
2. `--config` 指定ファイル
3. `~/.config/bdusage/config.toml`
4. 環境変数（`BDUSAGE_PROFILE`, `BDUSAGE_REGION` 等）
5. デフォルト値

## 18. CUR / Athena クエリ設計

### 18.1 基本 WHERE 句

```sql
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_line_item_type = 'Usage'
  AND line_item_usage_start_date >= TIMESTAMP '{since}'
  AND line_item_usage_start_date < TIMESTAMP '{until}'
  AND line_item_iam_principal = '{principal_arn}'
```

`--principal-role` 使用時:

```sql
AND line_item_iam_principal LIKE '{role_arn}/%'
```

### 18.2 日次集計

```sql
SELECT
  DATE(line_item_usage_start_date) AS usage_date,
  SUM(line_item_unblended_cost) AS cost,
  line_item_usage_type,
  SUM(line_item_usage_amount) AS usage_amount
FROM {database}.{table}
WHERE ...
GROUP BY 1, 3
ORDER BY 1
```

### 18.3 cost 列

actual cost は CUR の cost 列のみを使用する。独自単価計算は行わない。

| metric 設定 | 使用列 |
|------------|--------|
| `unblended` | `line_item_unblended_cost` |
| `net_unblended` | `line_item_net_unblended_cost` |

### 18.4 クエリ実行

- Athena `StartQueryExecution` で非同期実行
- 結果をポーリングし、パースして内部モデルに変換
- 大量データ時は期間を分割して実行（実装詳細）

## 19. 出力形式と表示規約

### 19.1 table（デフォルト）

- 固定幅またはタブ区切り
- ヘッダに `source:`, `profile:`, `principal:`, `period:` を必ず含む
- 金額は `$` プレフィックス、小数点以下 2 桁
- トークン数は k/M サフィックス（例: 42.1k）

### 19.2 --json

機械処理可能な JSON。トップレベル構造:

```json
{
  "version": "0.1.0",
  "source": "cur",
  "source_label": "CUR 2.0 actual",
  "profile": "default",
  "principal": "arn:aws:sts::123456789012:assumed-role/BedrockDeveloper/alice@example.com",
  "period": { "since": "2026-05-01", "until": "2026-05-31" },
  "billing_data_status": "partial",
  "billing_data_latest": "2026-05-31T23:00:00Z",
  "currency": "USD",
  "rows": [],
  "totals": {}
}
```

### 19.3 --csv

- ヘッダ行 + データ行
- メタデータは `#` コメント行または先頭行の前に出力（実装で統一）

### 19.4 actual / estimate 表示

| source | ヘッダ表示 |
|--------|-----------|
| cur | `source: CUR 2.0 actual` |
| ce | `source: Cost Explorer actual-lite` |
| logs | `source: CloudWatch Logs estimate` |
| metrics | `source: CloudWatch Metrics (volume)` |

## 20. principal スコープとセキュリティ

### 20.1 CLI direct mode（v0.1）

- `--principal self` は **UX 上のフィルタ** であり、セキュリティ境界ではない
- ユーザーが AWS 上で CUR 全体読み取り権限を持つ場合、`--principal` を改ざんすれば他者分も見える
- 一般ユーザーに自分の分だけを厳密に見せるには v0.4 **managed mode** を使用

### 20.2 本文非取得

- CloudWatch Logs source でもプロンプト / レスポンス本文フィールドを query に含めない
- ログ出力・デバッグ時も本文を redact
- `security/redaction` モジュールで統一

### 20.3 --all の扱い

- help に「管理者向け。全 IAM principal のコストを表示します」と明記
- 一般ユーザーが `--all` を指定しても、付与された AWS 権限の範囲内

### 20.4 managed mode（v0.4 設計）

| 要素 | 内容 |
|------|------|
| エンドポイント | `--managed <url>`（API Gateway + Lambda） |
| 認証 | SigV4 / IAM Identity Center |
| サーバー | caller 検証、SQL WHERE のサーバー側生成 |
| principal map | DynamoDB で session → user マッピング |
| スコープ | `self` / `team` / `admin` |

## 21. 将来コマンドと拡張

### 21.1 users（計画）

```bash
npx bdusage users --all --since 30d
```

principal / tag 別ランキング。管理者向け。

### 21.2 cache（計画）

prompt cache read / write の内訳レポート。

### 21.3 today（v0.3）

```bash
npx bdusage today --source logs
```

今日の概算レポート。request 数、input/output tokens、latency p50/p95。

### 21.4 Cost Explorer（v0.2）

`--source ce`、cost allocation tag フィルタ、`USAGE_TYPE` グループ。

### 21.5 v0.5 以降

- application inference profiles / projects / workspaces の tag 対応
- anomaly summary
- budget threshold warning
- GitHub Actions / CI usage report
- Slack / Datadog export

## 22. エラー処理

| エラー | ユーザー向けメッセージ | 退出コード |
|--------|----------------------|-----------|
| 認証失敗 | `AWS credentials not found. Run aws configure or set AWS_PROFILE.` | 1 |
| config 不在 | `Config not found. Run bdusage doctor or create ~/.config/bdusage/config.toml` | 1 |
| Athena 失敗 | `Athena query failed: {reason}. Run bdusage doctor.` | 1 |
| principal 列なし | `line_item_iam_principal not available. See bdusage doctor.` | 1 |
| データなし | `No Bedrock usage found for the specified period and principal.` | 0 |
| 権限不足 | `Access denied: {action}. Check IAM permissions (see SPEC §15).` | 1 |

`--source auto` で cur が失敗した場合、v0.2 以降は Cost Explorer にフォールバックする。cur / ce とも失敗した場合は `doctor` 実行を案内する。

## 23. JSON 出力スキーマ

### 23.1 daily 行

```json
{
  "date": "2026-05-27",
  "cost": 0.18,
  "tokens": {
    "input": 42100,
    "output": 5800,
    "cache_read": 81000,
    "cache_write": 3200
  },
  "top_model": "Claude Sonnet"
}
```

### 23.2 models 行

```json
{
  "model": "Claude 3.5 Sonnet",
  "cost": 1.42,
  "tokens": {
    "input": 320000,
    "output": 45000,
    "cache_read": 700000,
    "cache_write": 20000
  },
  "usage_types": ["USE1-Claude-3.5-Sonnet-Input-Tokens", "..."]
}
```

### 23.3 doctor 結果

```json
{
  "checks": [
    { "name": "aws_credentials", "status": "ok" },
    { "name": "config_file", "status": "ok" },
    { "name": "athena_workgroup", "status": "ok" },
    { "name": "cur_iam_principal_column", "status": "fail", "message": "...", "fix": "..." }
  ],
  "overall": "fail"
}
```

## 24. 実装構成

```
bdusage/
  src/
    cli.ts
    commands/       # summary, daily, monthly, models, users, cache, today, whoami, doctor
    aws/            # credentials, sts, athena, cost-explorer, cloudwatch-*, pricing
    sources/        # cur, ce, logs, metrics
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

### 24.1 技術スタック

- ランタイム: Node.js >= 20（Bun で開発・CI）
- CLI フレームワーク: commander
- AWS SDK: v3（athena, sts, cost-explorer 等）
- テスト: vitest
- リント: oxlint, biome

### 24.2 公開

- npm package: `bdusage`
- 実行: `npx bdusage`
- GitHub Actions + npm Trusted Publishing（OIDC）

## 25. 受け入れ条件

v0.1 の受け入れ条件:

1. CUR 2.0 / Athena 設定済み環境で `npx bdusage daily --principal self` が成功する
2. `line_item_iam_principal` 欠如時、`doctor` が明確な修正案を出す
3. `--principal-role` で assumed role session をまとめられる
4. actual cost は CUR の cost 列のみ（独自単価計算なし）
5. `--json` が機械処理可能
6. CloudWatch Logs 本文は取得・表示しない
7. `--all` は help に管理者向けと明記
8. `cur` と `logs` 出力で actual / estimate を明確に区別（logs は v0.3 以降）

## 26. 未決定事項

| 項目 | 選択肢 | 備考 |
|------|--------|------|
| package 名 | `bdusage` vs scope 付き（`@org/bdusage`） | npm 公開時に決定 |
| ランタイム | Node.js のみ vs Bun 正式対応 | 現状 Bun 開発、Node 互換 |
| デフォルト cost metric | `net_unblended` vs `unblended` | FinOps ポリシーに依存 |
| bedrock-runtime / bedrock-mantle | 区別範囲 | usage type パース設計に影響 |
| Organizations 複数 account | 表示粒度 | account 列グループ vs 合算 |
| weekly レポート | ccusage 互換で追加するか | v0.5+ 候補 |

## 27. 参考

- [ccusage](https://ccusage.com/guide/)
- [Amazon Bedrock: Managing costs](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-management.html)
- [IAM principal attribution](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-mgmt-iam-principal-tracking.html)
- [Using IAM principal for cost allocation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/iam-principal-cost-allocation.html)
- [CUR 2.0 table dictionary](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)
- [CUR 2.0 line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html)
- [review-codecommit](https://github.com/watany-dev/review-codecommit) — CI / npm 公開パターンの参考
