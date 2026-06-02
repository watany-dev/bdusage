import type { CommandContext } from "../cli/context.js";
import { renderUsersCsv } from "../output/csv.js";
import { renderJson } from "../output/json.js";
import { renderUsersTable } from "../output/table.js";
import type { PrincipalFilter } from "../types/principal.js";
import { parseSince, parseUntil } from "../util/dates.js";
import { buildReportMeta } from "./report-meta.js";
import { assertUsersBillingSource, assertUsersCommandOptions } from "./users-options.js";

export async function runUsers(ctx: CommandContext): Promise<string> {
  assertUsersCommandOptions(ctx);

  const billing = await ctx.createBillingSource();
  assertUsersBillingSource(billing);

  const principal: PrincipalFilter = { kind: "all" };
  const since = parseSince(ctx.options.since, 30);
  const until = parseUntil(ctx.options.until);
  const range = { since, until };

  const [rows, freshness] = await Promise.all([
    billing.fetchUsers(range),
    billing.fetchBillingFreshness({ kind: "all" }),
  ]);

  const meta = buildReportMeta(ctx, principal, range, freshness);
  const envelope = { meta, rows };

  switch (ctx.outputFormat) {
    case "json":
      return renderJson(envelope);
    case "csv":
      return renderUsersCsv(meta, rows);
    default:
      return renderUsersTable(meta, rows);
  }
}
