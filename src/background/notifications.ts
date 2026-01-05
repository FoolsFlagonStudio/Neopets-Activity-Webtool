export function notify(title: string, message: string): void {
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("assets/icons/icon128.png"),
    title,
    message,
    priority: 1,
  });
}
