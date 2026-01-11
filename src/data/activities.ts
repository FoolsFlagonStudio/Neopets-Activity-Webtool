import { ActivityDefinition } from "../types/activity";

export const ACTIVITIES: ActivityDefinition[] = [
  // ------------------
  // DAILIES
  // ------------------
  {
    id: "free_jelly",
    name: "Free Jelly",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Free Jelly",
        url: "https://www.neopets.com/jelly/jelly.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "giant_omelette",
    name: "Giant Omelette",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Giant Omelette",
        url: "https://www.neopets.com/prehistoric/omelette.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "bank_interest",
    name: "Bank Interest",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Bank Interest",
        url: "https://www.neopets.com/bank.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "money_tree",
    name: "Money Tree",
    category: "dailies",
    timingType: "DAILY_LIMIT",
    maxPerDay: 10,
    notes: "Shares daily limit with Second-Hand Shoppe",
    links: [
      {
        label: "Money Tree",
        url: "https://www.neopets.com/donations.phtml",
        kind: "action",
      },
    ],
  },
  ////////////////////////
  {
    id: "secondhand_shoppe",
    name: "Second-Hand Shoppe",
    category: "dailies",
    timingType: "DAILY_LIMIT",
    maxPerDay: 10,
    sharedWith: "money_tree",
    notes: "Shares daily limit with Money Tree",
    links: [
      {
        label: "Second-hand Shoppe",
        url: "https://www.neopets.com/thriftshoppe/index.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "rubbish_dump",
    name: "Rubbish Dump",
    category: "dailies",
    timingType: "DAILY_LIMIT",
    maxPerDay: 10,
    sharedWith: "money_tree",
    notes: "Shares daily limit with Money Tree and Second-Hand Shoppe",
    links: [
      {
        label: "Rubbish Dump",
        url: "https://www.neopets.com/medieval/rubbishdump.phtml",
        kind: "action",
      },
    ],
  },

  {
    id: "healing_springs",
    name: "Healing Springs",
    category: "dailies",
    timingType: "COOLDOWN",
    cooldownMinutes: 30,
    links: [
      {
        label: "Healing Springs",
        url: "https://www.neopets.com/faerieland/springs.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "shop_of_offers",
    name: "Shop of Offers",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Shop of Offers",
        url: "https://www.neopets.com/shop_of_offers.phtml?slorg_payout=yes",
        kind: "action",
      },
    ],
  },
  {
    id: "trudys_surprise",
    name: "Trudy’s Surprise",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Trudy's Surprise",
        url: "https://www.neopets.com/trudys_surprise.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "monthly_freebies",
    name: "Monthly Freebies",
    category: "dailies",
    timingType: "MONTHLY_RESET",
    resetTimezone: "America/Los_Angeles",
    notes:
      "Automatically granted on visit; account must be at least 1 month old",
    links: [
      {
        label: "Monthly Freebies",
        url: "https://www.neopets.com/freebies/index.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "obsidian_quarry",
    name: "Obsidian Quarry",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Obsidian Quarry",
        url: "https://www.neopets.com/magma/quarry.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "apple_bobbing",
    name: "Apple Bobbing",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Apple Bobbing",
        url: "https://www.neopets.com/halloween/applebobbing.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "anchor_management",
    name: "Anchor Management",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Anchor Management",
        url: "https://www.neopets.com/pirates/anchormanagement.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "mysterious_negg_cave",
    name: "Mysterious Negg Cave",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Visit Cave",
        url: "https://www.neopets.com/shenkuu/neggcave/",
        kind: "action",
      },
      {
        label: "Puzzle Solver",
        url: "https://thedailyneopets.com/articles/negg-solver",
        kind: "helper",
        tooltip: "External solver (Daily Neopets)",
      },
    ],
  },
  {
    id: "grave_danger",
    name: "Grave Danger",
    category: "misc",
    timingType: "VARIABLE_COOLDOWN",
    notes: "Cooldown is random (≈7–9 hours) and parsed from page",
    links: [
      {
        label: "Grave Danger",
        url: "https://www.neopets.com/halloween/gravedanger/index.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "scratchcard_shared",
    name: "Scratchcards (Shared)",
    category: "games",
    timingType: "COOLDOWN",
    cooldownMinutes: 360,
  },

  {
    id: "scratchcard_winter",
    name: "Scratchcard (Winter)",
    category: "games",
    timingType: "COOLDOWN",
    cooldownMinutes: 360,
    sharedWith: "scratchcard_shared",
    links: [
      {
        label: "Buy",
        url: "https://www.neopets.com/winter/kiosk.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "scratchcard_halloween",
    name: "Scratchcard (Spooky)",
    category: "games",
    timingType: "COOLDOWN",
    cooldownMinutes: 360,
    sharedWith: "scratchcard_shared",
    links: [
      {
        label: "Buy",
        url: "https://www.neopets.com/halloween/scratch.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "scratchcard_desert",
    name: "Scratchcard (Desert)",
    category: "games",
    timingType: "COOLDOWN",
    cooldownMinutes: 360,
    sharedWith: "scratchcard_shared",
    links: [
      {
        label: "Buy",
        url: "https://www.neopets.com/desert/sc/kiosk.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "tombola",
    name: "Tombola",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Tombola",
        url: "https://www.neopets.com/island/tombola.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "snowager",
    name: "Snowager",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    notes:
      "Available at 6-7am, 2-3pm, 10-11pm npt / pst (or all day Dec 1–Jan 3)",
    resetHour: 0,
    links: [
      {
        label: "Snowager",
        url: "https://www.neopets.com/winter/snowager.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "guess_the_marrow",
    name: "Guess the Marrow",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    notes: "Available once per day at a random time.",
    links: [
      {
        label: "Guess The Marrow",
        url: "https://www.neopets.com/medieval/guessmarrow.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "wise_old_king",
    name: "Wise Old King",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    notes: "Available once per day except from 8-9am, 1-2pm, 7-8pm npt / pst",
    links: [
      {
        label: "Wise Old King",
        url: "https://www.neopets.com/medieval/wiseking.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "grumpy_old_king",
    name: "Grumpy Old King",
    category: "dailies",
    timingType: "DAILY_LIMIT",
    maxPerDay: 2,
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    notes:
      "Up to 2 jokes per day. Unavailable from 8-9am, 1-2pm, 7-8pm npt / pst.",
    links: [
      {
        label: "Grumpy Old King",
        url: "https://www.neopets.com/medieval/grumpyking.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "deserted_tomb",
    name: "Deserted Tomb",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Deserted Tomb",
        url: "https://www.neopets.com/worlds/geraptiku/tomb.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "fruit_machine",
    name: "Fruit Machine",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Fruit Machine",
        url: "https://www.neopets.com/desert/fruitmachine.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "coltzans_shrine",
    name: "Coltzan’s Shrine",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Coltzan's Shrine",
        url: "https://www.neopets.com/desert/shrine.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "kreludor_meteor",
    name: "Kreludor Meteor",
    category: "dailies",
    timingType: "COOLDOWN",
    cooldownMinutes: 60,
    bufferMinutes: 0,
    links: [
      {
        label: "Kreludor Meteor",
        url: "https://www.neopets.com/moon/meteor.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "tdmbgpop",
    name: "TDMBGPOP",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "TDMBGPOP",
        url: "https://www.neopets.com/faerieland/tdmbgpop.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "underwater_fishing",
    name: "Underwater Fishing",
    category: "dailies",
    timingType: "CONDITIONAL",
    requirements: [
      "Tracked per pet (not supported in v1)",
      "Once every 12 hours per active pet",
    ],
    notes: "Manual activity — per-pet tracking planned for v2.",
    links: [
      {
        label: "Underwater Fishing",
        url: "https://www.neopets.com/water/fishing.phtml",
        kind: "action",
      },
    ],
  },

  {
    id: "qasalan_expellibox",
    name: "Qasalan Expellibox",
    category: "dailies",
    timingType: "COOLDOWN",
    cooldownMinutes: 8 * 60,
    notes: "Flash game is unreliable. Auto-play link supported.",
    links: [
      {
        label: "Qasalan Expellibox",
        url: "http://ncmall.neopets.com/games/giveaway/process_giveaway.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "lunar_puzzle",
    name: "Lunar Puzzle",

    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    notes:
      "Solve once per day. Incorrect guesses do not consume the daily attempt.",
    links: [
      {
        label: "Lunar Puzzle",
        url: "https://www.neopets.com/shenkuu/lunar/?show=puzzle",
        kind: "action",
      },
      {
        label: "Lunar Puzzle Helper",
        url: "https://thedailyneopets.com/articles/solving-lunar-temple-puzzle",
        kind: "helper",
        tooltip: "Follow directions here on how to easily solve",
      },
    ],
  },

  {
    id: "potato_counter",
    name: "Potato Counter",
    category: "dailies",
    timingType: "DAILY_LIMIT",
    maxPerDay: 3,
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    notes: "Up to 3 plays per day.",
    links: [
      {
        label: "Potato Counter",
        url: "https://www.neopets.com/medieval/potatocounter.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "forgotten_shore",
    name: "Forgotten Shore",
    category: "dailies",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    notes: "Requires the full Forgotten Shore map.",
    links: [
      {
        label: "Forgotten Shore",
        url: "https://www.neopets.com/pirates/forgottenshore.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "haunted_woods_hunt",
    name: "Haunted Woods Hunt",
    category: "dailies",
    timingType: "DAILY_LIMIT",
    maxPerDay: 2,
    notes: "Twice per day; account age required",
    links: [
      {
        label: "Haunted Woods Hunt",
        url: "https://www.neopets.com/halloween/haunted_woods_hunt.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "test_your_strength",
    name: "Test Your Strength",
    category: "games",
    timingType: "COOLDOWN",
    cooldownMinutes: 360,
    notes: "Every 6 hours",
    links: [
      {
        label: "Play Test Your Strength",
        url: "https://www.neopets.com/halloween/strtest/index.phtml",
        kind: "action",
      },
      {
        label: "Auto-Play Test Your Strength",
        url: "https://www.neopets.com/halloween/strtest/process_strtest.phtml",
        kind: "helper",
        tooltip: "Use if flash is broken",
      },
    ],
  },
  {
    id: "buried_treasure",
    name: "Buried Treasure",
    category: "games",
    timingType: "COOLDOWN",
    cooldownMinutes: 180,
    notes: "Every 3 hours",
    links: [
      {
        label: "Buried Treasure",
        url: "https://www.neopets.com/pirates/buriedtreasure/index.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "lever_of_doom",
    name: "Lever of Doom",
    category: "misc",
    timingType: "CONDITIONAL",
    requirements: [],
    notes: "Unlimited — purely for fun.",
    links: [
      {
        label: "Lever of Doom",
        url: "https://www.neopets.com/space/strangelever.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "bargain_stocks",
    name: "Bargain Stocks",
    category: "utilities",
    timingType: "CONDITIONAL",
    requirements: [],
    notes: "Shows stocks priced at 15 NP or lower.",
    links: [
      {
        label: "Bargain Stocks",
        url: "https://www.neopets.com/stockmarket.phtml?type=list&search=%&bargain=true",
        kind: "action",
      },
    ],
  },
  {
    id: "bagatelle",
    name: "Bagatelle",
    category: "games",
    timingType: "DAILY_LIMIT",
    maxPerDay: 20,
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    links: [
      {
        label: "Play",
        url: "https://www.neopets.com/halloween/bagatelle.phtml",
        kind: "action",
      },
      {
        label: "Auto-Play",
        url: "https://www.neopets.com/halloween/process_bagatelle.phtml",
        kind: "helper",
        tooltip: "Use if Flash is broken",
      },
    ],
  },
  {
    id: "cork_gun_gallery",
    name: "Cork Gun Gallery",
    category: "games",
    timingType: "DAILY_LIMIT",
    maxPerDay: 20,
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    notes:
      "Up to 20 plays per day. Flash may not work; auto-play link supported.",
    links: [
      {
        label: "Play Cork Gun",
        url: "https://www.neopets.com/halloween/corkgun.phtml",
        kind: "action",
      },
      {
        label: "Auto-Play Cork Gun",
        url: "https://www.neopets.com/halloween/process_corkgun.phtml",
        kind: "action",
        tooltip: "Use if flash is broken",
      },
    ],
  },
  {
    id: "coconut_shy",
    name: "Coconut Shy",
    category: "games",
    timingType: "DAILY_LIMIT",
    maxPerDay: 20,
    resetTimezone: "America/Los_Angeles",
    resetHour: 0,
    notes:
      "Up to 20 plays per day. Flash may not work; auto-play links supported.",
    links: [
      {
        label: "Coconut Shy",
        url: "https://www.neopets.com/halloween/coconutshy.phtml",
        kind: "action",
      },
      {
        label: "Auto-Play Coconut Shy",
        url: "https://www.neopets.com/halloween/process_cocoshy.phtml?coconut=1",
        kind: "helper",
        tooltip: "Replace coconut number to play different coconuts",
      },
    ],
  },

  // ------------------
  // UTILITIES
  // ------------------
  {
    id: "shop_till",
    name: "Shop Till",
    category: "utilities",
    timingType: "STATIC",
    notes: "Always available",
    links: [
      {
        label: "Shop Till",
        url: "https://www.neopets.com/market.phtml?type=till",
        kind: "action",
      },
    ],
  },

  // ------------------
  // WHEELS
  // ------------------
  {
    id: "wheel_of_mediocrity",
    name: "Wheel of Mediocrity",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 40,
    bufferMinutes: 2,
    links: [
      {
        label: "Wheel of Mediocrity",
        url: "https://www.neopets.com/prehistoric/mediocrity.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "wheel_of_excitement",
    name: "Wheel of Excitement",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 120,
    bufferMinutes: 5,
    links: [
      {
        label: "Wheel of Excitement",
        url: "https://www.neopets.com/faerieland/wheel.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "wheel_of_knowledge",
    name: "Wheel of Knowledge",
    category: "wheels",
    timingType: "DAILY_LIMIT",
    maxPerDay: 2,
    cooldownMinutes: 60,
    bufferMinutes: 5,
    links: [
      {
        label: "Wheel of Knowledge",
        url: "https://www.neopets.com/medieval/knowledge.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "wheel_of_misfortune",
    name: "Wheel of Misfortune",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 120,
    bufferMinutes: 5,
    links: [
      {
        label: "Wheel of Misfortune",
        url: "https://www.neopets.com/halloween/wheel/index.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "wheel_of_monotony",
    name: "Wheel of Monotony",
    category: "wheels",
    timingType: "DAILY_LIMIT",
    maxPerDay: 2,
    cooldownMinutes: 240,
    bufferMinutes: 10,
    notes: "Can take a very long time to complete",
    links: [
      {
        label: "Wheel of Monotony",
        url: "https://www.neopets.com/prehistoric/monotony.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "wheel_of_extravagance",
    name: "Wheel of Extravagance",
    category: "wheels",
    timingType: "COOLDOWN",
    cooldownMinutes: 360,
    bufferMinutes: 10,
    links: [
      {
        label: "Wheel of Extravagance",
        url: "https://www.neopets.com/desert/extravagance.phtml",
        kind: "action",
      },
    ],
  },
  {
    id: "wheel_of_starlight",
    name: "Wheel of Starlight",
    category: "wheels",
    timingType: "DAILY_RESET",
    resetTimezone: "America/Los_Angeles",
    notes: "Premium only",
    resetHour: 0,
    links: [
      {
        label: "Wheel of Starlight",
        url: "https://www.neopets.com/premium/wheel.phtml",
        kind: "action",
      },
    ],
  },
];
