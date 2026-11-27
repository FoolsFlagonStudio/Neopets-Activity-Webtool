import type { TrackerEntry, TrackerLog } from "../types/tracker";

export interface GroupStat {
  key: string;
  plays: number;
  np: number;
  avgNp: number;
  rares: number;
  jackpots: number;
}

export interface ItemStat {
  item: string;
  count: number;
  tier: TrackerEntry["tier"];
}

export interface TrackerStats {
  plays: number;
  totalNp: number;
  avgNp: number;
  bestNp: number;
  worstNp: number;
  common: number;
  rares: number;
  jackpots: number;
  netNp: number | null; // null when no cost is set
  spent: number | null;
  playsSinceJackpot: number;
  playsSinceRare: number;
  jackpotEntries: TrackerEntry[];
  items: ItemStat[];
  byChoice: Record<string, GroupStat[]>; // choice key → groups
  firstAt: number | null;
  lastAt: number | null;
}

export function computeStats(
  log: TrackerLog,
  choiceKeys: string[]
): TrackerStats {
  const entries = log.entries;
  const plays = entries.length;

  let totalNp = 0;
  let bestNp = 0;
  let worstNp = plays ? Infinity : 0;
  let common = 0;
  let rares = 0;
  let jackpots = 0;
  let playsSinceJackpot = 0;
  let playsSinceRare = 0;

  const itemMap = new Map<string, ItemStat>();
  const groupMaps: Record<string, Map<string, GroupStat>> = {};
  for (const k of choiceKeys) groupMaps[k] = new Map();

  for (const e of entries) {
    totalNp += e.np;
    bestNp = Math.max(bestNp, e.np);
    worstNp = Math.min(worstNp, e.np);

    if (e.tier === "jackpot") {
      jackpots++;
      playsSinceJackpot = 0;
      playsSinceRare = 0;
    } else if (e.tier === "rare") {
      rares++;
      playsSinceJackpot++;
      playsSinceRare = 0;
    } else {
      common++;
      playsSinceJackpot++;
      playsSinceRare++;
    }

    const itemKey = e.item ?? "(nothing)";
    const it = itemMap.get(itemKey) ?? { item: itemKey, count: 0, tier: e.tier };
    it.count++;
    itemMap.set(itemKey, it);

    for (const k of choiceKeys) {
      const v = e.choices[k] ?? "Unknown";
      const g = groupMaps[k].get(v) ?? {
        key: v,
        plays: 0,
        np: 0,
        avgNp: 0,
        rares: 0,
        jackpots: 0,
      };
      g.plays++;
      g.np += e.np;
      if (e.tier === "rare") g.rares++;
      if (e.tier === "jackpot") g.jackpots++;
      groupMaps[k].set(v, g);
    }
  }

  const byChoice: Record<string, GroupStat[]> = {};
  for (const k of choiceKeys) {
    byChoice[k] = [...groupMaps[k].values()]
      .map((g) => ({ ...g, avgNp: g.plays ? g.np / g.plays : 0 }))
      .sort((a, b) => b.plays - a.plays);
  }

  const cost = log.settings.costPerPlay;
  const spent = cost !== undefined ? cost * plays : null;

  return {
    plays,
    totalNp,
    avgNp: plays ? totalNp / plays : 0,
    bestNp,
    worstNp: Number.isFinite(worstNp) ? worstNp : 0,
    common,
    rares,
    jackpots,
    spent,
    netNp: spent !== null ? totalNp - spent : null,
    playsSinceJackpot,
    playsSinceRare,
    jackpotEntries: entries.filter((e) => e.tier === "jackpot").reverse(),
    items: [...itemMap.values()].sort((a, b) => b.count - a.count),
    byChoice,
    firstAt: plays ? entries[0].at : null,
    lastAt: plays ? entries[plays - 1].at : null,
  };
}
