import { bench, describe } from "vitest";
import {
  athenaRowsToRaw,
  mapRawDailyRows,
  mapRawModelRows,
  mapRawMonthlyRows,
  mapRawRowsToWeekly,
  mapRawUserRows,
} from "../src/sources/cur-athena/aggregate.js";
import { makeAthenaStringRows, makeRawRows } from "./data.js";

// 90 days × 20 usage types × 56 principals ≈ 100k rows
const rows = makeRawRows({ days: 90, principals: 56 });
const athenaRows = makeAthenaStringRows(100_000);

describe(`aggregate (${rows.length} rows)`, () => {
  bench("mapRawDailyRows", () => {
    mapRawDailyRows(rows);
  });

  bench("mapRawRowsToWeekly", () => {
    mapRawRowsToWeekly(rows);
  });

  bench("mapRawMonthlyRows", () => {
    mapRawMonthlyRows(rows);
  });

  bench("mapRawUserRows", () => {
    mapRawUserRows(rows);
  });

  bench("mapRawModelRows", () => {
    mapRawModelRows(rows);
  });

  bench("athenaRowsToRaw", () => {
    athenaRowsToRaw(athenaRows);
  });
});
