import { ACTIVITIES } from "../data/activities.js";
import { loadActivityState, saveActivityState } from "./stateManager.js";
import {
  updateActivityState,
  markCompleted,
  incrementUse,
} from "./stateUpdates.js";
import { computeAvailability } from "./availabilityEngine.js";
import { startScheduler } from "./scheduler";
import { getDateKeyInTimezone } from "../utils/npt";

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

  // -------- DAILY LIMIT INCREMENT (Money Tree, etc.) --------
  if (message?.type === "INCREMENT_DAILY_COUNT") {
    const { activityId } = message;

    const ALLOWED_INCREMENT_IDS = new Set([
      "money_tree",
      // add shared pool IDs ONLY
    ]);

    if (!ALLOWED_INCREMENT_IDS.has(activityId)) {
      console.warn("[NAT] Blocked invalid increment:", activityId);
      return true;
    }

    loadActivityState().then((stateMap) => {
      const definition = ACTIVITIES.find((a) => a.id === activityId);
      if (!definition || definition.timingType !== "DAILY_LIMIT") return;

      const existing = stateMap[activityId] ?? {
        enabled: true,
        notificationsEnabled: false,
        usesToday: 0,
      };

      const today = getDateKeyInTimezone(Date.now(), "America/Los_Angeles");

      let usesToday =
        existing.lastUsedDay === today ? existing.usesToday ?? 0 : 0;

      usesToday = Math.min(usesToday + 1, definition.maxPerDay);

      stateMap[activityId] = {
        ...existing,
        usesToday,
        lastUsedDay: today,
        lastCompletedAt: Date.now(),
      };

      saveActivityState(stateMap).then(() => {
        sendResponse({ success: true });
      });
    });

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

    const definition = ACTIVITIES.find((a) => a.id === activityId);
    if (!definition) return true;

    updateActivityState(activityId, (existing) => {
      if (definition.timingType === "DAILY_LIMIT") {
        return {
          ...existing,
          lastCompletedAt: Date.now(),
        };
      }

      return {
        ...existing,
        lastCompletedAt: Date.now(),
      };
    }).then(() => sendResponse({ success: true }));

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
