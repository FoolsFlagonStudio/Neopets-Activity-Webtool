const NOTIFICATION_ID = "neopets-activity-ready";

export function notify(title: string, message: string): void {
  chrome.notifications.clear(NOTIFICATION_ID, () => {
    chrome.notifications.create(NOTIFICATION_ID, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon128.png"),
      title,
      message,
      priority: 0,
    });
  });

  setTimeout(() => {
    chrome.notifications.clear("neopets-activity-ready");
  }, 60_000);
}
