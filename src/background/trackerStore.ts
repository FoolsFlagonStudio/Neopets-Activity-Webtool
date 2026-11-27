import type {
  TrackerEntry,
  TrackerLog,
  TrackerRecordPayload,
  TrackerSettings,
  TrackerStore,
} from "../types/tracker";
import { getTracker } from "../data/trackers";

const STORAGE_KEY = "trackerData";

/**
 * Hard cap per tracker so storage can't grow without bound.
 * ~120 bytes/entry → 20k entries is roughly 2.4 MB, well under the
 * 10 MB chrome.storage.local quota even with several trackers.
 */
const MAX_ENTRIES_PER_TRACKER = 20_000;

function emptyLog(): TrackerLog {
  return { entries: [], settings: {} };
}

export async function loadTrackerStore(): Promise<TrackerStore> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve((result[STORAGE_KEY] as TrackerStore) ?? {});
    });
  });
}

async function saveTrackerStore(store: TrackerStore): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: store }, () => resolve());
  });
}

// Serialize writes so two results arriving together can't clobber each other.
let writeQueue: Promise<unknown> = Promise.resolve();

function mutate<T>(fn: (store: TrackerStore) => T): Promise<T> {
  const next = writeQueue.then(async () => {
    const store = await loadTrackerStore();
    const result = fn(store);
    await saveTrackerStore(store);
    return result;
  });
  writeQueue = next.catch(() => undefined);
  return next;
}

function sanitizeNp(np: unknown): number {
  const n = Math.floor(Number(np));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function recordTrackerEntry(
  payload: TrackerRecordPayload
): Promise<TrackerEntry | null> {
  if (!getTracker(payload.trackerId)) return Promise.resolve(null);

  return mutate((store) => {
    const log = (store[payload.trackerId] ??= emptyLog());

    const entry: TrackerEntry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      np: sanitizeNp(payload.np),
      item: payload.item ? String(payload.item).slice(0, 120) : null,
      tier: payload.tier,
      ...(payload.category ? { category: String(payload.category).slice(0, 40) } : {}),
      choices: payload.choices ?? {},
      source: payload.source,
    };

    log.entries.push(entry);
    if (log.entries.length > MAX_ENTRIES_PER_TRACKER) {
      log.entries.splice(0, log.entries.length - MAX_ENTRIES_PER_TRACKER);
    }
    return entry;
  });
}

export function undoLastTrackerEntry(trackerId: string): Promise<boolean> {
  return mutate((store) => {
    const log = store[trackerId];
    if (!log || log.entries.length === 0) return false;
    log.entries.pop();
    return true;
  });
}

export function deleteTrackerEntry(
  trackerId: string,
  entryId: string
): Promise<boolean> {
  return mutate((store) => {
    const log = store[trackerId];
    if (!log) return false;
    const idx = log.entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return false;
    log.entries.splice(idx, 1);
    return true;
  });
}

export function resetTracker(trackerId: string): Promise<void> {
  return mutate((store) => {
    const settings = store[trackerId]?.settings ?? {};
    store[trackerId] = { entries: [], settings };
  });
}

export function updateTrackerSettings(
  trackerId: string,
  patch: Omit<TrackerSettings, "costPerPlay"> & { costPerPlay?: number | null }
): Promise<void> {
  return mutate((store) => {
    const log = (store[trackerId] ??= emptyLog());
    const { costPerPlay, ...rest } = patch;
    const settings: TrackerSettings = { ...log.settings, ...rest };
    if (costPerPlay === null) delete settings.costPerPlay;
    else if (costPerPlay !== undefined) settings.costPerPlay = Number(costPerPlay);
    if (
      settings.costPerPlay === undefined ||
      !Number.isFinite(settings.costPerPlay) ||
      settings.costPerPlay < 0
    ) {
      delete settings.costPerPlay;
    }
    if (patch.prefill) {
      const p = patch.prefill;
      settings.prefill = {
        enabled: Boolean(p.enabled),
        choices: Object.fromEntries(
          Object.entries(p.choices ?? {}).map(([k, v]) => [k, String(v).slice(0, 60)])
        ),
      };
    }
    log.settings = settings;
  });
}
