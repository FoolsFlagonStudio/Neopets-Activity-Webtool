import type { RestockPriceStore } from "../../types/restock";
import { RESTOCK_STORAGE_KEY } from "../../types/restock";

const ANNOTATED_ATTR = "data-nat-priced";

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatNp(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m NP`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k NP`;
  return `${value} NP`;
}

// Build a flat name→price map across all shops in the store.
function buildPriceMap(store: RestockPriceStore): Map<string, number> {
  const map = new Map<string, number>();
  for (const shopData of Object.values(store)) {
    for (const [key, entry] of Object.entries(shopData.items ?? {})) {
      if (entry.price !== null && !map.has(key)) {
        map.set(key, entry.price);
      }
    }
  }
  return map;
}

function injectStyles(): void {
  if (document.getElementById("nat-pricing-styles")) return;
  const style = document.createElement("style");
  style.id = "nat-pricing-styles";
  style.textContent = `
    .nat-price-hint {
      display: block;
      margin-top: 3px;
      font-size: 10px;
      white-space: nowrap;
    }
    .nat-price-hint-label {
      color: #555;
    }
    .nat-price-set-btn {
      font-size: 10px;
      padding: 1px 5px;
      border: 1px solid #888;
      border-radius: 3px;
      background: #e8e8ff;
      color: #000080;
      cursor: pointer;
      margin-left: 4px;
    }
    .nat-price-set-btn:hover {
      background: #c8c8ff;
    }
  `;
  document.head.appendChild(style);
}

export async function applyShopPricingOverlay(): Promise<void> {
  if (!location.pathname.includes("/market.phtml")) return;
  if (new URLSearchParams(location.search).get("type") !== "your") return;

  const result = await new Promise<{ [k: string]: unknown }>((resolve) =>
    chrome.storage.local.get([RESTOCK_STORAGE_KEY], resolve)
  );

  const store = (result[RESTOCK_STORAGE_KEY] as RestockPriceStore) ?? {};
  const priceMap = buildPriceMap(store);

  if (priceMap.size === 0) return; // no price data yet — nothing to show

  injectStyles();

  const priceInputs = document.querySelectorAll<HTMLInputElement>(
    'input[type="text"][name^="cost_"]'
  );

  for (const input of priceInputs) {
    if (input.hasAttribute(ANNOTATED_ATTR)) continue;
    input.setAttribute(ANNOTATED_ATTR, "1");

    const row = input.closest("tr");
    if (!row) continue;

    // Item name is in the first <td>'s <b> tag
    const tds = row.querySelectorAll<HTMLTableCellElement>("td");
    if (tds.length === 0) continue;
    const nameEl = tds[0].querySelector("b");
    if (!nameEl) continue;

    const name = nameEl.textContent?.trim() ?? "";
    if (!name) continue;

    const key = normalizeName(name);
    const marketPrice = priceMap.get(key);
    if (marketPrice == null || marketPrice <= 0) continue;

    // Clamp to the field's max (999,999)
    const fillValue = Math.min(marketPrice, 999_999);

    const hint = document.createElement("span");
    hint.className = "nat-price-hint";

    const label = document.createElement("span");
    label.className = "nat-price-hint-label";
    label.textContent = formatNp(marketPrice);

    const btn = document.createElement("button");
    btn.type = "button"; // never submit the form
    btn.className = "nat-price-set-btn";
    btn.textContent = "Set";
    btn.title = `Set price to ${fillValue.toLocaleString()} NP (itemdb market value)`;
    btn.addEventListener("click", () => {
      input.value = String(fillValue);
      input.focus();
    });

    hint.append(label, btn);
    input.insertAdjacentElement("afterend", hint);
  }
}
