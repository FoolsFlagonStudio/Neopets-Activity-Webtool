import { getAllActivitiesWithAvailability } from "./availabilityEngine";
import { loadActivityState, saveActivityState } from "./stateManager";
import { notify } from "./notifications";
import type { AvailabilityStatus } from "./../types/availability";

const SCHEDULER = {
  ALARM_NAME: "nat-availability-check",
  INTERVAL_MINUTES: 1,
};

// ---------------- Lifecycle ----------------

export function startScheduler(): void {
  chrome.alarms.get(SCHEDULER.ALARM_NAME, (existing) => {
    if (existing) return;

    chrome.alarms.create(SCHEDULER.ALARM_NAME, {
      periodInMinutes: SCHEDULER.INTERVAL_MINUTES,
    });
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SCHEDULER.ALARM_NAME) return;
  checkAvailabilityAndNotify();
});

// ---------------- Core Logic ----------------

function transitionedToAvailable(
  prev: AvailabilityStatus | undefined,
  curr: AvailabilityStatus
): boolean {
  return prev !== "AVAILABLE" && curr === "AVAILABLE";
}

async function checkAvailabilityAndNotify(): Promise<void> {
  const activities = await getAllActivitiesWithAvailability();
  const stateMap = await loadActivityState();

  const newlyReady: string[] = [];

  for (const { definition, availability } of activities) {
    const state = stateMap[definition.id];
    if (!state?.enabled || !state.notificationsEnabled) continue;

    const prev = state.lastAvailabilityStatus;
    const curr = availability.status;

    if (transitionedToAvailable(prev, curr)) {
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
