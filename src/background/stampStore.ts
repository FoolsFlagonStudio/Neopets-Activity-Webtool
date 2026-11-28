import { STAMP_STORAGE_KEY } from "../data/stamps";
import type { StampAlbumStore, StampPageSync } from "../types/stamps";

export async function loadStampStore(): Promise<StampAlbumStore> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STAMP_STORAGE_KEY], (r) => {
      resolve((r[STAMP_STORAGE_KEY] as StampAlbumStore) ?? { pages: {} });
    });
  });
}

function save(store: StampAlbumStore): Promise<void> {
  return new Promise((resolve) =>
    chrome.storage.local.set({ [STAMP_STORAGE_KEY]: store }, () => resolve())
  );
}

let queue: Promise<unknown> = Promise.resolve();

function mutate(fn: (s: StampAlbumStore) => void): Promise<void> {
  const next = queue.then(async () => {
    const store = await loadStampStore();
    fn(store);
    await save(store);
  });
  queue = next.catch(() => undefined);
  return next;
}

export function syncStampPage(payload: StampPageSync): Promise<void> {
  const pageId = Math.floor(Number(payload?.pageId));
  if (!Number.isFinite(pageId) || pageId < 1 || pageId > 200) {
    return Promise.resolve();
  }

  const owned: StampAlbumStore["pages"][string]["owned"] = {};
  for (const [pos, slot] of Object.entries(payload.owned ?? {})) {
    const p = Number(pos);
    if (!Number.isInteger(p) || p < 1 || p > 25) continue;
    owned[String(p)] = {
      name: String(slot.name).slice(0, 100),
      img: String(slot.img).slice(0, 100),
    };
  }

  return mutate((store) => {
    store.pages[String(pageId)] = { syncedAt: Date.now(), owned };
  });
}

export function resetStampStore(): Promise<void> {
  return mutate((store) => {
    store.pages = {};
  });
}
