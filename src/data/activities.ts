import { ActivityDefinition } from "../types/activity";

export const ACTIVITIES: ActivityDefinition[] = [
  // ------------------
  // DAILIES
  // ------------------
  {
    id: "free_jelly",
    name: "Free Jelly",
    url: "https://www.neopets.com/jelly/jelly.phtml",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
  },
  {
    id: "giant_omelette",
    name: "Giant Omelette",
    url: "https://www.neopets.com/prehistoric/omelette.phtml",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
  },
  {
    id: "healing_springs",
    name: "Healing Springs",
    url: "https://www.neopets.com/faerieland/springs.phtml",
    category: "dailies",
    timingType: "COOLDOWN",
    cooldownMinutes: 30,
  },
  {
    id: "money_tree",
    name: "Money Tree",
    url: "https://www.neopets.com/donations.phtml",
    category: "dailies",
    timingType: "DAILY_LIMIT",
    maxPerDay: 10,
    notes: "Shares pool with Second-Hand Shoppe",
  },

  // ------------------
  // WHEELS
  // ------------------
  {
    id: "wheel_of_mediocrity",
    name: "Wheel of Mediocrity",
    url: "https://www.neopets.com/prehistoric/mediocrity.phtml",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 40,
    bufferMinutes: 2,
  },
  {
    id: "wheel_of_excitement",
    name: "Wheel of Excitement",
    url: "https://www.neopets.com/faerieland/wheel.phtml",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 120,
    bufferMinutes: 5,
  },
  {
    id: "wheel_of_knowledge",
    name: "Wheel of Knowledge",
    url: "https://www.neopets.com/medieval/knowledge.phtml",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 60,
    bufferMinutes: 5,
  },
  {
    id: "wheel_of_misfortune",
    name: "Wheel of Misfortune",
    url: "https://www.neopets.com/halloween/wheel/index.phtml",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 120,
    bufferMinutes: 5,
  },
  {
    id: "wheel_of_monotony",
    name: "Wheel of Monotony",
    url: "https://www.neopets.com/prehistoric/monotony.phtml",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 240,
    bufferMinutes: 10,
    notes: "Can take a very long time to complete",
  },
  {
    id: "wheel_of_extravagance",
    name: "Wheel of Extravagance",
    url: "https://www.neopets.com/desert/extravagance.phtml",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 360,
    bufferMinutes: 10,
  },
];
