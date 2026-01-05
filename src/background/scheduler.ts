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
  const now = Date.now();

  for (const activity of activities) {
    const { definition, availability } = activity;
    const state = stateMap[definition.id];

    if (!state?.enabled) continue;

    // Only notify when it JUST became available
    if (availability.status !== "AVAILABLE") continue;

    const lastCompleted = state.lastCompletedAt ?? 0;
    const lastNotified = state.lastNotifiedAt ?? 0;

    // Must be:
    // - completed previously
    // - not already notified for this cycle
    if (lastCompleted === 0) continue;
    if (lastNotified > lastCompleted) continue;

    notify(
      `${definition.name} is ready`,
      `You can do ${definition.name} again.`
    );

    stateMap[definition.id] = {
      ...state,
      lastNotifiedAt: now,
    };
  }

  await saveActivityState(stateMap);
}
