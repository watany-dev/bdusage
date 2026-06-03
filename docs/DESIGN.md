# bdusage 設計メモ

作成日: 2026-06-02  
ステータス: Draft v0.1.0-beta（CUR engines 実装済み）/ v0.2 managed mode 設計

## 1. 目的

`bdusage` は、ユーザーにとっては `npx bdusage` だけで Bedrock 利用料金を確認できる CLI にする。一方で内部実装は、取得元や実行基盤ごとに分離し、Athena / DuckDB / Cost Explorer / CloudWatch Logs を無理に共通 executor に押し込めない。

今回の設計更新では、Athena 前提だった CUR actual source を見直し、Athena と DuckDB を別実装として設ける。ユーザーは高価な Athena を意識せず、できるだけ安価な DuckDB direct mode を選べるようにする。

## 2. 設計原則

1. ユーザー体験を最優先する。設定項目を増やす場合は `init` と `doctor` が発見・検査・修正案を巻き取る。
2. actual と estimate は混ぜない。CUR / Cost Explorer は actual 系、Logs / Metrics は estimate 系として表示で明示する。
3. Athena と DuckDB は別実装にする。共通化するのは `BillingSource` interface、出力モデル、Bedrock usage type parser、principal parser に限定する。
4. CUR の全スキーマを TypeScript で保持しない。実行時に必要列だけを検査し、列推定・Parquet schema merge・S3 認証は各 backend の責務にする。
5. `--source auto` はユーザー向けの UX であり、内部では具体的な resolved source / engine を必ず記録する。

## 3. ユーザー体験

初回セットアップ（**v0.1 では `bdusage init` 未実装**。手動で `config.toml` を作成し `doctor` で検証）:

```bash
npx bdusage init   # 将来: 対話的 config 作成
```

`init`（計画）は AWS profile を使って次を順に試す。

1. Data Exports / CUR 2.0 export の検出
2. S3 export prefix の検出
3. DuckDB で Parquet を直接読めるか検査
4. Athena 設定済みの場合は Athena backend も検査
5. 使える backend を `~/.config/bdusage/config.toml` に保存

通常利用:

```bash
npx bdusage
npx bdusage daily
npx bdusage models --since 30d
```

高度な指定:

```bash
npx bdusage daily --source cur --cur-engine duckdb
npx bdusage daily --source cur --cur-engine athena
npx bdusage daily --source ce --principal-tag user=alice
```

`--cur-engine` は通常不要。デフォルトは `auto` とし、設定済み backend を優先して選ぶ。

## 4. Source と Engine の分離

`source` はデータの意味を表す。

| source | 意味 | 表示 |
|--------|------|------|
| `cur` | CUR 2.0 actual | `source: CUR 2.0 actual` |
| `ce` | Cost Explorer actual-lite | `source: Cost Explorer actual-lite` |
| `logs` | CloudWatch Logs estimate | `source: CloudWatch Logs estimate` |
| `metrics` | CloudWatch Metrics volume / estimate | `source: CloudWatch Metrics` |
| `auto` | UX 用。cur → ce 等へ解決 | resolved source を表示 |

`engine` は `cur` source の実行基盤を表す。

| engine | 実装 | 用途 |
|--------|------|------|
| `duckdb` | CUR Parquet を DuckDB で直接読む | Athena コストを避ける標準候補 |
| `athena` | Glue/Athena table を AWS Athena で読む | 既存 CUR/Athena 環境向け |
| `auto` | 設定・到達性から選択 | 通常利用向け |

レポート meta には `source` と `engine` を分けて出す。

```json
{
  "source": "cur",
  "source_label": "CUR 2.0 actual",
  "engine": "duckdb",
  "engine_label": "DuckDB direct Parquet"
}
```

Cost Explorer や Logs では `engine` を出さない、または `null` とする。

## 5. 実装構成

```text
src/
  sources/
    billing-source.ts
    resolve.ts
    cur-athena/
      source.ts
      queries.ts
      doctor.ts
    cur-duckdb/
      source.ts
      duckdb.ts
      discovery.ts
      schema.ts
      doctor.ts
    ce/
      source.ts
      filters.ts
    logs/
      source.ts
      queries.ts
  commands/
    init.ts
    doctor.ts
  config/
    schema.ts
    load.ts
    write.ts
```

