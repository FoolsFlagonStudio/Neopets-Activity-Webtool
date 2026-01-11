import { getAllActivitiesWithAvailability } from "./availabilityEngine";
import { loadActivityState, saveActivityState } from "./stateManager";
import { notify } from "./notifications";

const ALARM_NAME = "nat-availability-check";
const CHECK_INTERVAL_MINUTES = 1;

export function startScheduler(): void {
  chrome.alarms.get(ALARM_NAME, (existing) => {
    if (existing) return;

    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: CHECK_INTERVAL_MINUTES,
    });
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  checkAvailabilityAndNotify();
});

async function checkAvailabilityAndNotify(): Promise<void> {
  const activities = await getAllActivitiesWithAvailability();
  const stateMap = await loadActivityState();

  const newlyReady: string[] = [];

  for (const activity of activities) {
    const { definition, availability } = activity;
    const state = stateMap[definition.id];

    if (!state?.enabled || !state.notificationsEnabled) continue;

    const prev = state.lastAvailabilityStatus;
    const curr = availability.status;

    if (prev !== "AVAILABLE" && curr === "AVAILABLE") {
      newlyReady.push(definition.name);
    }

    stateMap[definition.id] = {
      ...state,
      lastAvailabilityStatus: curr,
    };
  }

  if (newlyReady.length > 0) {
    notify(
      newlyReady.length === 1
        ? "Neopets Activity Ready"
        : "Neopets Activities Ready",
      newlyReady.map((n) => `• ${n}`).join("\n")
    );
  }

  await saveActivityState(stateMap);
}
