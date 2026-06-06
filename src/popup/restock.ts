import { SHOPS, groupedShops } from "../data/shops";
import type { FetchStatus, RestockPriceStore } from "../types/restock";
import { RESTOCK_STORAGE_KEY, FETCH_STATUS_KEY } from "../types/restock";

const SELECTED_SHOPS_KEY = "restockSelectedShops";

// ── Persistence ───────────────────────────────────────────────────────────────

function loadSelectedShops(): Set<string> {
  try {
    const raw = localStorage.getItem(SELECTED_SHOPS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : SHOPS.map((s) => s.id));
  } catch {
    return new Set(SHOPS.map((s) => s.id));
  }
}

function saveSelectedShops(ids: Set<string>): void {
  localStorage.setItem(SELECTED_SHOPS_KEY, JSON.stringify([...ids]));
}

function loadPriceStore(): Promise<RestockPriceStore> {
  return new Promise((resolve) => {
    chrome.storage.local.get([RESTOCK_STORAGE_KEY], (result) => {
      resolve((result[RESTOCK_STORAGE_KEY] as RestockPriceStore) ?? {});
    });
  });
}

function loadFetchStatus(): Promise<FetchStatus | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([FETCH_STATUS_KEY], (result) => {
      resolve((result[FETCH_STATUS_KEY] as FetchStatus) ?? null);
    });
  });
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatRelativeTime(ms: number): string {
  const minutes = Math.floor((Date.now() - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderShopSelector(
  selected: Set<string>,
  priceStore: RestockPriceStore
): void {
  const container = document.getElementById("shop-selector");
  if (!container) return;

  container.innerHTML = "";
  const groups = groupedShops();

  for (const [category, shops] of Object.entries(groups)) {
    const details = document.createElement("details");
    details.open = true;
    details.className = "mb-2 shop-group";

    const summary = document.createElement("summary");
    summary.className = "shop-group-summary";
    summary.textContent = category;
    details.appendChild(summary);

    const list = document.createElement("div");
    list.className = "ps-2 pt-1";

    for (const shop of shops) {
      const cache = priceStore[shop.id];
      const lastFetched = cache ? formatRelativeTime(cache.fetchedAt) : null;

      const row = document.createElement("label");
      row.className = "shop-row d-flex align-items-center gap-2";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = shop.id;
      checkbox.checked = selected.has(shop.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selected.add(shop.id);
        } else {
          selected.delete(shop.id);
        }
        saveSelectedShops(selected);
      });

      const nameSpan = document.createElement("span");
      nameSpan.className = "shop-name flex-grow-1";
      nameSpan.textContent = shop.name;

      row.appendChild(checkbox);
      row.appendChild(nameSpan);

      if (lastFetched) {
        const ts = document.createElement("span");
        ts.className = "shop-ts text-muted";
        ts.textContent = lastFetched;
        row.appendChild(ts);
      }

      list.appendChild(row);
    }

    details.appendChild(list);
    container.appendChild(details);
  }
}

function setFetchStatusText(text: string): void {
  const el = document.getElementById("fetch-status");
  if (el) el.textContent = text;
}

function setRefreshButtonState(active: boolean): void {
  const btn = document.getElementById("refresh-prices-btn") as HTMLButtonElement | null;
  if (!btn) return;
  btn.disabled = active;
  btn.textContent = active ? "Fetching…" : "Refresh Prices";
}

async function syncUiWithStatus(): Promise<void> {
  const status = await loadFetchStatus();
  if (!status || !status.active) {
    setRefreshButtonState(false);
    if (status && status.total > 0 && !status.active) {
      setFetchStatusText(`Updated ${status.total} shop${status.total !== 1 ? "s" : ""}`);
    } else {
      setFetchStatusText("");
    }
    return;
  }

  setRefreshButtonState(true);
  setFetchStatusText(
    `Fetching ${status.current ?? "…"} (${status.done + 1} / ${status.total})`
  );
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initRestockPage(): Promise<void> {
  const selected = loadSelectedShops();
  const priceStore = await loadPriceStore();

  renderShopSelector(selected, priceStore);
  await syncUiWithStatus();

  // Select-all / select-none
  document.getElementById("select-all-btn")?.addEventListener("click", () => {
    SHOPS.forEach((s) => selected.add(s.id));
    saveSelectedShops(selected);
    renderShopSelector(selected, priceStore);
  });

  document.getElementById("select-none-btn")?.addEventListener("click", () => {
    selected.clear();
    saveSelectedShops(selected);
    renderShopSelector(selected, priceStore);
  });

  // Refresh button
  document.getElementById("refresh-prices-btn")?.addEventListener("click", () => {
    const ids = [...selected];
    if (ids.length === 0) {
      setFetchStatusText("No shops selected.");
      return;
    }

    setRefreshButtonState(true);
    setFetchStatusText("Starting…");

    chrome.runtime.sendMessage({ type: "FETCH_RESTOCK_PRICES", shopIds: ids });
  });

  // React to storage changes so the popup updates while a fetch is running
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes[FETCH_STATUS_KEY]) {
      syncUiWithStatus();
    }

    if (changes[RESTOCK_STORAGE_KEY]) {
      loadPriceStore().then((store) => {
        renderShopSelector(selected, store);
      });
    }
  });
}
