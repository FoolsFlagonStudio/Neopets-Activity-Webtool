import { detectWheels } from "./detectors/wheelDetectors";
import { detectHealingSprings } from "./detectors/springDetectors";
import { detectDailyCollect } from "./detectors/dailyCollectors";
import { detectNeocola } from "./detectors/neocolaDetector";
import { detectVending } from "./detectors/vendingDetector";

function runDetectors(): void {
  detectWheels();
  detectHealingSprings();
  detectDailyCollect();
  detectNeocola();
  detectVending();
}

runDetectors();

const observer = new MutationObserver(runDetectors);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
