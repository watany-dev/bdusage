import { describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@aws-sdk/client-sts", () => ({
  STSClient: class {
    send = send;
  },
  GetCallerIdentityCommand: class {
    constructor(public readonly input: unknown) {}
  },
}));

describe("getCallerIdentity", () => {
  it("returns account and arn", async () => {
    send.mockResolvedValueOnce({
      Account: "123456789012",
      Arn: "arn:aws:sts::123456789012:assumed-role/R/u",
      UserId: "AROA:test",
    });
    const { getCallerIdentity } = await import("./sts.js");
    const id = await getCallerIdentity("us-east-1", "default");
    expect(id.account).toBe("123456789012");
    expect(id.arn).toContain("assumed-role");
  });

  it("throws on incomplete response", async () => {
    send.mockResolvedValueOnce({ Account: "1" });
    const { getCallerIdentity } = await import("./sts.js");
    await expect(getCallerIdentity("us-east-1")).rejects.toThrow("incomplete");
  });
});
