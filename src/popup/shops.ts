import { SHOPS } from "../data/shops";

const NEOPETS_SHOP_URL = (typeId: number) =>
  `https://www.neopets.com/objects.phtml?type=shop&obj_type=${typeId}`;

export function initShopsPage(): void {
  const root = document.getElementById("shop-list");
  if (!root) return;

  // Group shops by category, preserving insertion order from SHOPS array.
  const grouped = new Map<string, typeof SHOPS>();
  for (const shop of SHOPS) {
    if (!grouped.has(shop.category)) grouped.set(shop.category, []);
    grouped.get(shop.category)!.push(shop);
  }

  for (const [category, shops] of grouped) {
    const section = document.createElement("section");
    section.className = "mb-3";

    const header = document.createElement("h5");
    header.className = "category-header text-muted";
    header.textContent = category;

    const grid = document.createElement("div");
    grid.className = "shop-grid";

    for (const shop of shops) {
      const btn = document.createElement("button");
      btn.className = "shop-btn";
      btn.textContent = shop.name;
      btn.addEventListener("click", () =>
        chrome.tabs.create({ url: NEOPETS_SHOP_URL(shop.neopetsTypeId) })
      );
      grid.appendChild(btn);
    }

    section.append(header, grid);
    root.appendChild(section);
  }
}
