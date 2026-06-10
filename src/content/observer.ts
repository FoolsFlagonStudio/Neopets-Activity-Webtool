import { detectWheels } from "./detectors/wheelDetectors";
import { detectDailyCollect } from "./detectors/dailyCollectors";
import { applyShopOverlay, reapplyShopOverlay } from "./detectors/shopOverlay";
import { applyShopPricingOverlay } from "./detectors/shopPricingOverlay";
import { detectTraining } from "./detectors/trainingDetector";

// Initial overlay passes — each exits immediately if not on the right page.
applyShopOverlay();
applyShopPricingOverlay();
detectTraining();

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
