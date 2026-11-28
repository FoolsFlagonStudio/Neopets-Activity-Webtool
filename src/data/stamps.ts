import reference from "./stampAlbum.json";
import type {
  AlbumItemInfo,
  RefPage,
  StampAlbumStore,
  StampReference,
} from "../types/stamps";

export const STAMP_REF = reference as unknown as StampReference;
export const STAMP_STORAGE_KEY = "stampAlbum";
export const SLOTS_PER_PAGE = 25;

/** Pages older than this are flagged as "stale" in the popup. */
export const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export const PAGE_IDS: number[] = Object.keys(STAMP_REF.pages)
  .map(Number)
  .sort((a, b) => a - b);

export function getRefPage(pageId: number): RefPage | undefined {
  const page = STAMP_REF.pages[String(pageId)];
  // A page with no known items (e.g. Plushies in the bundled data) is
  // treated like a page newer than the data: learned from the user's album.
  if (page && page.slots && page.slots.length === 0) {
    return { name: page.name };
  }
  return page;
}

export function albumUrl(pageId: number): string {
  return `https://www.neopets.com/stamps.phtml?type=album&page_id=${pageId}`;
}

export function itemImageUrl(img: string): string {
  return `https://images.neopets.com/items/${img}`;
}

export function normalizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Lowercase filename from an image URL or bare filename. */
export function imgKey(src: string): string {
  const file = src.split("?")[0].split("/").pop() ?? "";
  return file.toLowerCase();
}

/**
 * Build name/image lookups for every known album item: the bundled
 * reference plus anything learned from the user's own synced pages
 * (covers pages newer than the bundled data).
 */
export function buildAlbumIndex(store: StampAlbumStore | undefined): {
  byName: Map<string, AlbumItemInfo>;
  byImg: Map<string, AlbumItemInfo>;
} {
  const byName = new Map<string, AlbumItemInfo>();
  const byImg = new Map<string, AlbumItemInfo>();

  const add = (info: AlbumItemInfo) => {
    const n = normalizeName(info.name);
    if (!byName.has(n)) byName.set(n, info);
    const k = imgKey(info.img);
    if (k && !byImg.has(k)) byImg.set(k, info);
  };

  for (const pageId of PAGE_IDS) {
    const ref = getRefPage(pageId)!;
    for (const [position, name, img, rarity] of ref.slots ?? []) {
      add({ pageId, pageName: ref.name, position, name, img, rarity });
    }
  }

  for (const [id, page] of Object.entries(store?.pages ?? {})) {
    const pageId = Number(id);
    const pageName = getRefPage(pageId)?.name ?? `Page ${id}`;
    for (const [pos, slot] of Object.entries(page.owned)) {
      add({
        pageId,
        pageName,
        position: Number(pos),
        name: slot.name,
        img: slot.img,
        rarity: null,
      });
    }
  }

  return { byName, byImg };
}

export type OwnershipState = "owned" | "missing" | "unsynced";

export function ownershipOf(
  info: AlbumItemInfo,
  store: StampAlbumStore | undefined
): OwnershipState {
  const page = store?.pages[String(info.pageId)];
  if (!page) return "unsynced";
  return page.owned[String(info.position)] ? "owned" : "missing";
}
