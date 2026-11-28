import {
  PAGE_IDS,
  SLOTS_PER_PAGE,
  STALE_AFTER_MS,
  STAMP_STORAGE_KEY,
  albumUrl,
  getRefPage,
  itemImageUrl,
  normalizeName,
} from "../data/stamps";
import type { StampAlbumStore, SyncedPage } from "../types/stamps";

type Filter = "all" | "incomplete" | "unsynced";

interface SlotView {
  position: number;
  name: string | null; // null = unknown (page newer than bundled data)
  img: string | null;
  rarity: number | null;
  owned: boolean;
}

interface PageView {
  id: number;
  name: string;
  synced: SyncedPage | undefined;
  stale: boolean;
  slots: SlotView[]; // released slots only
  owned: number;
  total: number; // released items (or 25 when unknown)
  hasReference: boolean;
}

let store: StampAlbumStore = { pages: {} };
const expanded = new Set<number>();
let filter: Filter = "all";
let search = "";
let listener: ((c: Record<string, chrome.storage.StorageChange>, a: string) => void) | null = null;

/* ---------------- helpers ---------------- */

type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

function openTab(url: string): void {
  chrome.tabs.create({ url });
}

function link(text: string, url: string, cls = ""): HTMLAnchorElement {
  const a = h("a", { href: url, class: cls }, text);
  a.addEventListener("click", (e) => {
    e.preventDefault();
    openTab(url);
  });
  return a;
}

