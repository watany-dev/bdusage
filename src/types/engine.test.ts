import { describe, expect, it } from "vitest";
import { isCurEngineName, resolveCurEngineLabel } from "./engine.js";

describe("engine types", () => {
  it("validates cur engine names", () => {
    expect(isCurEngineName("auto")).toBe(true);
    expect(isCurEngineName("duckdb")).toBe(true);
    expect(isCurEngineName("nope")).toBe(false);
  });

  it("resolves display labels", () => {
    expect(resolveCurEngineLabel("duckdb")).toBe("DuckDB direct Parquet");
    expect(resolveCurEngineLabel("athena")).toBe("Athena");
  });
});
