import { getAllActivitiesWithAvailability } from "./availabilityEngine";
import { loadActivityState, saveActivityState } from "./stateManager";
import { notify } from "./notifications";

const CHECK_INTERVAL_MS = 60_000;

export function startScheduler(): void {
  setInterval(checkAvailabilityAndNotify, CHECK_INTERVAL_MS);
}

async function checkAvailabilityAndNotify(): Promise<void> {
  const activities = await getAllActivitiesWithAvailability();
  const stateMap = await loadActivityState();

  const newlyReady: string[] = [];

  for (const activity of activities) {
    const { definition, availability } = activity;
    const state = stateMap[definition.id];

    if (!state?.enabled) continue;
    if (!state.notificationsEnabled) continue;

    const prev = state.lastAvailabilityStatus;
    const curr = availability.status;

    // ONLY notify on transition → AVAILABLE
    if (prev !== "AVAILABLE" && curr === "AVAILABLE") {
      newlyReady.push(definition.name);
    }

    // Always persist latest availability
    stateMap[definition.id] = {
      ...state,
      lastAvailabilityStatus: curr,
    };
  }

  if (newlyReady.length > 0) {
    notify(
      "Neopets Activities Ready",
      newlyReady.map((n) => `• ${n}`).join("\n")
    );
  }

  await saveActivityState(stateMap);
}
