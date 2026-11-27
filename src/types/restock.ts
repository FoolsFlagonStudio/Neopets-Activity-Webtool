export interface ShopDefinition {
  id: string;
  name: string;
  category: string;
  neopetsTypeId: number;
  itemdbSlug: string;
}

export interface ItemPriceEntry {
  name: string;
  price: number | null;
  rarity?: number;
  lastUpdated: number;
}

export interface ShopPriceCache {
  fetchedAt: number;
  items: Record<string, ItemPriceEntry>;
}

export type RestockPriceStore = Record<string, ShopPriceCache>;

export interface FetchStatus {
  active: boolean;
  current: string | null;
  done: number;
  total: number;
}

export const RESTOCK_STORAGE_KEY = "restockPrices";
export const FETCH_STATUS_KEY = "restockFetchStatus";
