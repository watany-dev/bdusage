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
    await rm(dir, { recursive: true, force: true });
  });
});
