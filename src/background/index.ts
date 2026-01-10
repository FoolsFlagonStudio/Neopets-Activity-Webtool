import { ACTIVITIES } from "../data/activities.js";
import { loadActivityState, saveActivityState } from "./stateManager.js";
import { computeAvailability } from "./availabilityEngine.js";
import { startScheduler } from "./scheduler";
import { getDateKeyInTimezone } from "../utils/npt";

// ---------------- Lifecycle ----------------

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Neopets Activity Tracker] Installed");
  startScheduler();
});

chrome.runtime.onStartup.addListener(() => {
  startScheduler();
});

console.log("[Neopets Activity Tracker] Background service worker loaded");

// ---------------- Message Handler ----------------

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.url.includes("/halloween/process_bagatelle.phtml")) {
      console.log("[NAT] Bagatelle detected via webRequest");

      const stateMap = await loadActivityState();
      const existing = stateMap["bagatelle"] ?? {
        enabled: true,
        notificationsEnabled: false,
        usesToday: 0,
      };

      stateMap["bagatelle"] = {
        ...existing,
        lastCompletedAt: Date.now(),
        usesToday: (existing.usesToday ?? 0) + 1,
      };

      await saveActivityState(stateMap);
    }
  },
  {
    urls: ["https://www.neopets.com/halloween/process_bagatelle.phtml*"],
  }
);

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.url.includes("/halloween/process_corkgun.phtml")) {
      console.log("[NAT] Cork Gun Gallery detected via webRequest");

      const stateMap = await loadActivityState();
      const existing = stateMap["cork_gun_gallery"] ?? {
        enabled: true,
        notificationsEnabled: false,
        usesToday: 0,
      };

      stateMap["cork_gun_gallery"] = {
        ...existing,
        lastCompletedAt: Date.now(),
        usesToday: (existing.usesToday ?? 0) + 1,
      };

      await saveActivityState(stateMap);
    }
  },
  {
    urls: ["https://www.neopets.com/halloween/process_corkgun.phtml*"],
  }
);

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (
      details.url.includes("/halloween/process_cocoshy.phtml") &&
      details.url.includes("coconut=")
    ) {
      console.log("[NAT] Coconut Shy play detected via webRequest");

      const stateMap = await loadActivityState();
      const existing = stateMap["coconut_shy"] ?? {
        enabled: true,
        notificationsEnabled: false,
        usesToday: 0,
      };

      stateMap["coconut_shy"] = {
        ...existing,
        lastCompletedAt: Date.now(),
        usesToday: (existing.usesToday ?? 0) + 1,
      };

      await saveActivityState(stateMap);
    }
  },
  {
    urls: ["https://www.neopets.com/halloween/process_cocoshy.phtml*"],
  }
);

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (
      details.url.includes(
        "ncmall.neopets.com/games/giveaway/process_giveaway.phtml"
      )
    ) {
      console.log("[NAT] Qasalan Expellibox detected via auto-play URL");

      const stateMap = await loadActivityState();
      const existing = stateMap["qasalan_expellibox"] ?? {
        enabled: true,
        notificationsEnabled: false,
      };

      stateMap["qasalan_expellibox"] = {
        ...existing,
        lastCompletedAt: Date.now(),
        notificationsEnabled: true,
        lastAvailabilityStatus: "LOCKED",
      };

      await saveActivityState(stateMap);
    }
  },
  {
    urls: ["*://ncmall.neopets.com/games/giveaway/process_giveaway.phtml*"],
  }
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

        return {
          definition,
          state,
          availability,
        };
      });

      sendResponse({ activities });
    });

    return true;
  }

  // -------- MANUAL COMPLETION --------
  if (message?.type === "MARK_COMPLETED") {
    const { activityId } = message;

    loadActivityState().then((stateMap) => {
      const existing = stateMap[activityId] ?? {
        enabled: true,
        notificationsEnabled: false,
        usesToday: 0,
      };

      const definition = ACTIVITIES.find((a) => a.id === activityId);

      if (!definition) return;

      // DAILY_LIMIT activities (Grumpy Old King, Bagatelle, etc.)
      if (definition.timingType === "DAILY_LIMIT") {
        stateMap[activityId] = {
          ...existing,
          usesToday: (existing.usesToday ?? 0) + 1,
        };
      } else {
        // Everything else
        stateMap[activityId] = {
          ...existing,
          lastCompletedAt: Date.now(),
        };
      }

      saveActivityState(stateMap).then(() => {
        sendResponse({ success: true });
      });
    });

    return true;
  }

  // -------- AUTO COMPLETION (detectors) --------
  if (message?.type === "AUTO_MARK_COMPLETED") {
    const { activityId } = message;

    loadActivityState().then((stateMap) => {
      const existing = stateMap[activityId] ?? {
        enabled: true,
        notificationsEnabled: false,
        usesToday: 0,
      };

      const definition = ACTIVITIES.find((a) => a.id === activityId);
      if (!definition) return;

      // DAILY_LIMIT (wheels like Knowledge, Mediocrity, etc.)
      if (definition.timingType === "DAILY_LIMIT") {
        stateMap[activityId] = {
          ...existing,
          usesToday: (existing.usesToday ?? 0) + 1,
          lastCompletedAt: Date.now(),
          notificationsEnabled: true,
          lastAvailabilityStatus: "LOCKED",
        };
      } else {
        // Everything else
        stateMap[activityId] = {
          ...existing,
          lastCompletedAt: Date.now(),
          notificationsEnabled: true,
          lastAvailabilityStatus: "LOCKED",
        };
      }

      saveActivityState(stateMap).then(() => {
        sendResponse({ success: true });
      });
    });

    return true;
  }

  // -------- DAILY LIMIT INCREMENT (Money Tree, etc.) --------
  if (message?.type === "INCREMENT_DAILY_COUNT") {
    const { activityId } = message;

    loadActivityState().then((stateMap) => {
      const existing = stateMap[activityId] ?? {
        enabled: true,
        notificationsEnabled: false,
        usesToday: 0,
      };

      const today = getDateKeyInTimezone(Date.now(), "America/Los_Angeles");

      let usesToday = existing.usesToday ?? 0;

      if (existing.lastUsedDay !== today) {
        usesToday = 0;
      }

      stateMap[activityId] = {
        ...existing,
        usesToday: usesToday + 1,
        lastUsedDay: today,
        lastCompletedAt: Date.now(),
      };

      saveActivityState(stateMap).then(() => {
        sendResponse({ success: true });
      });
    });

    return true;
  }

  if (message?.type === "SET_VARIABLE_COOLDOWN") {
    const { activityId, availableAt } = message;

    loadActivityState().then((stateMap) => {
      const existing = stateMap[activityId] ?? {
        enabled: true,
        notificationsEnabled: true,
      };

      stateMap[activityId] = {
        ...existing,
        lastCompletedAt: availableAt,
      };

      saveActivityState(stateMap).then(() => {
        sendResponse({ success: true });
      });
    });

    return true;
  }
});
