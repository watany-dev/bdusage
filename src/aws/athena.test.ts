import { describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@aws-sdk/client-athena", () => ({
  AthenaClient: class {
    send = send;
  },
  StartQueryExecutionCommand: class {
    constructor(public readonly input: unknown) {}
  },
  GetQueryExecutionCommand: class {
    constructor(public readonly input: unknown) {}
  },
  GetQueryResultsCommand: class {
    constructor(public readonly input: unknown) {}
  },
}));

describe("LiveAthenaExecutor", () => {
  it("executes query and parses rows with pagination", async () => {
    send
      .mockResolvedValueOnce({ QueryExecutionId: "q1" })
      .mockResolvedValueOnce({
        QueryExecution: { Status: { State: "SUCCEEDED" } },
      })
      .mockResolvedValueOnce({
        ResultSet: {
          Rows: [
            { Data: [{ VarCharValue: "usage_date" }, { VarCharValue: "cost" }] },
            { Data: [{ VarCharValue: "2026-06-01" }, { VarCharValue: "0.5" }] },
          ],
        },
        NextToken: "page2",
      })
      .mockResolvedValueOnce({
        ResultSet: {
          Rows: [{ Data: [{ VarCharValue: "2026-06-02" }, { VarCharValue: "0.1" }] }],
        },
      });

    const { createAthenaClient, LiveAthenaExecutor } = await import("./athena.js");
    const executor = new LiveAthenaExecutor(createAthenaClient("us-east-1"));
    const rows = await executor.executeQuery({
      sql: "SELECT 1",
      database: "cur",
      workgroup: "primary",
      outputLocation: "s3://bucket/",
    });
    expect(rows).toHaveLength(2);
  });

  it("throws when query id missing", async () => {
    send.mockResolvedValueOnce({});
    const { createAthenaClient, LiveAthenaExecutor } = await import("./athena.js");
    const executor = new LiveAthenaExecutor(createAthenaClient("us-east-1"));
    await expect(
      executor.executeQuery({
        sql: "SELECT 1",
        database: "cur",
        workgroup: "primary",
        outputLocation: "s3://bucket/",
      }),
    ).rejects.toThrow("query execution id");
  });

  it("throws when query cancelled", async () => {
    send.mockResolvedValueOnce({ QueryExecutionId: "q1" }).mockResolvedValueOnce({
      QueryExecution: { Status: { State: "CANCELLED", StateChangeReason: "user" } },
    });
    const { createAthenaClient, LiveAthenaExecutor } = await import("./athena.js");
    const executor = new LiveAthenaExecutor(createAthenaClient("us-east-1"));
    await expect(
      executor.executeQuery({
        sql: "SELECT 1",
        database: "cur",
        workgroup: "primary",
        outputLocation: "s3://bucket/",
      }),
    ).rejects.toThrow("CANCELLED");
  });

  it("throws when query fails", async () => {
    send.mockResolvedValueOnce({ QueryExecutionId: "q1" }).mockResolvedValueOnce({
      QueryExecution: { Status: { State: "FAILED", StateChangeReason: "syntax" } },
    });
    const { createAthenaClient, LiveAthenaExecutor } = await import("./athena.js");
    const executor = new LiveAthenaExecutor(createAthenaClient("us-east-1"));
    await expect(
      executor.executeQuery({
        sql: "BAD",
        database: "cur",
        workgroup: "primary",
        outputLocation: "s3://bucket/",
      }),
    ).rejects.toThrow("FAILED");
  });
});
