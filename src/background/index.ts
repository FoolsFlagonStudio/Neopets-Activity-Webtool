import { ACTIVITIES } from "../data/activities.js";
import { loadActivityState } from "./stateManager.js";
import {
  updateActivityState,
  markCompleted,
  incrementUse,
} from "./stateUpdates.js";
import { computeAvailability } from "./availabilityEngine.js";
import { startScheduler, checkTrainingAndNotify } from "./scheduler";
import { SHOPS, getShopById } from "../data/shops";
import type { ItemPriceEntry, RestockPriceStore, FetchStatus } from "../types/restock";
import { RESTOCK_STORAGE_KEY, FETCH_STATUS_KEY } from "../types/restock";
import { syncStampPage, resetStampStore, markStampOwned } from "./stampStore";
import {
  loadTrackerStore,
  recordTrackerEntry,
  undoLastTrackerEntry,
  deleteTrackerEntry,
  resetTracker,
  updateTrackerSettings,
} from "./trackerStore";

// ---------------- Lifecycle ----------------

chrome.runtime.onInstalled.addListener(() => {
  startScheduler();
});

chrome.runtime.onStartup.addListener(() => {
  startScheduler();
});

// ---------------- Message Handler ----------------

type WebRequestTracker = {
  activityId: string;
  match: string;
  requires?: (url: string) => boolean;
  mode: "increment" | "complete";
};

export const WEB_REQUEST_TRACKERS: WebRequestTracker[] = [
  {
    activityId: "bagatelle",
    match: "/halloween/process_bagatelle.phtml",
    mode: "increment",
  },
  {
    activityId: "cork_gun_gallery",
    match: "/halloween/process_corkgun.phtml",
    mode: "increment",
  },
  {
    activityId: "coconut_shy",
    match: "/halloween/process_cocoshy.phtml",
    mode: "increment",
    requires: (url) => url.includes("coconut="),
  },
  {
    activityId: "qasalan_expellibox",
    match: "ncmall.neopets.com/games/giveaway/process_giveaway.phtml",
    mode: "complete",
  },
];

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    for (const tracker of WEB_REQUEST_TRACKERS) {
      if (!details.url.includes(tracker.match)) continue;
      if (tracker.requires && !tracker.requires(details.url)) continue;

      await updateActivityState(tracker.activityId, (existing) => {
        if (tracker.mode === "increment") {
          return {
            ...existing,
            usesToday: (existing.usesToday ?? 0) + 1,
            lastCompletedAt: Date.now(),
          };
        }

        return {
          ...existing,
          lastCompletedAt: Date.now(),
          notificationsEnabled: true,
          lastAvailabilityStatus: "LOCKED",
        };
      });
    }
  },
  { urls: ["*://www.neopets.com/*", "*://ncmall.neopets.com/*"] }
);

// ---------------- Restock Price Fetcher ----------------

// Alarm name for the per-shop safety timeout. Using chrome.alarms instead of
// setTimeout so the timer survives MV3 service worker idle restarts.
const FETCH_TIMEOUT_ALARM = "nat-fetch-shop-timeout";
// Storage key for persisting queue state across service worker restarts.
const FETCH_STATE_KEY = "nat_fetch_state";

interface PersistedFetchState {
  queue: string[];
  index: number;
  tabId: number | null;
  preBatchTabId: number | null;
  preBatchWindowId: number | null;
}

let fetchQueue: string[] = [];
let fetchIndex = 0;
let activeFetchTabId: number | null = null;
// The tab the user was on before the batch started — restored when done.
let preBatchTabId: number | null = null;
let preBatchWindowId: number | null = null;

async function persistFetchState(): Promise<void> {
  const state: PersistedFetchState = {
    queue: fetchQueue,
    index: fetchIndex,
    tabId: activeFetchTabId,
    preBatchTabId,
    preBatchWindowId,
  };
  return new Promise((resolve) => chrome.storage.local.set({ [FETCH_STATE_KEY]: state }, resolve));
}

async function clearPersistedFetchState(): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.remove([FETCH_STATE_KEY], resolve));
}

