import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigError, costColumn, loadConfigFile, mergeConfig } from "./load.js";
import { DEFAULT_CONFIG } from "./schema.js";

describe("mergeConfig", () => {
  it("merges nested sections", () => {
    const merged = mergeConfig(DEFAULT_CONFIG, {
      athena: { database: "billing", table: "cur2", workgroup: "wg", output_location: "s3://x/" },
    });
    expect(merged.athena.database).toBe("billing");
    expect(merged.aws.profile).toBe("default");
  });
});

describe("costColumn", () => {
  it("maps metric to column name", () => {
    expect(costColumn("unblended")).toBe("line_item_unblended_cost");
    expect(costColumn("net_unblended")).toBe("line_item_net_unblended_cost");
  });
});

describe("loadConfigFile", () => {
  it("throws ConfigError when missing", async () => {
    await expect(loadConfigFile("/nonexistent/bdusage-config.toml")).rejects.toBeInstanceOf(
      ConfigError,
    );
  });

  it("loads valid toml", async () => {
    const dir = join(tmpdir(), `bdusage-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, "config.toml");
    await writeFile(
      path,
      `[athena]\ndatabase = "d"\ntable = "t"\nworkgroup = "w"\noutput_location = "s3://b/"\n`,
    );
    const cfg = await loadConfigFile(path);
    expect(cfg.athena.database).toBe("d");
    expect(cfg.cur.athena.database).toBe("d");
    await rm(dir, { recursive: true, force: true });
  });

  it("loads optional top-level sections and legacy athena alias", async () => {
    const dir = join(tmpdir(), `bdusage-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, "config.toml");
    await writeFile(
      path,
      `[aws]
profile = "work"

[logs]
log_group = "/aws/bedrock/modelinvocations"

[cost]
metric = "net_unblended"

[output]
default_format = "json"

[athena]
database = "legacy"
table = "legacy_table"
workgroup = "wg"
output_location = "s3://legacy/"
`,
    );
    const cfg = await loadConfigFile(path);
    expect(cfg.aws.profile).toBe("work");
    expect(cfg.logs.log_group).toContain("bedrock");
    expect(cfg.cost.metric).toBe("net_unblended");
    expect(cfg.output.default_format).toBe("json");
    expect(cfg.cur.athena.database).toBe("legacy");
    await rm(dir, { recursive: true, force: true });
  });

  it("loads cur.duckdb files as string or array", async () => {
    const dir = join(tmpdir(), `bdusage-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, "config.toml");
    await writeFile(
      path,
      `[cur]\nengine = "duckdb"\n\n[cur.duckdb]\nfiles = "s3://bucket/**/*.parquet"\n`,
    );
    const cfg = await loadConfigFile(path);
    expect(cfg.cur.engine).toBe("duckdb");
    expect(cfg.cur.duckdb.files).toEqual(["s3://bucket/**/*.parquet"]);
    await rm(dir, { recursive: true, force: true });
  });
});
