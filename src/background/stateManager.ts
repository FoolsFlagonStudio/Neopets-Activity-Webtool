import { Activity, ActivityState } from "../types/activity";

const STORAGE_KEY = "activityState";

// load all activity state from storage
export async function loadActivityState(): Promise<
  Record<string, ActivityState>
> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [STORAGE_KEY],
      (result: { [key: string]: unknown }) => {
        const stored = result[STORAGE_KEY] as
          | Record<string, ActivityState>
          | undefined;

        resolve(stored ?? ({} as Record<string, ActivityState>));
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
