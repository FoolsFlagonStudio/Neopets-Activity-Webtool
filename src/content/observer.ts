import { detectWheels } from "./detectors/wheelDetectors";
import { detectHealingSprings } from "./detectors/springDetectors";
import { detectDailyCollect } from "./detectors/dailyCollectors";

function runDetectors(): void {
  detectWheels();
  detectHealingSprings();
  detectDailyCollect();
}

runDetectors();

const observer = new MutationObserver(runDetectors);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
