import type { ItemPriceEntry } from "../../types/restock";
import { getShopBySlug } from "../../data/shops";

const INITIAL_WAIT_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 300;
// How long to wait after each scroll for React to render the new section.
// itemdb loads one rarity tier at a time via IntersectionObserver.
const SCROLL_SETTLE_MS = 2_000;
// Consider loading done when item count is unchanged this many times in a row.
const STABLE_ROUNDS_REQUIRED = 4;
const SCROLL_TIMEOUT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNpAmount(text: string): number | null {
  const match = text.replace(/[▲▼△▽]/g, "").match(/[\d,]+/);
  if (!match) return null;
  const value = parseInt(match[0].replace(/,/g, ""), 10);
  return isNaN(value) ? null : value;
}

// ── DOM extraction helpers ────────────────────────────────────────────────────

function collectVisibleItems(into: Map<string, ItemPriceEntry>): void {
  const now = Date.now();
  for (const container of document.querySelectorAll<Element>(".menu-trigger")) {
    const nameEl = container.querySelector<HTMLElement>("p");
    const priceEl = container.querySelector<HTMLElement>(".chakra-badge");
    if (!nameEl) continue;

    const name = nameEl.textContent?.trim() ?? "";
    if (!name) continue;
    const key = name.toLowerCase();

    // Never overwrite a captured price with null — keep the best value we've seen.
    if (!into.has(key) || (into.get(key)!.price === null && priceEl)) {
      into.set(key, {
        name,
        price: priceEl ? parseNpAmount(priceEl.textContent ?? "") : null,
        lastUpdated: now,
      });
    }
  }
}

// ── __NEXT_DATA__ for name discovery ─────────────────────────────────────────
// Gives us the item names from SSR. Prices always come from DOM (.chakra-badge).

interface RawItem {
  name: string;
  [key: string]: unknown;
}

function findLargestItemArray(obj: unknown, depth = 0): RawItem[] {
  if (depth > 10 || !obj || typeof obj !== "object") return [];
  let best: RawItem[] = [];
  if (Array.isArray(obj)) {
    const candidates = obj.filter(
      (x): x is RawItem =>
        !!x && typeof x === "object" && !Array.isArray(x) &&
        typeof (x as RawItem).name === "string" &&
        (x as RawItem).name.length > 1 &&
        (x as RawItem).name.length < 100
    );
    if (candidates.length > best.length) best = candidates;
    for (const v of obj) {
      const sub = findLargestItemArray(v, depth + 1);
      if (sub.length > best.length) best = sub;
    }
  } else {
    for (const v of Object.values(obj as object)) {
      const sub = findLargestItemArray(v, depth + 1);
      if (sub.length > best.length) best = sub;
    }
  }
  return best;
}

function tryNextDataNames(): string[] {
  const el = document.getElementById("__NEXT_DATA__");
  if (!el?.textContent) return [];
  try {
    const parsed = JSON.parse(el.textContent);
    const items = findLargestItemArray(parsed);
    if (items.length >= 5) {
      console.log(`[NAT] itemdb: __NEXT_DATA__ has ${items.length} named items`);
      return items.map((r) => r.name);
    }
  } catch {
    // ignore
  }
  return [];
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function extractAndReport(): Promise<void> {
  const slug = location.pathname.split("/restock/")[1]?.split("/")[0];
  if (!slug) return;

  const shop = getShopBySlug(slug);
  if (!shop) {
    console.warn(`[NAT] itemdb: no shop matched slug "${slug}"`);
    return;
  }

  // Collect item names from SSR (instant, no DOM wait needed).
  const nextDataNames = tryNextDataNames();

  // Wait for first items to appear in the DOM.
  const initialDeadline = Date.now() + INITIAL_WAIT_TIMEOUT_MS;
  while (document.querySelectorAll(".menu-trigger").length < 3) {
    if (Date.now() > initialDeadline) {
      console.warn("[NAT] itemdb: timed out waiting for initial items");
      break;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  // Scroll incrementally (one viewport height at a time) so every item in every
  // rarity section passes through the viewport and triggers its IO callback.
  // Jumping straight to the bottom skips the middle of large sections.
  const collected = new Map<string, ItemPriceEntry>();
  const scrollDeadline = Date.now() + SCROLL_TIMEOUT_MS;
  let currentY = 0;
  let lastCount = -1;
  let stableRounds = 0;

  while (Date.now() < scrollDeadline) {
    collectVisibleItems(collected);

    const viewportH = window.innerHeight || 800;
    currentY += viewportH;
    window.scrollTo(0, currentY);
    await sleep(SCROLL_SETTLE_MS);

    const count = document.querySelectorAll(".menu-trigger").length;

    if (count > lastCount) {
      // New items appeared — reset stability counter.
      stableRounds = 0;
      lastCount = count;
    } else if (currentY >= document.body.scrollHeight) {
      // We're at or past the bottom and count hasn't grown.
      stableRounds++;
      if (stableRounds >= STABLE_ROUNDS_REQUIRED) break;
      // Keep looping a few more rounds in case a slow batch is still loading.
    }
    // If count is the same but we haven't reached the bottom yet, keep scrolling.
  }

  // Final capture at bottom, then scroll to top and capture again to catch
  // any items whose sections load from the top downward.
  collectVisibleItems(collected);
  window.scrollTo(0, 0);
  await sleep(SCROLL_SETTLE_MS);
  collectVisibleItems(collected);

  console.log(`[NAT] itemdb: scroll done, ${collected.size} items collected`);

  // Build final list: merge __NEXT_DATA__ names (may include items not yet
  // rendered) with DOM prices. Items only in DOM are added too.
  const now = Date.now();
  const seen = new Set<string>();
  const finalItems: ItemPriceEntry[] = [];

  for (const name of nextDataNames) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    finalItems.push(collected.get(key) ?? { name, price: null, lastUpdated: now });
  }

  for (const [key, entry] of collected) {
    if (!seen.has(key)) {
      seen.add(key);
      finalItems.push(entry);
    }
  }

  console.log(`[NAT] itemdb: sending ${finalItems.length} items for ${shop.name}`);

  chrome.runtime.sendMessage({
    type: "RESTOCK_PRICES_DATA",
    shopId: shop.id,
    items: finalItems,
  });
}
