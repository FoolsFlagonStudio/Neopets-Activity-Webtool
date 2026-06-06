import type { RestockPriceStore } from "../../types/restock";
import { getShopByTypeId } from "../../data/shops";
import { RESTOCK_STORAGE_KEY } from "../../types/restock";

const PROCESSED_ATTR = "data-nat-restock";

// ── Profit ratio thresholds ───────────────────────────────────────────────────
// ratio = resale / npc_shop_price
// great  ≥ 2.0x   (100%+ profit)
// good   ≥ 1.5x   (50–99% profit)
// ok     ≥ 1.0x   (0–49% profit)
// loss   <  1.0x  (at or below cost)

type Tier = "great" | "good" | "ok" | "loss" | "nodata";

function getTier(resale: number, shopPrice: number): Tier {
  if (shopPrice <= 0) return "nodata";
  const ratio = resale / shopPrice;
  if (ratio >= 2.0) return "great";
  if (ratio >= 1.5) return "good";
  if (ratio >= 1.0) return "ok";
  return "loss";
}

const TIER_STYLES: Record<Tier, string> = {
  great:  "background:#198754;color:#fff",
  good:   "background:#20c997;color:#fff",
  ok:     "background:#fd7e14;color:#fff",
  loss:   "background:#dc3545;color:#fff",
  nodata: "background:#6c757d;color:#fff",
};

function formatNp(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m NP`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k NP`;
  return `${value} NP`;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function injectStyles(): void {
  if (document.getElementById("nat-restock-styles")) return;
  const style = document.createElement("style");
  style.id = "nat-restock-styles";
  style.textContent = `
    .nat-badge {
      display: block;
      margin-top: 4px;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 700;
      font-family: Arial, sans-serif;
      line-height: 1.4;
      white-space: nowrap;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

function makeBadge(tier: Tier, label: string): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = "nat-badge";
  badge.style.cssText = TIER_STYLES[tier];
  badge.textContent = label;
  return badge;
}

// ── Storage (cached after first load) ────────────────────────────────────────

let priceStoreCache: RestockPriceStore | null = null;

async function loadPriceStore(): Promise<RestockPriceStore> {
  if (priceStoreCache) return priceStoreCache;
  return new Promise((resolve) => {
    chrome.storage.local.get([RESTOCK_STORAGE_KEY], (result) => {
      priceStoreCache = (result[RESTOCK_STORAGE_KEY] as RestockPriceStore) ?? {};
      resolve(priceStoreCache);
    });
  });
}

// ── Item extraction ───────────────────────────────────────────────────────────
// Neopets new shop layout:
//   <div class="shop-item">
//     <div class="item-img" data-name="Lime Snow Puff" data-price="418" ...></div>
//     <p class="item-name"><b>Lime Snow Puff</b></p>
//     <p class="item-stock">16 in stock</p>
//     <p class="item-stock">Cost: 418 NP</p>
//   </div>

function extractItemName(card: HTMLElement): string | null {
  // data-name on .item-img is the authoritative source
  const imgDiv = card.querySelector<HTMLElement>(".item-img");
  if (imgDiv?.dataset.name) return imgDiv.dataset.name;

  // Fallback: bold text inside p.item-name
  const bold = card.querySelector<HTMLElement>("p.item-name b, p.item-name strong");
  if (bold?.textContent?.trim()) return bold.textContent.trim();

  return null;
}

function extractShopPrice(card: HTMLElement): number | null {
  // data-price is already a clean integer — no NP string parsing needed
  const imgDiv = card.querySelector<HTMLElement>(".item-img");
  if (imgDiv?.dataset.price) {
    const price = parseInt(imgDiv.dataset.price, 10);
    if (!isNaN(price)) return price;
  }

  // Fallback: parse "Cost: NNN NP" text
  const costEl = Array.from(card.querySelectorAll("p.item-stock")).find((p) =>
    /Cost/i.test(p.textContent ?? "")
  );
  if (costEl) {
    const match = (costEl.textContent ?? "").match(/[\d,]+/);
    if (match) return parseInt(match[0].replace(/,/g, ""), 10);
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

let overlayInitialized = false;

export async function applyShopOverlay(): Promise<void> {
  if (!location.pathname.includes("/objects.phtml")) return;
  const params = new URLSearchParams(location.search);
  if (params.get("type") !== "shop") return;

  const typeId = parseInt(params.get("obj_type") ?? "", 10);
  if (isNaN(typeId)) return;

  const shop = getShopByTypeId(typeId);
  if (!shop) return;

  const priceStore = await loadPriceStore();
  const cache = priceStore[shop.id];

  injectStyles();
  overlayInitialized = true;

  const cards = document.querySelectorAll<HTMLElement>(".shop-item");

  for (const card of cards) {
    if (card.getAttribute(PROCESSED_ATTR)) continue;
    card.setAttribute(PROCESSED_ATTR, "1");

    const name = extractItemName(card);
    if (!name) continue;

    const shopPrice = extractShopPrice(card);
    const key = normalizeName(name);

    let tier: Tier;
    let label: string;

    if (!cache || cache.items[key] === undefined) {
      tier = "nodata";
      label = "No data";
    } else {
      const entry = cache.items[key];
      if (entry.price === null) {
        tier = "nodata";
        label = "No price";
      } else if (shopPrice !== null) {
        tier = getTier(entry.price, shopPrice);
        label = formatNp(entry.price);
      } else {
        tier = "nodata";
        label = formatNp(entry.price);
      }
    }

    const badge = makeBadge(tier, label);

    // Append badge after the "Cost: NNN NP" paragraph
    const costEl = Array.from(card.querySelectorAll("p.item-stock")).find((p) =>
      /Cost/i.test(p.textContent ?? "")
    );
    if (costEl) {
      costEl.insertAdjacentElement("afterend", badge);
    } else {
      card.appendChild(badge);
    }
  }
}

// Lightweight re-apply called on DOM mutations. Exits fast once all cards
// are processed; only does real work if new .shop-item cards appeared.
export function reapplyShopOverlay(): void {
  if (!overlayInitialized) return;
  const hasUnprocessed = document.querySelector(`.shop-item:not([${PROCESSED_ATTR}])`);
  if (!hasUnprocessed) return;
  applyShopOverlay();
}