async function restoreFetchState(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([FETCH_STATE_KEY], (result) => {
      const state = result[FETCH_STATE_KEY] as PersistedFetchState | undefined;
      if (!state || state.queue.length === 0) { resolve(false); return; }
      fetchQueue = state.queue;
      fetchIndex = state.index;
      activeFetchTabId = state.tabId;
      preBatchTabId = state.preBatchTabId;
      preBatchWindowId = state.preBatchWindowId;
      resolve(true);
    });
  });
}

// Per-shop timeout alarm. Fires even if the service worker was killed and
// restarted between when the tab was opened and when the alarm fires.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== FETCH_TIMEOUT_ALARM) return;
  // In-memory variables are reset on service worker restart — recover from storage.
  if (fetchQueue.length === 0) {
    const restored = await restoreFetchState();
    if (!restored) return;
  }
  const shop = getShopById(fetchQueue[fetchIndex]);
  console.warn(`[NAT] Restock fetch timeout for ${shop?.name ?? fetchQueue[fetchIndex]}, skipping`);
  await closeFetchTab();
  fetchIndex++;
  await persistFetchState();
  openNextShopTab();
});

async function saveFetchStatus(status: FetchStatus): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FETCH_STATUS_KEY]: status }, resolve);
  });
}

async function loadPriceStore(): Promise<RestockPriceStore> {
  return new Promise((resolve) => {
    chrome.storage.local.get([RESTOCK_STORAGE_KEY], (result) => {
      resolve((result[RESTOCK_STORAGE_KEY] as RestockPriceStore) ?? {});
    });
  });
}

async function savePriceStore(store: RestockPriceStore): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [RESTOCK_STORAGE_KEY]: store }, resolve);
  });
}

async function closeFetchTab(): Promise<void> {
  // Cancel the per-shop timeout alarm (no-op if it doesn't exist).
  chrome.alarms.clear(FETCH_TIMEOUT_ALARM);
  if (activeFetchTabId !== null) {
    try {
      await chrome.tabs.remove(activeFetchTabId);
    } catch {
      // tab may have already been closed
    }
    activeFetchTabId = null;
  }
}

async function restorePreBatchTab(): Promise<void> {
  if (preBatchTabId === null) return;
  try {
    await chrome.tabs.update(preBatchTabId, { active: true });
    if (preBatchWindowId !== null) {
      await chrome.windows.update(preBatchWindowId, { focused: true });
    }
  } catch {
    // original tab may have been closed by the user
  }
  preBatchTabId = null;
  preBatchWindowId = null;
}

async function openNextShopTab(): Promise<void> {
  if (fetchIndex >= fetchQueue.length) {
    await saveFetchStatus({ active: false, current: null, done: fetchQueue.length, total: fetchQueue.length });
    await clearPersistedFetchState();
    fetchQueue = [];
    fetchIndex = 0;
    await restorePreBatchTab();
    return;
  }

  // Save the user's current tab once, at the very start of the batch.
  if (fetchIndex === 0 && preBatchTabId === null) {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    preBatchTabId = active?.id ?? null;
    preBatchWindowId = active?.windowId ?? null;
  }

  const shopId = fetchQueue[fetchIndex];
  const shop = getShopById(shopId);

  if (!shop) {
    fetchIndex++;
    return openNextShopTab();
  }

  await saveFetchStatus({
    active: true,
    current: shop.name,
    done: fetchIndex,
    total: fetchQueue.length,
  });

  // Open as active so the tab has a real viewport — required for
  // IntersectionObserver-based lazy loading to fire on scroll.
  // nat_extract=1 signals to the content script that this tab was opened
  // by the extension; without it the script won't run on manual visits.
  const tab = await chrome.tabs.create({
    url: `https://itemdb.com.br/restock/${shop.itemdbSlug}?nat_extract=1`,
    active: true,
  });

  activeFetchTabId = tab.id ?? null;

  // Persist now so the alarm handler has up-to-date state even if the
  // service worker is killed between here and when the alarm fires.
  await persistFetchState();

  // 2-minute safety net: large shops (1000+ items) need up to 90s to scroll;
  // the extractor always sends RESTOCK_PRICES_DATA before this fires for them.
  chrome.alarms.create(FETCH_TIMEOUT_ALARM, { delayInMinutes: 2 });
}

