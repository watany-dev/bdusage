import { describe, expect, it } from "vitest";
import { isV01Source, resolveSourceLabel } from "./source.js";

describe("source helpers", () => {
  it("resolves labels", () => {
    expect(resolveSourceLabel("cur")).toBe("CUR 2.0 actual");
    expect(resolveSourceLabel("auto")).toBe("CUR 2.0 actual");
  });

  it("validates v0.1 sources", () => {
    expect(isV01Source("cur")).toBe(true);
    expect(isV01Source("logs")).toBe(false);
  });
});
