import { ACTIVITIES } from "../data/activities.js";
import { loadActivityState } from "./stateManager.js";
import {
  updateActivityState,
  markCompleted,
  incrementUse,
} from "./stateUpdates.js";
import { computeAvailability } from "./availabilityEngine.js";
import { startScheduler } from "./scheduler";
import { SHOPS, getShopById } from "../data/shops";
import type { ItemPriceEntry, RestockPriceStore, FetchStatus } from "../types/restock";
import { RESTOCK_STORAGE_KEY, FETCH_STATUS_KEY } from "../types/restock";

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

let fetchQueue: string[] = [];
let fetchIndex = 0;
let activeFetchTabId: number | null = null;
let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null;
// The tab the user was on before the batch started — restored when done.
let preBatchTabId: number | null = null;
let preBatchWindowId: number | null = null;

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
  if (fetchTimeoutId !== null) {
    clearTimeout(fetchTimeoutId);
    fetchTimeoutId = null;
  }
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

  // Safety timeout — 60s per shop (initial load + scroll settle)
  fetchTimeoutId = setTimeout(async () => {
    console.warn(`[NAT] Restock fetch timeout for ${shop.name}`);
    await closeFetchTab();
    fetchIndex++;
    openNextShopTab();
  }, 60_000);
}

async function handleRestockData(shopId: string, items: ItemPriceEntry[]): Promise<void> {
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

    const ALLOWED_INCREMENT_IDS = new Set(["money_tree"]);

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

    // Reset state and start sequential fetch
    fetchQueue = validIds;
    fetchIndex = 0;
    activeFetchTabId = null;

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
