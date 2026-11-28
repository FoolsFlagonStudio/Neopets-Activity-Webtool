/**
 * Stamp album collection tracking.
 *
 * Reference data (what goes in each slot) is bundled in
 * src/data/stampAlbum.json. What the user owns is learned passively from
 * their own album pages and stored under "stampAlbum" in chrome.storage.local.
 */

/** One reference slot: [position, name, image filename, rarity]. */
export type RefSlot = [number, string, string, number | null];

export interface RefPage {
  name: string;
  /** Absent for pages newer than the bundled data. */
  slots?: RefSlot[];
}

export interface StampReference {
  _source: string;
  pages: Record<string, RefPage>;
}

export interface OwnedSlot {
  name: string;
  img: string; // image filename, e.g. stamp_mys_kou.gif
}

export interface SyncedPage {
  syncedAt: number;
  /** position (1-25) → owned item */
  owned: Record<string, OwnedSlot>;
}

export interface StampAlbumStore {
  pages: Record<string, SyncedPage>;
}

/** Payload sent by the album page detector. */
export interface StampPageSync {
  pageId: number;
  owned: Record<string, OwnedSlot>;
}

/** Resolved info about an album item, used by the shop highlighter. */
export interface AlbumItemInfo {
  pageId: number;
  pageName: string;
  position: number;
  name: string;
  img: string;
  rarity: number | null;
}
