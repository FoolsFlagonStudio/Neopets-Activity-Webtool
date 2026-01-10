import { Activity, ActivityState } from "../types/activity";
import { getDateKeyInTimezone } from "../utils/npt";

const STORAGE_KEY = "activityState";

// load all activity state from storage
export async function loadActivityState(): Promise<
  Record<string, ActivityState>
> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [STORAGE_KEY],
      (result: { [key: string]: unknown }) => {
        const stored =
          (result[STORAGE_KEY] as Record<string, ActivityState>) ?? {};

        const today = getDateKeyInTimezone(Date.now(), "America/Los_Angeles");

        let mutated = false;

        for (const state of Object.values(stored)) {
          if (state.usesToday == null) {
            state.usesToday = 0;
          }

          // Reset DAILY_LIMIT usage at day boundary
          if (state.lastResetDay !== today) {
            if (state.usesToday && state.usesToday !== 0) {
              state.usesToday = 0;
              mutated = true;
            }

            state.lastResetDay = today;
            mutated = true;
          }
        }

        // Persist reset only if needed
        if (mutated) {
          chrome.storage.local.set({ [STORAGE_KEY]: stored }, () => {
            resolve(stored);
          });
        } else {
          resolve(stored);
        }
      }
    );
  });
}

// save all activity state to storage
export async function saveActivityState(
  state: Record<string, ActivityState>
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: state }, () => resolve());
  });
}
