console.log("[Neopets Activity Tracker] Background service worker loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Neopets Activity Tracker] Installed");
});