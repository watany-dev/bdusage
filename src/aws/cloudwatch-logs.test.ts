import { describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@aws-sdk/client-cloudwatch-logs", () => ({
  CloudWatchLogsClient: class {
    send = send;
  },
  StartQueryCommand: class {
    constructor(public readonly input: unknown) {}
  },
  GetQueryResultsCommand: class {
    constructor(public readonly input: unknown) {}
  },
}));

describe("LiveCloudWatchLogsClient", () => {
  it("runs insights query until complete", async () => {
    send
      .mockResolvedValueOnce({ queryId: "q1" })
      .mockResolvedValueOnce({ status: "Running" })
      .mockResolvedValueOnce({
        status: "Complete",
        results: [
          [
            { field: "modelId", value: "anthropic.claude" },
            { field: "requests", value: "2" },
          ],
        ],
      });

    const { LiveCloudWatchLogsClient } = await import("./cloudwatch-logs.js");
    const client = new LiveCloudWatchLogsClient({ send } as never);
    const rows = await client.runInsightsQuery({
      logGroupName: "/aws/bedrock/modelinvocations",
      queryString: "fields @timestamp",
      startTime: 0,
      endTime: 100,
    });
    expect(rows).toEqual([{ modelId: "anthropic.claude", requests: "2" }]);
  });

  it("throws when query fails", async () => {
    send.mockResolvedValueOnce({ queryId: "q1" }).mockResolvedValueOnce({ status: "Failed" });

    const { LiveCloudWatchLogsClient } = await import("./cloudwatch-logs.js");
    const client = new LiveCloudWatchLogsClient({ send } as never);
    await expect(
      client.runInsightsQuery({
        logGroupName: "g",
        queryString: "fields @timestamp",
        startTime: 0,
        endTime: 1,
      }),
    ).rejects.toThrow("failed");
  });

  it("throws when query cancelled", async () => {
    send.mockResolvedValueOnce({ queryId: "q1" }).mockResolvedValueOnce({ status: "Cancelled" });

    const { LiveCloudWatchLogsClient } = await import("./cloudwatch-logs.js");
    const client = new LiveCloudWatchLogsClient({ send } as never);
    await expect(
      client.runInsightsQuery({
        logGroupName: "g",
        queryString: "fields @timestamp",
        startTime: 0,
        endTime: 1,
      }),
    ).rejects.toThrow("cancelled");
  });

  it("throws when query id missing", async () => {
    send.mockResolvedValueOnce({});

    const { LiveCloudWatchLogsClient } = await import("./cloudwatch-logs.js");
    const client = new LiveCloudWatchLogsClient({ send } as never);
    await expect(
      client.runInsightsQuery({
        logGroupName: "g",
        queryString: "q",
        startTime: 0,
        endTime: 1,
      }),
    ).rejects.toThrow("query id");
  });
});
