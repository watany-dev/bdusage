import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { checkRequiredColumns } from "./schema.js";

describe("checkRequiredColumns", () => {
  it("reports missing columns", async () => {
    const executor = {
      executeQuery: vi
        .fn()
        .mockResolvedValue([
          { column_name: "line_item_product_code" },
          { column_name: "line_item_line_item_type" },
        ]),
      close: vi.fn(),
    };
    const result = await checkRequiredColumns(executor, DEFAULT_CONFIG);
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it("passes when all required columns exist", async () => {
    const columns = [
      "line_item_product_code",
      "line_item_line_item_type",
      "line_item_usage_start_date",
      "line_item_usage_type",
      "line_item_usage_amount",
      "line_item_unblended_cost",
      "line_item_iam_principal",
    ];
    const executor = {
      executeQuery: vi.fn().mockResolvedValue(columns.map((column_name) => ({ column_name }))),
      close: vi.fn(),
    };
    const result = await checkRequiredColumns(executor, DEFAULT_CONFIG);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });
});
