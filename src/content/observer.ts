import { detectWheels } from "./detectors/wheelDetectors";
import { detectDailyCollect } from "./detectors/dailyCollectors";
import { applyShopOverlay, reapplyShopOverlay } from "./detectors/shopOverlay";
import { applyShopPricingOverlay } from "./detectors/shopPricingOverlay";
import { detectTraining } from "./detectors/trainingDetector";
import { applyPyramidsHelper } from "./detectors/pyramidsHelper";
import { applySolitaireHelper } from "./detectors/solitaireHelper";
import { detectNeocola } from "./detectors/neocolaDetector";
import { detectVending } from "./detectors/vendingDetector";

// Initial overlay passes — each exits immediately if not on the right page.
applyShopOverlay();
applyShopPricingOverlay();
detectTraining();
applyPyramidsHelper();
applySolitaireHelper();

function runDetectors(): void {
  detectWheels();
  detectDailyCollect();
  // Cheap re-apply: exits immediately if all cards are already processed.
  reapplyShopOverlay();
  detectNeocola();
  detectVending();
}

runDetectors();

const observer = new MutationObserver(runDetectors);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
