import { detectWheels } from "./detectors/wheelDetectors";
import { detectDailyCollect } from "./detectors/dailyCollectors";
import { applyShopOverlay, reapplyShopOverlay } from "./detectors/shopOverlay";

// Initial overlay pass — async, loads price store from storage once and caches it.
applyShopOverlay();

function runDetectors(): void {
  detectWheels();
  detectDailyCollect();
  // Cheap re-apply: exits immediately if all cards are already processed.
  reapplyShopOverlay();
}

runDetectors();

const observer = new MutationObserver(runDetectors);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
