/**
 * Every notification gets a unique ID.
 *
 * Reusing one fixed ID meant that while the previous notification was still
 * sitting in the OS notification center (e.g. Windows Action Center), the new
 * one was treated as an *update* of it and never popped up. It also meant
 * activity and training notifications fired in the same tick replaced each
 * other.
 *
 * To keep the notification center tidy, older notifications from this
 * extension are cleared automatically when a new one is shown.
 */

const ID_PREFIX = "nat-";

/** Notifications newer than this are kept (e.g. one sent in the same tick). */
const KEEP_RECENT_MS = 60_000;

function makeId(): string {
  return `${ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createdAt(id: string): number | null {
  if (!id.startsWith(ID_PREFIX)) return null;
  const ts = parseInt(id.slice(ID_PREFIX.length), 10);
  return Number.isFinite(ts) ? ts : null;
}

/** Clear this extension's notifications older than KEEP_RECENT_MS. */
function purgeOldNotifications(): Promise<void> {
  return new Promise((resolve) => {
    chrome.notifications.getAll((all) => {
      const now = Date.now();
      for (const id of Object.keys(all ?? {})) {
        const ts = createdAt(id);
        // Also clears the legacy fixed-ID notification (ts === null).
        if (ts === null || now - ts > KEEP_RECENT_MS) {
          chrome.notifications.clear(id);
        }
      }
      resolve();
    });
  });
}

export async function notify(title: string, message: string): Promise<void> {
  await purgeOldNotifications();
  chrome.notifications.create(makeId(), {
    type: "basic",
    iconUrl: chrome.runtime.getURL("assets/icons/branding/128x128.png"),
    title,
    message,
    priority: 0,
  });
}

// Clicking a notification dismisses it.
chrome.notifications.onClicked.addListener((id) => {
  chrome.notifications.clear(id);
});
