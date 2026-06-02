import { GetProductsCommand, PricingClient } from "@aws-sdk/client-pricing";

export interface ModelTokenRates {
  inputPerToken: number;
  outputPerToken: number;
  cacheReadPerToken: number;
  cacheWritePerToken: number;
}

export interface PricingCatalogLike {
  getModelRates(modelId: string, region: string): Promise<ModelTokenRates | null>;
}

const PRICING_API_REGION = "us-east-1";

export function createPricingClient(profile?: string): PricingClient {
  return new PricingClient({
    region: PRICING_API_REGION,
    ...(profile ? { profile } : {}),
  });
}

export class LivePricingCatalog implements PricingCatalogLike {
  private readonly cache = new Map<string, ModelTokenRates | null>();

  constructor(private readonly client: PricingClient) {}

  async getModelRates(modelId: string, region: string): Promise<ModelTokenRates | null> {
    const cacheKey = `${region}:${modelId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }
    const rates = await fetchModelRates(this.client, modelId, region);
    this.cache.set(cacheKey, rates);
    return rates;
  }
}

async function fetchModelRates(
  client: PricingClient,
  modelId: string,
  region: string,
): Promise<ModelTokenRates | null> {
  const location = pricingLocationForRegion(region);
  if (!location) {
    return null;
  }

  const response = await client.send(
    new GetProductsCommand({
      ServiceCode: "AmazonBedrock",
      Filters: [
        { Type: "TERM_MATCH", Field: "modelId", Value: modelId },
        { Type: "TERM_MATCH", Field: "location", Value: location },
      ],
      MaxResults: 5,
    }),
  );

  for (const raw of response.PriceList ?? []) {
    const parsed = parseBedrockPriceListEntry(raw);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

function parseBedrockPriceListEntry(raw: string): ModelTokenRates | null {
  try {
    const product = JSON.parse(raw) as {
      terms?: {
        OnDemand?: Record<
          string,
          {
            priceDimensions?: Record<
              string,
              { unit?: string; pricePerUnit?: { USD?: string }; description?: string }
            >;
          }
        >;
      };
    };
    const onDemand = product.terms?.OnDemand;
    if (!onDemand) {
      return null;
    }
    let inputPerToken: number | null = null;
    let outputPerToken: number | null = null;
    let cacheReadPerToken: number | null = null;
    let cacheWritePerToken: number | null = null;

    for (const term of Object.values(onDemand)) {
      for (const dim of Object.values(term.priceDimensions ?? {})) {
        const usd = Number(dim.pricePerUnit?.USD);
        if (!Number.isFinite(usd)) {
          continue;
        }
        const desc = (dim.description ?? "").toLowerCase();
        if (desc.includes("input") && desc.includes("cache") && desc.includes("write")) {
          cacheWritePerToken = usd;
        } else if (desc.includes("input") && desc.includes("cache") && desc.includes("read")) {
          cacheReadPerToken = usd;
        } else if (desc.includes("input")) {
          inputPerToken = usd;
        } else if (desc.includes("output")) {
          outputPerToken = usd;
        }
      }
    }

    if (inputPerToken === null || outputPerToken === null) {
      return null;
    }
    return {
      inputPerToken,
      outputPerToken,
      cacheReadPerToken: cacheReadPerToken ?? 0,
      cacheWritePerToken: cacheWritePerToken ?? 0,
    };
  } catch {
    return null;
  }
}

export function estimateCostFromRates(
  rates: ModelTokenRates,
  tokens: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
  },
): number {
  return (
    tokens.input * rates.inputPerToken +
    tokens.output * rates.outputPerToken +
    tokens.cache_read * rates.cacheReadPerToken +
    tokens.cache_write * rates.cacheWritePerToken
  );
}

function pricingLocationForRegion(region: string): string | null {
  const map: Record<string, string> = {
    "us-east-1": "US East (N. Virginia)",
    "us-east-2": "US East (Ohio)",
    "us-west-2": "US West (Oregon)",
    "eu-west-1": "Europe (Ireland)",
    "eu-central-1": "Europe (Frankfurt)",
    "ap-northeast-1": "Asia Pacific (Tokyo)",
    "ap-southeast-1": "Asia Pacific (Singapore)",
    "ap-southeast-2": "Asia Pacific (Sydney)",
  };
  return map[region] ?? null;
}