async function handleRestockData(shopId: string, items: ItemPriceEntry[]): Promise<void> {
  // The service worker may have been killed and restarted since the tab was
  // opened, wiping the in-memory queue. Recover from storage before advancing.
  if (fetchQueue.length === 0) {
    await restoreFetchState();
  }

  await closeFetchTab();

  const store = await loadPriceStore();
  const now = Date.now();

  const normalized: RestockPriceStore[string] = {
    fetchedAt: now,
    items: {},
  };

  for (const item of items) {
    const key = item.name.trim().toLowerCase().replace(/\s+/g, " ");
    normalized.items[key] = item;
  }

  store[shopId] = normalized;
  await savePriceStore(store);

  fetchIndex++;
  await persistFetchState();
  openNextShopTab();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // -------- GET ACTIVITIES --------
  if (message?.type === "GET_ACTIVITIES") {
    loadActivityState().then((stateMap) => {
      const now = Date.now();

      const activities = ACTIVITIES.map((definition) => {
        const state = stateMap[definition.id] ?? {
          enabled: true,
          notificationsEnabled: false,
        };

        const availability = computeAvailability({ definition, state }, now);

        return { definition, state, availability };
      });

      sendResponse({ activities });
    });

    return true;
  }

  // -------- MANUAL COMPLETION --------
  if (message?.type === "MARK_COMPLETED") {
    const { activityId } = message;

    const definition = ACTIVITIES.find((a) => a.id === activityId);
    if (!definition) return true;

    updateActivityState(activityId, (existing) => {
      if (definition.timingType === "DAILY_LIMIT") {
        return incrementUse(existing, definition.maxPerDay);
      }

      return {
        ...existing,
        lastCompletedAt: Date.now(),
      };
    }).then(() => sendResponse({ success: true }));

    return true;
  }

  // -------- AUTO COMPLETION (detectors) --------
  if (message?.type === "AUTO_MARK_COMPLETED") {
    const { activityId } = message;

    const definition = ACTIVITIES.find((a) => a.id === activityId);
    if (!definition) return true;

    updateActivityState(activityId, (existing) => {
      if (definition.timingType === "DAILY_LIMIT") {
        return {
          ...incrementUse(existing, definition.maxPerDay),
          notificationsEnabled: true,
          lastAvailabilityStatus: "LOCKED",
        };
      }

      // WINDOWED with maxPerDay > 1 tracks usesToday (same as DAILY_LIMIT)
      if (
        definition.timingType === "WINDOWED" &&
        definition.maxPerDay != null &&
        definition.maxPerDay > 1
      ) {
        return incrementUse(existing, definition.maxPerDay);
      }

      return markCompleted(existing);
    }).then(() => sendResponse({ success: true }));

    return true;
  }

  // -------- DAILY LIMIT INCREMENT (Money Tree shared pool) --------
  // Only "money_tree" is allowed here — secondhand_shoppe and rubbish_dump
  // both share this pool, so all three activities' counts are tracked under
  // the money_tree state key. Content scripts always send money_tree as the ID.
  if (message?.type === "INCREMENT_DAILY_COUNT") {
    const { activityId } = message;

    const ALLOWED_INCREMENT_IDS = new Set(["money_tree", "haunted_woods_hunt"]);

    if (!ALLOWED_INCREMENT_IDS.has(activityId)) {
      console.warn("[NAT] Blocked invalid increment:", activityId);
      return true;
    }

    const definition = ACTIVITIES.find((a) => a.id === activityId);
    if (!definition || definition.timingType !== "DAILY_LIMIT") return true;

    updateActivityState(activityId, (existing) =>
      incrementUse(existing, definition.maxPerDay)
    ).then(() => sendResponse({ success: true }));

    return true;
  }

  // -------- VARIABLE COOLDOWN --------
  if (message?.type === "SET_VARIABLE_COOLDOWN") {
    const { activityId, availableAt } = message;

    updateActivityState(activityId, (existing) => ({
      ...existing,
      lastCompletedAt: availableAt,
    })).then(() => sendResponse({ success: true }));

    return true;
  }

  // -------- FORCE LOCK --------
  if (message?.type === "AUTO_MARK_LOCKED") {
    const { activityId } = message;

    updateActivityState(activityId, (existing) => ({
      ...existing,
      lastCompletedAt: Date.now(),
    })).then(() => sendResponse({ success: true }));

    return true;
  }

  // -------- RESTOCK: START FETCH --------
  if (message?.type === "FETCH_RESTOCK_PRICES") {
    const { shopIds } = message as { shopIds: string[] };
    const validIds = shopIds.filter((id) => SHOPS.some((s) => s.id === id));
    if (validIds.length === 0) return true;

    // Tear down any previous in-flight batch before starting the new one.
    chrome.alarms.clear(FETCH_TIMEOUT_ALARM);
    if (activeFetchTabId !== null) {
      chrome.tabs.remove(activeFetchTabId).catch(() => {});
      activeFetchTabId = null;
    }

    fetchQueue = validIds;
    fetchIndex = 0;
    preBatchTabId = null;
    preBatchWindowId = null;

    openNextShopTab();
    sendResponse({ started: true });
    return true;
  }

  // -------- RESTOCK: PRICES FROM ITEMDB CONTENT SCRIPT --------
  if (message?.type === "RESTOCK_PRICES_DATA") {
    const { shopId, items } = message as { shopId: string; items: ItemPriceEntry[] };
    handleRestockData(shopId, items);
    return true;
  }

  // -------- TRAINING: IMMEDIATE COMPLETION CHECK --------
  // Content script calls this after saving fresh training data so notifications
  // fire as soon as the user visits the training page rather than waiting for
  // the next scheduler tick (up to 1 minute later).
  if (message?.type === "SYNC_TRAINING") {
    checkTrainingAndNotify().then(() => sendResponse({ ok: true }));
    return true;
  }

  // -------- DEV FORCE AVAILABLE --------
  if (message?.type === "DEV_FORCE_AVAILABLE") {
    const { activityId } = message;

    updateActivityState(activityId, (existing) => ({
      ...existing,
      lastAvailabilityStatus: "LOCKED",
      notificationsEnabled: true,
      lastCompletedAt: Date.now() - 10_000_000,
    })).then(() => sendResponse({ success: true }));

    return true;
  }
});

