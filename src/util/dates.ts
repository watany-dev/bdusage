export interface DateRange {
  since: string;
  until: string;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseSince(value: string | undefined, fallbackDays: number): string {
  if (!value) {
    return addDays(todayUtc(), -fallbackDays);
  }
  if (/^\d+d$/i.test(value)) {
    const days = Number.parseInt(value.slice(0, -1), 10);
    return addDays(todayUtc(), -days);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  throw new Error(`Invalid --since value: ${value}`);
}

export function parseUntil(value: string | undefined): string {
  if (!value) {
    return addDays(todayUtc(), 1);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return addDays(value, 1);
  }
  throw new Error(`Invalid --until value: ${value}`);
}

export function monthStart(date = todayUtc()): string {
  return `${date.slice(0, 7)}-01`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
