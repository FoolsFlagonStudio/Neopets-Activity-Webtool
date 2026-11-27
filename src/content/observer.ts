import { detectWheels } from "./detectors/wheelDetectors";
import { detectHealingSprings } from "./detectors/springDetectors";
import { detectDailyCollect } from "./detectors/dailyCollectors";
import { detectNeocola } from "./detectors/neocolaDetector";

function runDetectors(): void {
  detectWheels();
  detectHealingSprings();
  detectDailyCollect();
  detectNeocola();
}

runDetectors();

const observer = new MutationObserver(runDetectors);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
