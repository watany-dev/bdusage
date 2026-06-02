import type { CostMetric } from "../types/report.js";

export interface BdusageConfig {
  aws: {
    profile?: string;
    region?: string;
  };
  athena: {
    database: string;
    table: string;
    workgroup: string;
    output_location: string;
  };
  logs: {
    log_group: string;
    region?: string;
  };
  cost: {
    metric: CostMetric;
  };
  output: {
    default_format: "table" | "json" | "csv";
    currency: string;
  };
}

export const DEFAULT_CONFIG: BdusageConfig = {
  aws: {
    profile: "default",
    region: "us-east-1",
  },
  athena: {
    database: "cur",
    table: "cost_and_usage_report",
    workgroup: "primary",
    output_location: "",
  },
  logs: {
    log_group: "",
  },
  cost: {
    metric: "unblended",
  },
  output: {
    default_format: "table",
    currency: "USD",
  },
};
