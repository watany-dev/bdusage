import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

interface CallerIdentity {
  account: string;
  arn: string;
  userId: string;
}

export async function getCallerIdentity(region: string, profile?: string): Promise<CallerIdentity> {
  const client = new STSClient({
    region,
    ...(profile ? { profile } : {}),
  });
  const result = await client.send(new GetCallerIdentityCommand({}));
  if (!result.Account || !result.Arn || !result.UserId) {
    throw new Error("GetCallerIdentity returned incomplete data");
  }
  return {
    account: result.Account,
    arn: result.Arn,
    userId: result.UserId,
  };
}
