import { ACTIVITIES } from "../data/activities.js";
import { loadActivityState, saveActivityState } from "./stateManager.js";
import { computeAvailability } from "./availabilityEngine.js";

console.log("[Neopets Activity Tracker] Background service worker loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

  if (message?.type === "MARK_COMPLETED") {
    const { activityId } = message;

    loadActivityState().then((stateMap) => {
      const existing = stateMap[activityId] ?? {
        enabled: true,
        notificationsEnabled: false,
      };

      stateMap[activityId] = {
        ...existing,
        lastCompletedAt: Date.now(),
        usesToday: (existing.usesToday ?? 0) + 1,
      };

      saveActivityState(stateMap).then(() => {
        sendResponse({ success: true });
      });
    });

    return true;
  }
});
