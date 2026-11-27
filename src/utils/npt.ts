export function getDateKeyInTimezone(
  timestamp: number,
  timeZone: string
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

export interface TimeParts {
  year: number;
  month: number; // 1-indexed
  day: number;
  hour: number;
  minute: number;
}

export function getTimeParts(timestamp: number, timeZone: string): TimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp));

  const get = (type: string): number => {
    const val = parts.find((p) => p.type === type)?.value ?? "0";
    const n = parseInt(val, 10);
    return type === "hour" ? n % 24 : n; // "24" can appear for midnight in some locales
  };

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}
