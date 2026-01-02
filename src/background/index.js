import { loadActivityState } from "./stateManager";

console.log("[Neopets Activity Tracker] Background service worker loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Neopets Activity Tracker] Installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_ACTIVITY_STATE") {
    loadActivityState().then((state) => {
      sendResponse({ state });
    });

    return true;
  }
});
