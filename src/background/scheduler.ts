import { getAllActivitiesWithAvailability } from "./availabilityEngine";
import { loadActivityState, saveActivityState } from "./stateManager";
import { notify } from "./notifications";
import type { AvailabilityStatus } from "./../types/availability";
import type { TrainingStore } from "../types/training";
import { TRAINING_STORAGE_KEY } from "../types/training";

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
  checkTrainingAndNotify();
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

async function checkTrainingAndNotify(): Promise<void> {
  const result = await new Promise<{ [k: string]: unknown }>((resolve) =>
    chrome.storage.local.get([TRAINING_STORAGE_KEY], resolve)
  );
  const store = result[TRAINING_STORAGE_KEY] as TrainingStore | undefined;
  if (!store) return;

  const now = Date.now();
  const newlyDone: string[] = [];
  let changed = false;

  for (const key of ["swashbuckling", "island_school"] as const) {
    const pets = store[key] ?? [];
    for (let i = 0; i < pets.length; i++) {
      const pet = pets[i];
      if (pet.stat && pet.finishesAt && pet.finishesAt <= now && !pet.notifiedAt) {
        newlyDone.push(`${pet.petName} (${pet.stat})`);
        store[key][i] = { ...pet, notifiedAt: now };
        changed = true;
      }
    }
  }

  if (newlyDone.length > 0) {
    notify(
      "Pet Training Complete",
      newlyDone.map((n) => `• ${n}`).join("\n")
    );
  }

  if (changed) {
    await new Promise<void>((resolve) =>
      chrome.storage.local.set({ [TRAINING_STORAGE_KEY]: store }, resolve)
    );
  }
}