`CurAthenaSource` と `CurDuckDbSource` はどちらも `BillingSource` を実装する。ただし SQL builder、接続、schema 検査、doctor は別実装にする。

共有してよいもの:

- `BillingSource` interface
- `DailyRow` / `MonthlyRow` / `ModelRow` などの内部 report model
- Bedrock usage type parser / model normalizer
- principal filter parser
- table / json / csv renderer

共有しないもの:

- Athena query lifecycle
- DuckDB connection lifecycle
- schema discovery
- S3 / Glue / Data Exports discovery
- backend 固有 error handling

## 6. `cur-duckdb` backend

### 6.1 入力

`cur-duckdb` は `files` を主入力にする。

```toml
[cur]
engine = "auto"

[cur.duckdb]
files = "s3://my-cur-bucket/export/**/*.parquet"
s3_region = "ap-northeast-1"
hive_partitioning = true
union_by_name = true
```

`files` は文字列または配列を許可する。

```toml
[cur.duckdb]
files = [
  "s3://bucket/export/year=2026/month=05/**/*.parquet",
  "s3://bucket/export/year=2026/month=06/**/*.parquet"
]
```

### 6.2 初期化

DuckDB connection 作成時に一時 view を作る。

```sql
INSTALL httpfs;
LOAD httpfs;

CREATE OR REPLACE SECRET bdusage_s3 (
  TYPE s3,
  PROVIDER credential_chain,
  CHAIN 'env;config;sso;process;instance',
  PROFILE '{profile}',
  REGION '{s3_region}'
);

CREATE OR REPLACE VIEW cost_and_usage_report AS
SELECT *
FROM read_parquet(
  {files},
  union_by_name = true,
  hive_partitioning = true
);
```

`profile` は `[aws].profile` を使う。`s3_region` は `[aws].region` とは分ける。Bedrock / Cost Explorer の region と CUR export bucket region は一致しないことがあるため。

### 6.3 スキーマ検査

DuckDB backend は CUR 2.0 の全列を持たない。`doctor` と起動時 probe では次の required columns だけを見る。

| 用途 | 必要列 |
|------|--------|
| Bedrock filter | `line_item_product_code` |
| Usage filter | `line_item_line_item_type` |
| 日付 | `line_item_usage_start_date` |
| usage type | `line_item_usage_type` |
| usage amount | `line_item_usage_amount` |
| cost | `line_item_unblended_cost` または `line_item_net_unblended_cost` |
| principal | `line_item_iam_principal` |

検査例:

```sql
DESCRIBE SELECT * FROM cost_and_usage_report;

SELECT line_item_usage_type
FROM cost_and_usage_report
WHERE line_item_product_code = 'AmazonBedrock'
LIMIT 1;
```

`line_item_iam_principal` が存在しない、または常に null の場合は、CUR 2.0 export で caller identity allocation data を有効化する案内を出す。

### 6.4 クエリ

DuckDB query は Athena query と別ファイルにする。理由は dialect 差分を helper で吸収し続けると、将来の grouping / partition pruning / file narrowing で逆に複雑になるため。

`cur-duckdb/queries.ts` は DuckDB 前提で書く。

```sql
SELECT
  CAST(line_item_usage_start_date AS DATE)::VARCHAR AS usage_date,
  SUM(line_item_unblended_cost) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount
FROM cost_and_usage_report
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_line_item_type = 'Usage'
  AND line_item_usage_start_date >= TIMESTAMP '{since}'
  AND line_item_usage_start_date < TIMESTAMP '{until}'
  AND {principal_filter}
GROUP BY 1, 3
ORDER BY 1;
```

月次は DuckDB の `strftime` を使う。

## 7. `cur-athena` backend

Athena backend は既存 v0.1 の実装を `cur-athena` 配下に移す。

```toml
[cur.athena]
database = "cur"
table = "cost_and_usage_report"
workgroup = "primary"
output_location = "s3://my-athena-query-results/bdusage/"
```

Athena backend の責務:

- `StartQueryExecution` / polling / `GetQueryResults`
- Athena / Glue / query result S3 権限の診断
- Athena SQL 方言に最適化した query
- 既存ユーザー向け backward compatibility

`cur-athena` は `cur-duckdb` と mapper だけ共有する。接続や doctor は共有しない。

## 8. backend 解決順序

`--source auto`:

1. `cur.engine` が明示されていれば、その engine を probe
2. `cur.engine = auto` の場合、DuckDB 設定があれば DuckDB を probe
3. DuckDB が使えなければ Athena を probe
4. CUR backend がどちらも使えなければ Cost Explorer を probe
5. すべて失敗したら `doctor` を案内

`--source cur --cur-engine auto`:

1. DuckDB 設定があれば DuckDB
2. 失敗時 Athena
3. どちらも失敗したら error
4. CE には fallback しない。`source=cur` は actual CUR 指定だから。

`--source cur --cur-engine duckdb`:

- DuckDB だけを使う。失敗時に Athena / CE へ暗黙 fallback しない。

`--source cur --cur-engine athena`:

- Athena だけを使う。失敗時に DuckDB / CE へ暗黙 fallback しない。

## 9. `init` と `doctor`

### 9.1 init

`bdusage init` は対話的に設定を作る。CI / headless 用に `--yes` と `--format json` を用意する。

主な処理:

1. AWS credentials / profile を確認
2. Cost Explorer の最低限の到達性を確認
3. Data Exports API または S3 prefix から CUR export 候補を探す
4. DuckDB で candidate Parquet を probe
5. Athena 設定済みなら Athena も probe
6. 推奨 backend を表示し、config.toml に保存

初期推奨は DuckDB。理由は Athena の query charge と query result S3 設定を避けられるため。ただし既存 config に Athena があり、DuckDB files が未検出の場合は Athena を維持する。

### 9.2 doctor

`doctor` の**目標 UI**は source / engine 単位の階層表示。v0.1 実装はフラットなチェック名一覧（`duckdb_*`, `athena_*` 等）。SPEC §16.2 参照。

```text
✓ duckdb_files: 1 path(s): s3://...
✓ duckdb_httpfs: httpfs extension loaded
✓ athena_output_location: s3://...
```

`doctor --fix`（config 補完のみ）は**未実装**。

- config file の作成・更新
- missing default values の補完
- `cur.engine = auto` の設定

AWS 側リソース変更は原則行わない。必要な変更手順を表示する。

## 10. エラー設計

| 状況 | メッセージ方針 |
|------|----------------|
| DuckDB package なし | `@duckdb/node-api` が未インストール（npm 依存に含む。CLI は external 参照） |
| httpfs load 失敗 | `DuckDB httpfs extension could not be loaded` |
| S3 認証失敗 | profile / region / SSO login を案内 |
| files glob 0 件 / 接続失敗 | `cur.duckdb.files` または S3 認証の修正案を出す（件数カウントは未実装） |
| required column 欠如 | 欠けている列と CUR export 設定の修正案を出す |
| principal 不可 | caller identity allocation data の有効化を案内 |
| Athena 失敗 | Athena backend のみに閉じた error と doctor 案内 |
| auto 全失敗 | DuckDB / Athena / CE の失敗理由を要約し doctor 案内 |

## 11. 実装ステップ

1. `SourceName` と `CurEngineName` を分離する
2. `CurSource` を `CurAthenaSource` にリネームする
3. `CurDuckDbSource` を追加する
4. `config.schema` を `[cur]`, `[cur.duckdb]`, `[cur.athena]` に移行する
5. 旧 `[athena]` config は読み込み時に `[cur.athena]` へ互換変換する
6. `--cur-engine <auto|duckdb|athena>` を追加する
7. `doctor` を source / engine 別に分割する
8. `init` で config discovery を追加する（未実装）
9. fixture Parquet で DuckDB 集計テストを追加する
10. Athena と DuckDB の同一 fixture 集計結果を比較する

## 12. 非ゴール

- CUR 2.0 の全列を TypeScript schema として固定する
- AWS 側の Data Export 作成を初期実装で自動化する
- DuckDB と Athena の SQL を完全共通化する
- `source=cur` 指定時に Cost Explorer へ暗黙 fallback する
- CloudWatch Logs の本文フィールドを取得する

## 13. 採用判断

Athena と DuckDB を別実装にする。ユーザー向けには `init` / `doctor` / `auto` で複雑さを隠し、内部では backend ごとの診断・query・エラー処理を独立させる。

この設計により、短期的には Athena コストを避ける DuckDB direct mode を追加しやすくなり、長期的には Redshift, local cache, managed mode などを `BillingSource` 実装として追加できる。
