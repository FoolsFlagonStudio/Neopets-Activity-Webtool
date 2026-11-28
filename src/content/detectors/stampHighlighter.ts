/**
 * Album item highlighter (cosmetic, read-only).
 *
 * On shops, user shops, auctions, the Trading Post, Shop Wizard, inventory
 * and SDB, marks any stamp-album item with a badge:
 *   - "Need"        - its album slot is empty
 *   - "In album"    - already in your album
 *   - "Sync page"   - that album page hasn't been synced yet (links to it)
 *
 * Items are matched by data-name attributes, exact item-name text, or the
 * item image filename. Nothing is clicked or fetched.
 */
import {
  STAMP_STORAGE_KEY,
  albumUrl,
  buildAlbumIndex,
  imgKey,
  normalizeName,
  ownershipOf,
} from "../../data/stamps";
import type { AlbumItemInfo, StampAlbumStore } from "../../types/stamps";

const PATHS = [
  /^\/objects\.phtml/, // NPC shops
  /^\/browseshop\.phtml/, // user shops
  /^\/market\.phtml/, // own shop, wizard (legacy)
  /^\/shops\/wizard\.phtml/,
  /^\/auctions\.phtml/,
  /^\/genie\.phtml/,
  /^\/island\/tradingpost\.phtml/,
  /^\/inventory\.phtml/,
  /^\/safetydeposit\.phtml/,
  /^\/hiddentower938\.phtml/,
  /^\/winter\/igloo2?\.phtml/,
  /^\/gallery\/index\.phtml/,
];

const DONE_ATTR = "data-nat-album";
const STYLE_ID = "nat-album-style";

/** Elements whose text we consider as a possible item name. */
const NAME_TAGS = new Set(["B", "STRONG", "A", "TD", "P", "SPAN", "DIV", "LI", "FONT", "H3", "H4"]);

let store: StampAlbumStore | undefined;
let index: ReturnType<typeof buildAlbumIndex> | null = null;
let loading: Promise<void> | null = null;
let scheduled = false;

function onSupportedPage(): boolean {
  return PATHS.some((re) => re.test(location.pathname));
}

function load(): Promise<void> {
  loading ??= new Promise((resolve) => {
    chrome.storage.local.get([STAMP_STORAGE_KEY], (r) => {
      store = r[STAMP_STORAGE_KEY] as StampAlbumStore | undefined;
      index = buildAlbumIndex(store);
      resolve();
    });
  });
  return loading;
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .nat-album-badge{display:inline-block;margin:2px 4px;padding:1px 6px;border-radius:999px;
      font:600 10px/1.5 Verdana,Arial,sans-serif;white-space:nowrap;vertical-align:middle;text-decoration:none!important}
    .nat-album-need{background:#7c3aed;color:#fff!important}
    .nat-album-have{background:#e5e7eb;color:#4b5563!important}
    .nat-album-unsynced{background:#dbeafe;color:#1e40af!important}
    .nat-album-outline-need{outline:3px solid #7c3aed;outline-offset:2px;border-radius:4px}
  `;
  document.head.appendChild(style);
}

function makeBadge(info: AlbumItemInfo): HTMLElement {
  const el = buildBadge(info);
  el.dataset.natItem = normalizeName(info.name);
  return el;
}

function buildBadge(info: AlbumItemInfo): HTMLElement {
  const state = ownershipOf(info, store);
  const where = `${info.pageName} #${info.position}`;

  if (state === "unsynced") {
    const a = document.createElement("a");
    a.className = "nat-album-badge nat-album-unsynced";
    a.href = albumUrl(info.pageId);
    a.target = "_blank";
    a.textContent = `Album: sync ${info.pageName}`;
    a.title = `This is a ${where} album item. Open that album page once so the extension knows whether you have it.`;
    return a;
  }

  const span = document.createElement("span");
  span.className = `nat-album-badge nat-album-${state === "missing" ? "need" : "have"}`;
  span.textContent = state === "missing" ? `Need · ${where}` : "In album";
  span.title =
    state === "missing"
      ? `Missing from your stamp album: ${where}`
      : `Already in your stamp album (${where})`;
  return span;
}

/** The "card" an item lives in, so one item only gets one badge. */
function containerOf(el: Element): Element {
  return el.closest(".shop-item, li, td, tr") ?? el.parentElement ?? el;
}

function claim(el: Element): boolean {
  const box = containerOf(el);
  if (box.hasAttribute(DONE_ATTR)) return false;
  box.setAttribute(DONE_ATTR, "1");
  return true;
}

function outlineIfNeeded(info: AlbumItemInfo, el: Element): void {
  if (ownershipOf(info, store) === "missing") {
    el.classList.add("nat-album-outline-need");
  }
}

function scan(): void {
  if (!index) return;
  const root = document.querySelector("td.content") ?? document.body;
  const { byName, byImg } = index;

  // 1) data-name attributes (new NPC shop layout)
  for (const el of root.querySelectorAll<HTMLElement>("[data-name]")) {
    if (el.hasAttribute(DONE_ATTR + "-seen")) continue;
    el.setAttribute(DONE_ATTR + "-seen", "1");
    const info = byName.get(normalizeName(el.dataset.name ?? ""));
    if (!info) continue;
    outlineIfNeeded(info, el);
    if (!claim(el)) continue;
    const card = el.closest(".shop-item");
    const nameEl = card?.querySelector("p.item-name") ?? el;
    nameEl.insertAdjacentElement("afterend", makeBadge(info));
  }

  // 2) exact item-name text
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits: [Element, AlbumItemInfo][] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
    if (text.length < 4 || text.length > 80) continue;
    const parent = node.parentElement;
    if (!parent || !NAME_TAGS.has(parent.tagName)) continue;
    if (parent.closest(".nat-album-badge, script, style, select, option")) continue;
    const info = byName.get(normalizeName(text));
    if (info) hits.push([parent, info]);
  }
  for (const [el, info] of hits) {
    if (!claim(el)) continue;
    el.insertAdjacentElement("afterend", makeBadge(info));
  }

  // 3) item images
  for (const img of root.querySelectorAll<HTMLImageElement>('img[src*="/items/"]')) {
    if (img.hasAttribute(DONE_ATTR + "-seen")) continue;
    img.setAttribute(DONE_ATTR + "-seen", "1");
    const info = byImg.get(imgKey(img.getAttribute("src") ?? ""));
    if (!info) continue;
    outlineIfNeeded(info, img);
    // Same item already badged by name elsewhere in this row (e.g. auctions)?
    const row = img.closest("tr");
    const key = normalizeName(info.name);
    if (row && [...row.querySelectorAll<HTMLElement>(".nat-album-badge")].some((b) => b.dataset.natItem === key)) continue;
    if (!claim(img)) continue; // name badge already added for this card
    img.insertAdjacentElement("afterend", makeBadge(info));
  }
}

/** Called from the observer on every DOM mutation; debounced. */
export function applyStampHighlights(): void {
  if (!onSupportedPage() || scheduled) return;
  scheduled = true;
  setTimeout(async () => {
    await load();
    injectStyles();
    scan();
    scheduled = false;
  }, 250);
}
