import { loadActivityState, saveActivityState } from "./stateManager";
import type { ActivityState } from "../types/activity";

type StateUpdater = (existing: ActivityState) => ActivityState;

export async function updateActivityState(
  activityId: string,
  updater: StateUpdater
): Promise<void> {
  const stateMap = await loadActivityState();

  const existing: ActivityState = stateMap[activityId] ?? {
    enabled: true,
    notificationsEnabled: false,
  };

  stateMap[activityId] = updater(existing);
  await saveActivityState(stateMap);
}

export function markCompleted(existing: ActivityState): ActivityState {
  return {
    ...existing,
    lastCompletedAt: Date.now(),
    notificationsEnabled: true,
    lastAvailabilityStatus: "LOCKED",
  };
}

export function incrementUse(
  existing: ActivityState,
  maxPerDay?: number
): ActivityState {
  const uses = (existing.usesToday ?? 0) + 1;

  return {
    ...existing,
    usesToday: maxPerDay ? Math.min(uses, maxPerDay) : uses,
    lastCompletedAt: Date.now(),
  };
}
