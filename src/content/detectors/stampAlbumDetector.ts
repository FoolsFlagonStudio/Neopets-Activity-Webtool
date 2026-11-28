/**
 * Stamp album detector (read-only).
 *
 * When the user views one of their OWN album pages
 * (/stamps.phtml?type=album&page_id=N), records which of the 25 slots are
 * filled and sends it to the background. Other users' albums are ignored.
 *
 * Nothing is fetched: pages sync only as the user visits them.
 */
import { SLOTS_PER_PAGE, imgKey } from "../../data/stamps";
import type { OwnedSlot, StampPageSync } from "../../types/stamps";

let syncedThisPage = false;

/** Logged-in username from the header ("Welcome, <a ...?user=NAME>"). */
function currentUser(): string | null {
  const link = document.querySelector<HTMLAnchorElement>(
    'td.user a[href*="userlookup.phtml?user="]'
  );
  const m = link?.href.match(/user=([^&]+)/);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}

function isOwnAlbum(params: URLSearchParams): boolean {
  const owner = (params.get("owner") ?? "").trim().toLowerCase();
  if (!owner) return true;
  const me = currentUser();
  return me !== null && owner === me;
}

/** The 25 slot images, in album order. */
function getSlotImages(): HTMLImageElement[] | null {
  const content = document.querySelector("td.content") ?? document.body;
  for (const table of content.querySelectorAll("table")) {
    const imgs = [...table.querySelectorAll<HTMLImageElement>("td > img")].filter(
      (img) => /\/items\/|no_stamp\.gif/i.test(img.getAttribute("src") ?? "")
    );
    // Make sure we have the album grid itself, not an outer layout table.
    if (imgs.length === SLOTS_PER_PAGE && !table.querySelector("table")) {
      return imgs;
    }
  }
  return null;
}

/** "You have <b>6</b> stamps on this page!" */
function statedCount(): number | null {
  const m = (document.body.textContent ?? "").match(
    /You have\s+(\d+)\s+stamps? on this page/i
  );
  return m ? parseInt(m[1], 10) : null;
}

export function detectStampAlbum(): void {
  if (syncedThisPage) return;
  if (location.pathname !== "/stamps.phtml") return;

  const params = new URLSearchParams(location.search);
  if (params.get("type") !== "album") return;

  const pageId = parseInt(params.get("page_id") ?? "", 10);
  if (!Number.isFinite(pageId) || pageId < 1) return; // 0 = front page
  if (!isOwnAlbum(params)) return;

  const imgs = getSlotImages();
  if (!imgs) return;

  const owned: Record<string, OwnedSlot> = {};
  imgs.forEach((img, i) => {
    const src = img.getAttribute("src") ?? "";
    if (/no_stamp\.gif/i.test(src)) return;
    const name = (img.getAttribute("title") || img.getAttribute("alt") || "").trim();
    if (!name) return;
    owned[String(i + 1)] = { name, img: imgKey(src) };
  });

  // Sanity check against the page's own count when present.
  const stated = statedCount();
  if (stated !== null && stated !== Object.keys(owned).length) {
    console.warn("[NAT] Stamp count mismatch, not syncing", {
      pageId,
      stated,
      parsed: Object.keys(owned).length,
    });
    return;
  }

  syncedThisPage = true;
  const payload: StampPageSync = { pageId, owned };
  chrome.runtime.sendMessage({ type: "STAMPS_SYNC_PAGE", payload });
}
