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