function ago(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const searchUrls = (name: string) => {
  const q = encodeURIComponent(name);
  return {
    sw: `https://www.neopets.com/shops/wizard.phtml?string=${q}`,
    tp: `https://www.neopets.com/island/tradingpost.phtml?type=browse&criteria=item_exact&search_string=${q}`,
    jn: `https://items.jellyneo.net/search/?name=${q}&name_type=3`,
  };
};

/* ---------------- model ---------------- */

function buildPages(): PageView[] {
  return PAGE_IDS.map((id) => {
    const ref = getRefPage(id)!;
    const synced = store.pages[String(id)];
    const ownedMap = synced?.owned ?? {};
    let slots: SlotView[];

    if (ref.slots) {
      slots = ref.slots.map(([position, name, img, rarity]) => ({
        position,
        name,
        img,
        rarity,
        owned: !!ownedMap[String(position)],
      }));
    } else {
      // No bundled data: show what we've learned, unknown for the rest.
      slots = Array.from({ length: SLOTS_PER_PAGE }, (_, i) => {
        const o = ownedMap[String(i + 1)];
        return {
          position: i + 1,
          name: o?.name ?? null,
          img: o?.img ?? null,
          rarity: null,
          owned: !!o,
        };
      });
    }

    const owned = slots.filter((s) => s.owned).length;
    return {
      id,
      name: ref.name,
      synced,
      stale: !!synced && Date.now() - synced.syncedAt > STALE_AFTER_MS,
      slots,
      owned,
      total: slots.length,
      hasReference: !!ref.slots,
    };
  });
}

/* ---------------- render ---------------- */

function renderSummary(pages: PageView[]): HTMLElement {
  const synced = pages.filter((p) => p.synced);
  const owned = synced.reduce((n, p) => n + p.owned, 0);
  const known = synced.reduce((n, p) => n + p.total, 0);
  const complete = synced.filter((p) => p.owned === p.total && p.total > 0).length;

  const tile = (value: string, label: string) =>
    h(
      "div",
      { class: "col-4" },
      h(
        "div",
        { class: "stat-tile" },
        h("div", { class: "stat-value" }, value),
        h("div", { class: "stat-label" }, label)
      )
    );

  return h(
    "div",
    { class: "row g-2 mb-2" },
    tile(`${owned} / ${known}`, "Owned (synced pages)"),
    tile(`${synced.length} / ${pages.length}`, "Pages synced"),
    tile(String(complete), "Pages complete")
  );
}

function renderSync(pages: PageView[]): HTMLElement | null {
  const todo = pages.filter((p) => !p.synced || p.stale);
  if (!todo.length) {
    return h(
      "p",
      { class: "small text-muted mb-1" },
      "All pages synced. Pages re-sync whenever you open them."
    );
  }

  const next = todo[0];
  const btn = h(
    "button",
    { class: "btn btn-sm btn-primary" },
    `Open next: ${next.name}`
  );
  btn.addEventListener("click", () => openTab(albumUrl(next.id)));

  return h(
    "div",
    { class: "album-sync-box" },
    h(
      "div",
      { class: "d-flex justify-content-between align-items-center gap-2" },
      h(
        "div",
        { class: "small" },
        h("strong", {}, `${todo.length} page${todo.length === 1 ? "" : "s"} to sync`),
        h(
          "div",
          { class: "text-muted" },
          "Opening an album page records it - nothing is loaded in the background."
        )
      ),
      btn
    )
  );
}

function renderGrid(page: PageView): HTMLElement {
  const grid = h("div", { class: "album-grid" });
  const byPos = new Map(page.slots.map((s) => [s.position, s]));

  for (let pos = 1; pos <= SLOTS_PER_PAGE; pos++) {
    const s = byPos.get(pos);
    if (!s) {
      grid.append(h("div", { class: "album-slot empty", title: `#${pos} - not released yet` }));
      continue;
    }
    const label = s.name ?? `Unknown slot #${pos}`;
    const cell = h("div", {
      class: `album-slot ${s.owned ? "owned" : "missing"}`,
      title: `#${pos} ${label}${s.rarity ? ` (r${s.rarity})` : ""}${s.owned ? "" : " - missing"}`,
    });
    if (s.img) {
      cell.append(h("img", { src: itemImageUrl(s.img), alt: label, loading: "lazy" }));
    } else {
      cell.append(h("span", { class: "album-unknown" }, "?"));
    }
    grid.append(cell);
  }
  return grid;
}

function renderMissing(page: PageView): HTMLElement | null {
  if (!page.synced) {
    return h(
      "p",
      { class: "small text-muted mb-0" },
      "Not synced yet - ",
      link("open this album page", albumUrl(page.id)),
      " to see what you're missing."
    );
  }
  const missing = page.slots.filter((s) => !s.owned);
  if (!missing.length) return h("p", { class: "small text-success mb-0" }, "Page complete!");

  const list = h("ul", { class: "list-unstyled mb-0 album-missing" });
  for (const s of missing) {
    if (!s.name) {
      list.append(h("li", { class: "small text-muted" }, `#${s.position} Unknown (newer than bundled data)`));
      continue;
    }
    const u = searchUrls(s.name);
    list.append(
      h(
        "li",
        { class: "album-missing-row" },
        h("span", { class: "album-pos" }, `#${s.position}`),
        h("span", { class: "album-missing-name" }, s.name),
        s.rarity ? h("span", { class: "text-muted small" }, `r${s.rarity}`) : null,
        h(
          "span",
          { class: "album-links" },
          link("SW", u.sw),
          link("TP", u.tp),
          link("JN", u.jn)
        )
      )
    );
  }
  return list;
}

function renderPage(page: PageView): HTMLElement {
  const pct = page.total ? Math.round((page.owned / page.total) * 100) : 0;
  const status = !page.synced
    ? h("span", { class: "album-status unsynced" }, "Not synced")
    : h(
        "span",
        { class: `album-status ${page.stale ? "stale" : ""}` },
        page.stale ? `Stale · ${ago(page.synced.syncedAt)}` : ago(page.synced.syncedAt)
      );

  const header = h(
    "button",
    { class: "album-row-header" },
    h("span", { class: "album-name" }, page.name),
    h(
      "span",
      { class: "album-progress" },
      h("span", { class: "album-bar" }, h("span", { style: `width:${page.synced ? pct : 0}%` })),
      h("span", { class: "album-count" }, page.synced ? `${page.owned}/${page.total}` : `-/${page.total}`)
    ),
    status
  );
  header.addEventListener("click", () => {
    if (expanded.has(page.id)) expanded.delete(page.id);
    else expanded.add(page.id);
    render();
  });

  const row = h("div", { class: `album-row ${page.synced && page.owned === page.total ? "complete" : ""}` }, header);

  if (expanded.has(page.id)) {
    row.append(
      h(
        "div",
        { class: "album-detail" },
        renderGrid(page),
        renderMissing(page),
        h(
          "div",
          { class: "small mt-1" },
          link("Open in album →", albumUrl(page.id)),
          page.hasReference ? null : h("span", { class: "text-muted" }, " · names learned from your album only")
        )
      )
    );
  }
  return row;
}

function matchesSearch(page: PageView): boolean {
  if (!search) return true;
  if (normalizeName(page.name).includes(search)) return true;
  return page.slots.some((s) => s.name && normalizeName(s.name).includes(search));
}

function render(): void {
  const summary = document.getElementById("album-summary");
  const sync = document.getElementById("album-sync");
  const list = document.getElementById("album-list");
  if (!summary || !sync || !list) return;

  const pages = buildPages();
  summary.replaceChildren(renderSummary(pages));
  sync.replaceChildren(...[renderSync(pages)].filter(Boolean) as HTMLElement[]);

  const shown = pages.filter((p) => {
    if (filter === "unsynced" && p.synced && !p.stale) return false;
    if (filter === "incomplete" && (!p.synced || p.owned === p.total)) return false;
    return matchesSearch(p);
  });

  // Searching auto-expands pages that contain a matching item.
  if (search) {
    for (const p of shown) {
      if (p.slots.some((s) => s.name && normalizeName(s.name).includes(search))) expanded.add(p.id);
    }
  }

  list.replaceChildren(
    ...(shown.length
      ? shown.map(renderPage)
      : [h("p", { class: "small text-muted text-center py-3" }, "No pages match.")]),
    h(
      "p",
      { class: "small text-muted text-center mt-2 mb-0" },
      "Slot data for pages 1-48 from the Stamp Album Helper userscript / Jellyneo item database (Nov 2025)."
    )
  );
}

function load(): void {
  chrome.storage.local.get([STAMP_STORAGE_KEY], (r) => {
    store = (r[STAMP_STORAGE_KEY] as StampAlbumStore) ?? { pages: {} };
    render();
  });
}

export function initAlbumPage(): void {
  const searchEl = document.getElementById("album-search") as HTMLInputElement | null;
  const filterEl = document.getElementById("album-filter") as HTMLSelectElement | null;

  searchEl?.addEventListener("input", () => {
    search = normalizeName(searchEl.value);
    if (!search) expanded.clear();
    render();
  });
  filterEl?.addEventListener("change", () => {
    filter = filterEl.value as Filter;
    render();
  });

  if (!listener) {
    listener = (changes, area) => {
      if (area !== "local" || !changes[STAMP_STORAGE_KEY]) return;
      store = (changes[STAMP_STORAGE_KEY].newValue as StampAlbumStore) ?? { pages: {} };
      if (document.getElementById("album-list")) render();
    };
    chrome.storage.onChanged.addListener(listener);
  }

  load();
}
