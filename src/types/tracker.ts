/**
 * Reward trackers.
 *
 * Trackers are "just for fun" stat logs for repeatable, token/NP-driven
 * activities (NeoCola Machine first, more later). They are separate from
 * activity availability state: an activity answers "can I do this now?",
 * a tracker answers "how has this gone for me over time?".
 *
 * All data lives in chrome.storage.local for now. The shapes below are
 * deliberately plain JSON so they can be synced to an account later.
 */

/** How rare a single reward was. Each tracker decides how to classify. */
export type RewardTier = "common" | "rare" | "jackpot";

/** One recorded play (one token spent, one spin, etc.). */
export interface TrackerEntry {
  id: string; // unique per entry
  at: number; // epoch ms when recorded
  np: number; // NP received (0 if none)
  item: string | null; // item received, null if nothing
  tier: RewardTier;
  /** Prize category id (TrackerDefinition.categories), if the tracker has them. */
  category?: string;
  /**
   * Tracker-specific choices made for this play, keyed by
   * TrackerDefinition.choiceFields[].key (e.g. token, flavor, presses).
   * Missing / unknown values are omitted.
   */
  choices: Record<string, string>;
  source: "auto" | "manual";
}

export interface TrackerSettings {
  /** What one play costs the user in NP (e.g. token price). Optional. */
  costPerPlay?: number;
  /**
   * Optional form prefill on the activity page. Only fills fields the user
   * hasn't touched; never submits. Keys match choiceFields.
   */
  prefill?: { enabled: boolean; choices: Record<string, string> };
}

export interface TrackerLog {
  entries: TrackerEntry[]; // oldest first
  settings: TrackerSettings;
}

export type TrackerStore = Record<string, TrackerLog>;

export interface TrackerChoiceField {
  key: string; // stored key in TrackerEntry.choices
  label: string; // column header in UI
}

export interface TrackerCategory {
  id: string;
  label: string;
  tier: RewardTier;
  /** Published odds in percent, shown next to the user's actual rate. */
  expectedPct?: number;
}

export interface TrackerDefinition {
  id: string;
  name: string;
  description: string;
  url: string; // where to go play it
  /** Name of the thing a play consumes, singular/plural ("token"/"tokens"). */
  playUnit: { singular: string; plural: string };
  /** Label for the jackpot tier ("Transmogs", etc.). */
  jackpotLabel: string;
  /** Singular form for "Since last ___" (defaults to jackpotLabel minus "s"). */
  jackpotSingular?: string;
  /** Label for the cost setting input. */
  costLabel: string;
  choiceFields: TrackerChoiceField[];
  /** Optional prize categories (e.g. Gross Food / Nerkmid / Paint Brush). */
  categories?: TrackerCategory[];
  /** Tile labels for the rare/common tiers (defaults: Good prizes / Booby prizes). */
  tierLabels?: { rare: string; common: string };
  /** Present when the tracker supports prefilling its activity form. */
  prefill?: {
    defaults: { enabled: boolean; choices: Record<string, string> };
    options: Record<string, { value: string; label: string }[]>;
  };
}

/** Payload a content-script detector sends when it sees a result. */
export interface TrackerRecordPayload {
  trackerId: string;
  np: number;
  item: string | null;
  tier: RewardTier;
  category?: string;
  choices: Record<string, string>;
  source: "auto" | "manual";
}
