import type { RewardTier, TrackerCategory, TrackerDefinition } from "../types/tracker";

export const NEOCOLA_ID = "neocola_machine";
export const VENDING_ID = "alien_aisha_vending";

/* ─────────────────────────────────────────────── */
/*                NeoCola reference data            */
/* ─────────────────────────────────────────────── */

export const NEOCOLA_TOKENS = ["Red", "Blue", "Green"] as const;

export const NEOCOLA_FLAVORS = [
  "Dr Slother",
  "Diet Doom",
  "Na'cho Cola",
  "Smite",
  "Alt-Tab",
  "Minion Maid",
  "Mountain Poo",
  "Dehydrated H20",
] as const;

export const NEOCOLA_PRESSES = ["0", "1", "2", "3", "10", "42"] as const;

/** Form field names on /moon/neocola2.phtml. */
export const NEOCOLA_FIELDS = {
  token: "token_id",
  flavor: "neocola_flavor",
  presses: "red_button",
} as const;

/** "first" = whichever token is listed first in the select. */
export const NEOCOLA_PREFILL_DEFAULTS = {
  enabled: true,
  choices: { token: "first", flavor: "Dehydrated H20", presses: "3" },
};

/** Prizes the machine labels as a "booby prize". */
export const NEOCOLA_BOOBY_PRIZES = [
  "Dented Can of Neocola",
  "Fake Neocola Token On a String",
  "Fake Sloth Tattoo",
  "Gummy Baby Space Fungus",
  "I Club Sloth Grundo T-Shirt",
  "Kreludan Grundo Slippers",
  "Lint-Covered Peanut",
  "Non-Sticky Sticky Hand",
  "Plastic Ring of Sloth",
  "Sloth Gummies",
  "Sponge Grundo Sponge",
  "Super Energy Blast Drink",
  "Wind Up Dr. Sloth Toy",
];

/** Non-booby prizes (excluding transmogs, which are matched by pattern). */
export const NEOCOLA_RARE_PRIZES = [
  "Baby Space Fungus",
  "Dastardly Evil Fuzzle",
  "Shaken-up Can of Neocola",
  "Virtupets Brand Doomsday Device",
  "Millipod",
];

const TRANSMOG_PATTERN =
  /transmogrification potion|beginners guide to mixing transmogrification/i;

export function isTransmogItem(item: string): boolean {
  return TRANSMOG_PATTERN.test(item);
}

export function classifyNeocolaPrize(
  item: string | null,
  saidBooby: boolean
): RewardTier {
  if (item && isTransmogItem(item)) return "jackpot";
  if (saidBooby) return "common";
  if (!item) return "common";

  const lower = item.toLowerCase();
  if (NEOCOLA_BOOBY_PRIZES.some((p) => p.toLowerCase() === lower)) {
    return "common";
  }
  // The machine only calls out booby prizes explicitly, so anything else
  // that came out without that label is treated as a good prize.
  return "rare";
}

/* ─────────────────────────────────────────────── */
/*          Alien Aisha Vending reference data      */
/* ─────────────────────────────────────────────── */

/** Form field names on /vending2.phtml. Choices don't affect the outcome. */
export const VENDING_FIELDS = {
  nerkmid: "nerkmid_id",
  largeButton: "large_button",
  smallButton: "small_button",
  presses: "button_presses",
  levers: "lever_pulls",
} as const;

export const VENDING_CATEGORIES: TrackerCategory[] = [
  { id: "gross_food", label: "Gross Food", tier: "common", expectedPct: 70 },
  { id: "nerkmid", label: "Nerkmid", tier: "rare", expectedPct: 15 },
  { id: "faerie", label: "Fading Bottled Faerie", tier: "rare", expectedPct: 10 },
  { id: "paint_brush", label: "Paint Brush", tier: "jackpot", expectedPct: 5 },
];

export function classifyVendingPrize(item: string | null): TrackerCategory {
  const byId = (id: string) => VENDING_CATEGORIES.find((c) => c.id === id)!;
  if (!item) return byId("gross_food");
  if (/paint ?brush/i.test(item)) return byId("paint_brush");
  if (/bottled\b.*\bfaerie/i.test(item)) return byId("faerie");
  if (/nerkmid/i.test(item)) return byId("nerkmid");
  return byId("gross_food");
}

/* ─────────────────────────────────────────────── */
/*                 Tracker registry                 */
/* ─────────────────────────────────────────────── */

export const TRACKERS: TrackerDefinition[] = [
  {
    id: NEOCOLA_ID,
    name: "NeoCola Machine",
    description:
      "Every token you feed the machine on Kreludor - NP, prizes, and those elusive transmogs.",
    url: "https://www.neopets.com/moon/neocola.phtml",
    playUnit: { singular: "token", plural: "tokens" },
    jackpotLabel: "Transmogs",
    jackpotSingular: "transmog",
    costLabel: "Token price (NP)",
    choiceFields: [
      { key: "token", label: "Token" },
      { key: "flavor", label: "Flavor" },
      { key: "presses", label: "Presses" },
    ],
    prefill: {
      defaults: NEOCOLA_PREFILL_DEFAULTS,
      options: {
        token: [
          { value: "first", label: "First available" },
          ...NEOCOLA_TOKENS.map((t) => ({ value: t, label: t })),
        ],
        flavor: NEOCOLA_FLAVORS.map((f) => ({ value: f, label: f })),
        presses: NEOCOLA_PRESSES.map((p) => ({ value: p, label: p })),
      },
    },
  },
  {
    id: VENDING_ID,
    name: "Alien Aisha Vending",
    description:
      "Nerkmids in, gross food out... and every so often a paint brush.",
    url: "https://www.neopets.com/vending.phtml",
    playUnit: { singular: "nerkmid", plural: "nerkmids" },
    jackpotLabel: "Paint Brushes",
    jackpotSingular: "brush",
    costLabel: "Avg Nerkmid price (NP)",
    tierLabels: { rare: "Nerkmids + Faeries", common: "Gross Food" },
    choiceFields: [{ key: "nerkmid", label: "Nerkmid" }],
    categories: VENDING_CATEGORIES,
    // Buttons/levers don't change anything, so prefill is just on/off
    // and always picks the first option in each select.
    prefill: {
      defaults: { enabled: true, choices: {} },
      options: {},
    },
  },
];

export function getTracker(id: string): TrackerDefinition | undefined {
  return TRACKERS.find((t) => t.id === id);
}
