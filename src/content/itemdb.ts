import { extractAndReport } from "./detectors/itemdbExtractor";

// Only run when opened by the extension's refresh flow — not on regular visits.
// The background appends ?nat_extract=1 to the URL it creates, so manual
// navigation to any itemdb restock page won't trigger extraction.
if (
  location.pathname.startsWith("/restock/") &&
  new URLSearchParams(location.search).has("nat_extract")
) {
  extractAndReport();
}
