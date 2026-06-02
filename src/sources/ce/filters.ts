import type { Expression } from "@aws-sdk/client-cost-explorer";
import type { PrincipalFilter } from "../../types/principal.js";
import { assertCePrincipalFilter } from "../../types/principal.js";

const BEDROCK_SERVICE: Expression = {
  Dimensions: {
    Key: "SERVICE",
    Values: ["Amazon Bedrock"],
  },
};

export function buildCeFilter(principal: PrincipalFilter): Expression {
  assertCePrincipalFilter(principal);

  if (principal.kind === "all") {
    return BEDROCK_SERVICE;
  }

  if (principal.kind === "tag") {
    return {
      And: [
        BEDROCK_SERVICE,
        {
          Tags: {
            Key: principal.key,
            Values: [principal.value],
          },
        },
      ],
    };
  }

  throw new Error("Unexpected principal filter for Cost Explorer");
}
