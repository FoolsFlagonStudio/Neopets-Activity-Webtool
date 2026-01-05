import { ActivityDefinition } from "../types/activity";

export const ACTIVITIES: ActivityDefinition[] = [
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
    id: "wheel_of_mediocrity",
    name: "Wheel of Mediocrity",
    url: "https://www.neopets.com/prehistoric/mediocrity.phtml",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 40,
    bufferMinutes: 2,
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
];
