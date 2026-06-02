import type { CurEngineName } from "../types/engine.js";
import type { CostMetric } from "../types/report.js";

export interface CurAthenaConfig {
  database: string;
  table: string;
  workgroup: string;
  output_location: string;
}

export interface CurDuckDbConfig {
  files: string[];
  s3_region?: string;
  hive_partitioning: boolean;
  union_by_name: boolean;
}

export interface CurConfig {
  engine: CurEngineName;
  duckdb: CurDuckDbConfig;
  athena: CurAthenaConfig;
}

export interface BdusageConfig {
  aws: {
    profile?: string;
    region?: string;
  };
  cur: CurConfig;
  /** @deprecated Use cur.athena; kept in sync after load for backward compatibility. */
  athena: CurAthenaConfig;
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

const DEFAULT_ATHENA: CurAthenaConfig = {
  database: "cur",
  table: "cost_and_usage_report",
  workgroup: "primary",
  output_location: "",
};

export const DEFAULT_CONFIG: BdusageConfig = {
  aws: {
    profile: "default",
    region: "us-east-1",
  },
  cur: {
    engine: "auto",
    duckdb: {
      files: [],
      hive_partitioning: true,
      union_by_name: true,
    },
    athena: { ...DEFAULT_ATHENA },
  },
  athena: { ...DEFAULT_ATHENA },
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