// ---------------- Reward Trackers ----------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type: unknown = message?.type;
  if (typeof type !== "string" || !type.startsWith("TRACKER_")) return;

  const done = (p: Promise<unknown>) => {
    p.then(
      (result) => sendResponse({ success: true, result }),
      (err) => {
        console.warn("[NAT] tracker error", err);
        sendResponse({ success: false });
      }
    );
    return true;
  };

  switch (type) {
    case "TRACKER_GET_ALL":
      return done(loadTrackerStore());
    case "TRACKER_RECORD":
      return done(recordTrackerEntry(message.payload));
    case "TRACKER_UNDO_LAST":
      return done(undoLastTrackerEntry(message.trackerId));
    case "TRACKER_DELETE_ENTRY":
      return done(deleteTrackerEntry(message.trackerId, message.entryId));
    case "TRACKER_RESET":
      return done(resetTracker(message.trackerId));
    case "TRACKER_UPDATE_SETTINGS":
      return done(updateTrackerSettings(message.trackerId, message.settings));
  }
});

// ---------------- Stamp Album ----------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "STAMPS_SYNC_PAGE") {
    syncStampPage(message.payload).then(
      () => sendResponse({ success: true }),
      () => sendResponse({ success: false })
    );
    return true;
  }
  if (message?.type === "STAMPS_MARK_OWNED") {
    markStampOwned(message.payload).then(
      () => sendResponse({ success: true }),
      () => sendResponse({ success: false })
    );
    return true;
  }
  if (message?.type === "STAMPS_RESET") {
    resetStampStore().then(() => sendResponse({ success: true }));
    return true;
  }
});
