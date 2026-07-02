import { bench, describe } from "vitest";
import { normalizeModelName } from "../src/bedrock/model-normalizer.js";
import { addUsageAmount, emptyTokenTotals } from "../src/bedrock/token-types.js";
import { extractModelSegment } from "../src/bedrock/usage-type-parser.js";
import { weekStartMonday } from "../src/util/weeks.js";
import { REALISTIC_USAGE_TYPES } from "./data.js";

const ITERATIONS = 10_000;

describe(`per-row helpers (${REALISTIC_USAGE_TYPES.length} usage types × ${ITERATIONS} iterations)`, () => {
  bench("normalizeModelName", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      for (const usageType of REALISTIC_USAGE_TYPES) {
        normalizeModelName(usageType);
      }
    }
  });

  bench("extractModelSegment", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      for (const usageType of REALISTIC_USAGE_TYPES) {
        extractModelSegment(usageType);
      }
    }
  });

  bench("addUsageAmount (classifyUsageType)", () => {
    const totals = emptyTokenTotals();
    for (let i = 0; i < ITERATIONS; i++) {
      for (const usageType of REALISTIC_USAGE_TYPES) {
        addUsageAmount(totals, usageType, 1);
      }
    }
  });

  bench("weekStartMonday", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      weekStartMonday("2026-03-15");
      weekStartMonday("2026-03-16");
    }
  });
});
