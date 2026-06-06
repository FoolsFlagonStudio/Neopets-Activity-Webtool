import type { ShopDefinition } from "../types/restock";

// neopetsTypeId = the obj_type query param on /objects.phtml?type=shop&obj_type=N
// itemdbSlug    = the path segment on itemdb.com.br/restock/<slug>

export const SHOPS: ShopDefinition[] = [

  // ── Collectibles ──────────────────────────────────────────────────────────
  { id: "collectable_card_shop",   name: "Collectible Card Shop",   category: "Collectibles", neopetsTypeId: 8,  itemdbSlug: "collectable-card-shop" },
  { id: "neopian_post_office",     name: "Neopian Post Office",     category: "Collectibles", neopetsTypeId: 58, itemdbSlug: "neopian-post-office" },
  { id: "collectable_coins",       name: "Collectable Coins",       category: "Collectibles", neopetsTypeId: 68, itemdbSlug: "collectable-coins" },
  { id: "collectible_sea_shells",  name: "Collectible Sea Shells",  category: "Collectibles", neopetsTypeId: 86, itemdbSlug: "collectible-sea-shells" },

  // ── Food ──────────────────────────────────────────────────────────────────
  { id: "neopian_fresh_foods",             name: "Neopian Fresh Foods",           category: "Food", neopetsTypeId: 1,   itemdbSlug: "neopian-fresh-foods" },
  { id: "chocolate_factory",               name: "Chocolate Factory",             category: "Food", neopetsTypeId: 14,  itemdbSlug: "chocolate-factory" },
  { id: "the_bakery",                      name: "The Bakery",                    category: "Food", neopetsTypeId: 15,  itemdbSlug: "the-bakery" },
  { id: "neopian_health_foods",            name: "Neopian Health Foods",          category: "Food", neopetsTypeId: 16,  itemdbSlug: "neopian-health-foods" },
  { id: "smoothie_store",                  name: "Smoothie Store",                category: "Food", neopetsTypeId: 18,  itemdbSlug: "smoothie-store" },
  { id: "tropical_food_shop",              name: "Tropical Food Shop",            category: "Food", neopetsTypeId: 20,  itemdbSlug: "tropical-food-shop" },
  { id: "grundos_cafe",                    name: "Grundo's Cafe",                 category: "Food", neopetsTypeId: 22,  itemdbSlug: "grundos-cafe" },
  { id: "spooky_food",                     name: "Spooky Food",                   category: "Food", neopetsTypeId: 30,  itemdbSlug: "spooky-food" },
  { id: "coffee_cave",                     name: "Coffee Cave",                   category: "Food", neopetsTypeId: 34,  itemdbSlug: "the-coffee-cave" },
  { id: "slushie_shop",                    name: "Slushie Shop",                  category: "Food", neopetsTypeId: 35,  itemdbSlug: "slushie-shop" },
  { id: "super_happy_icy_fun_snow_shop",   name: "Super Happy Icy Fun Snow Shop", category: "Food", neopetsTypeId: 37,  itemdbSlug: "super-happy-icy-fun-snow-shop" },
  { id: "faerie_foods",                    name: "Faerie Foods",                  category: "Food", neopetsTypeId: 39,  itemdbSlug: "faerie-foods" },
  { id: "tyrannian_foods",                 name: "Tyrannian Foods",               category: "Food", neopetsTypeId: 42,  itemdbSlug: "tyrannian-foods" },
  { id: "huberts_hot_dogs",               name: "Hubert's Hot Dogs",             category: "Food", neopetsTypeId: 46,  itemdbSlug: "huberts-hot-dogs" },
  { id: "pizzaroo",                        name: "Pizzaroo",                      category: "Food", neopetsTypeId: 47,  itemdbSlug: "pizzaroo" },
  { id: "lost_desert_foods",              name: "Lost Desert Foods",             category: "Food", neopetsTypeId: 49,  itemdbSlug: "lost-desert-foods" },
  { id: "merifoods",                       name: "Merifoods",                     category: "Food", neopetsTypeId: 56,  itemdbSlug: "merifoods" },
  { id: "jelly_foods",                     name: "Jelly Foods",                   category: "Food", neopetsTypeId: 62,  itemdbSlug: "jelly-foods" },
  { id: "refreshments",                    name: "Refreshments",                  category: "Food", neopetsTypeId: 63,  itemdbSlug: "refreshments" },
  { id: "kiko_lake_treats",               name: "Kiko Lake Treats",              category: "Food", neopetsTypeId: 66,  itemdbSlug: "kiko-lake-treats" },
  { id: "cafe_kreludor",                   name: "Cafe Kreludor",                 category: "Food", neopetsTypeId: 72,  itemdbSlug: "cafe-kreludor" },
  { id: "brightvale_fruits",              name: "Brightvale Fruits",             category: "Food", neopetsTypeId: 81,  itemdbSlug: "brightvale-fruits" },
  { id: "qasalan_delights",               name: "Qasalan Delights",              category: "Food", neopetsTypeId: 90,  itemdbSlug: "qasalan-delights" },
  { id: "exquisite_ambrosia",             name: "Exquisite Ambrosia",            category: "Food", neopetsTypeId: 95,  itemdbSlug: "exquisite-ambrosia" },
  { id: "exotic_foods",                   name: "Exotic Foods",                  category: "Food", neopetsTypeId: 101, itemdbSlug: "exotic-foods" },
  { id: "crumpetmonger",                  name: "The Crumpetmonger",             category: "Food", neopetsTypeId: 105, itemdbSlug: "the-crumpetmonger" },
  { id: "molten_morsels",                 name: "Molten Morsels",                category: "Food", neopetsTypeId: 112, itemdbSlug: "molten-morsels" },

  // ── Battledome ────────────────────────────────────────────────────────────
  { id: "battle_magic",            name: "Battle Magic",            category: "Battledome", neopetsTypeId: 9,  itemdbSlug: "battle-magic" },
  { id: "defense_magic",           name: "Defense Magic",           category: "Battledome", neopetsTypeId: 10, itemdbSlug: "defense-magic" },
  { id: "space_weaponry",          name: "Space Weaponry",          category: "Battledome", neopetsTypeId: 23, itemdbSlug: "space-weaponry" },
  { id: "space_armour",            name: "Space Armour",            category: "Battledome", neopetsTypeId: 24, itemdbSlug: "space-armour" },
  { id: "ice_crystal_shop",        name: "Ice Crystal Shop",        category: "Battledome", neopetsTypeId: 36, itemdbSlug: "ice-crystal-shop" },
  { id: "tyrannian_weaponry",      name: "Tyrannian Weaponry",      category: "Battledome", neopetsTypeId: 45, itemdbSlug: "tyrannian-weaponry" },
  { id: "sakhmet_battle_supplies", name: "Sakhmet Battle Supplies", category: "Battledome", neopetsTypeId: 54, itemdbSlug: "sakhmet-battle-supplies" },
  { id: "haunted_weaponry",        name: "Haunted Weaponry",        category: "Battledome", neopetsTypeId: 59, itemdbSlug: "haunted-weaponry" },
  { id: "the_scrollery",           name: "The Scrollery",           category: "Battledome", neopetsTypeId: 78, itemdbSlug: "the-scrollery" },
  { id: "brightvale_armoury",      name: "Brightvale Armoury",      category: "Battledome", neopetsTypeId: 80, itemdbSlug: "brightvale-armoury" },
  { id: "maractite_marvels",       name: "Maractite Marvels",       category: "Battledome", neopetsTypeId: 87, itemdbSlug: "maractite-marvels" },
  { id: "desert_arms",             name: "Desert Arms",             category: "Battledome", neopetsTypeId: 91, itemdbSlug: "desert-arms" },
  { id: "faerie_weapon_shop",      name: "Faerie Weapon Shop",      category: "Battledome", neopetsTypeId: 93, itemdbSlug: "faerie-weapon-shop" },
  { id: "illustrious_armoury",     name: "Illustrious Armoury",     category: "Battledome", neopetsTypeId: 94, itemdbSlug: "illustrious-armoury" },
  { id: "magical_marvels",         name: "Magical Marvels",         category: "Battledome", neopetsTypeId: 96, itemdbSlug: "magical-marvels" },
  { id: "wonderous_weaponry",      name: "Wondrous Weaponry",       category: "Battledome", neopetsTypeId: 100, itemdbSlug: "wonderous-weaponry" },

  // ── Books ─────────────────────────────────────────────────────────────────
  { id: "magical_bookshop",        name: "Magical Bookshop",        category: "Books", neopetsTypeId: 7,   itemdbSlug: "magical-bookshop" },
  { id: "faerieland_bookshop",     name: "Faerieland Bookshop",     category: "Books", neopetsTypeId: 38,  itemdbSlug: "faerieland-bookshop" },
  { id: "suteks_scrolls",          name: "Sutek's Scrolls",         category: "Books", neopetsTypeId: 51,  itemdbSlug: "suteks-scrolls" },
  { id: "booktastic_books",        name: "Booktastic Books",        category: "Books", neopetsTypeId: 70,  itemdbSlug: "booktastic-books" },
  { id: "brightvale_books",        name: "Brightvale Books",        category: "Books", neopetsTypeId: 77,  itemdbSlug: "brightvale-books" },
  { id: "words_of_antiquity",      name: "Words of Antiquity",      category: "Books", neopetsTypeId: 92,  itemdbSlug: "words-of-antiquity" },
  { id: "neovian_printing_press",  name: "Neovian Printing Press",  category: "Books", neopetsTypeId: 106, itemdbSlug: "neovian-printing-press" },

  // ── Clothes ───────────────────────────────────────────────────────────────
  { id: "unis_clothing_shop",          name: "Uni's Clothing Shop",          category: "Clothes", neopetsTypeId: 4,   itemdbSlug: "unis-clothing-shop" },
  { id: "prigpants_swolthy_tailors",   name: "Prigpants & Swolthy Tailors",  category: "Clothes", neopetsTypeId: 107, itemdbSlug: "prigpants-swolthy-tailors" },
  { id: "mystical_surroundings",       name: "Mystical Surroundings",        category: "Clothes", neopetsTypeId: 108, itemdbSlug: "mystical-surroundings" },
  { id: "cogs_togs",                   name: "Cog's Togs",                   category: "Clothes", neopetsTypeId: 111, itemdbSlug: "cogs-togs" },
  { id: "ugga_shinies",                name: "Ugga Shinies",                 category: "Clothes", neopetsTypeId: 117, itemdbSlug: "ugga-shinies" },

  // ── Furniture ─────────────────────────────────────────────────────────────
  { id: "neopian_garden_centre",   name: "Neopian Garden Centre",   category: "Furniture", neopetsTypeId: 12,  itemdbSlug: "neopian-garden-centre" },
  { id: "neopian_furniture",       name: "Neopian Furniture",       category: "Furniture", neopetsTypeId: 41,  itemdbSlug: "neopian-furniture" },
  { id: "tyrannian_furniture",     name: "Tyrannian Furniture",     category: "Furniture", neopetsTypeId: 43,  itemdbSlug: "tyrannian-furniture" },
  { id: "osiris_pottery",          name: "Osiris Pottery",          category: "Furniture", neopetsTypeId: 55,  itemdbSlug: "osiris-pottery" },
  { id: "spooky_furniture",        name: "Spooky Furniture",        category: "Furniture", neopetsTypeId: 60,  itemdbSlug: "spooky-furniture" },
  { id: "kiko_lake_carpentry",     name: "Kiko Lake Carpentry",     category: "Furniture", neopetsTypeId: 67,  itemdbSlug: "kiko-lake-carpentry" },
  { id: "kreludan_homes",          name: "Kreludan Homes",          category: "Furniture", neopetsTypeId: 71,  itemdbSlug: "kreludan-homes" },
  { id: "faerie_furniture",        name: "Faerie Furniture",        category: "Furniture", neopetsTypeId: 75,  itemdbSlug: "faerie-furniture" },
  { id: "brightvale_glaziers",     name: "Brightvale Glaziers",     category: "Furniture", neopetsTypeId: 79,  itemdbSlug: "brightvale-glaziers" },
  { id: "chesterdrawers_antiques", name: "Chesterdrawers Antiques", category: "Furniture", neopetsTypeId: 104, itemdbSlug: "chesterdrawers-antiques" },
  { id: "lampwycks_lights_fantastic", name: "Lampwyck's Lights Fantastic", category: "Furniture", neopetsTypeId: 110, itemdbSlug: "lampwycks-lights-fantastic" },

  // ── Other ─────────────────────────────────────────────────────────────────
  { id: "grooming_parlour",        name: "Grooming Parlour",        category: "Other", neopetsTypeId: 5,  itemdbSlug: "grooming-parlour" },
  { id: "tiki_tack",               name: "Tiki Tack",               category: "Other", neopetsTypeId: 21, itemdbSlug: "tiki-tack" },
  { id: "neopian_school_supplies", name: "Neopian School Supplies", category: "Other", neopetsTypeId: 53, itemdbSlug: "neopian-school-supplies" },
  { id: "roo_island_souvenirs",    name: "Roo Island Souvenirs",    category: "Other", neopetsTypeId: 76, itemdbSlug: "roo-island-souvenirs" },
  { id: "neopian_music_shop",      name: "Neopian Music Shop",      category: "Other", neopetsTypeId: 84, itemdbSlug: "neopian-music-shop" },

  // ── Petpets ───────────────────────────────────────────────────────────────
  { id: "the_neopian_petpet_shop", name: "The Neopian Petpet Shop", category: "Petpets", neopetsTypeId: 25,  itemdbSlug: "the-neopian-petpet-shop" },
  { id: "the_robo_petpet_shop",    name: "The Robo-Petpet Shop",    category: "Petpets", neopetsTypeId: 26,  itemdbSlug: "the-robo-petpet-shop" },
  { id: "the_rock_pool",           name: "The Rock Pool",           category: "Petpets", neopetsTypeId: 27,  itemdbSlug: "the-rock-pool" },
  { id: "spooky_petpets",          name: "Spooky Petpets",          category: "Petpets", neopetsTypeId: 31,  itemdbSlug: "spooky-petpets" },
  { id: "faerieland_petpets",      name: "Faerieland Petpets",      category: "Petpets", neopetsTypeId: 40,  itemdbSlug: "faerieland-petpets" },
  { id: "tyrannian_petpets",       name: "Tyrannian Petpets",       category: "Petpets", neopetsTypeId: 44,  itemdbSlug: "tyrannian-petpets" },
  { id: "peopatras_petpets",       name: "Peopatra's Petpets",      category: "Petpets", neopetsTypeId: 50,  itemdbSlug: "peopatras-petpets" },
  { id: "ye_olde_petpets",         name: "Ye Olde Petpets",         category: "Petpets", neopetsTypeId: 57,  itemdbSlug: "ye-olde-petpets" },
  { id: "wintery_petpets",         name: "Wintery Petpets",         category: "Petpets", neopetsTypeId: 61,  itemdbSlug: "wintery-petpets" },
  { id: "petpet_supplies",         name: "Petpet Supplies",         category: "Petpets", neopetsTypeId: 69,  itemdbSlug: "petpet-supplies" },
  { id: "maraquan_petpets",        name: "Maraquan Petpets",        category: "Petpets", neopetsTypeId: 88,  itemdbSlug: "maraquan-petpets" },
  { id: "geraptiku_petpets",       name: "Geraptiku Petpets",       category: "Petpets", neopetsTypeId: 89,  itemdbSlug: "geraptiku-petpets" },
  { id: "legendary_petpets",       name: "Legendary Petpets",       category: "Petpets", neopetsTypeId: 97,  itemdbSlug: "legendary-petpets" },
  { id: "fanciful_fauna",          name: "Fanciful Fauna",          category: "Petpets", neopetsTypeId: 103, itemdbSlug: "fanciful-fauna" },
  { id: "moltaran_petpets",        name: "Moltaran Petpets",        category: "Petpets", neopetsTypeId: 113, itemdbSlug: "moltaran-petpets" },

  // ── Potions ───────────────────────────────────────────────────────────────
  { id: "kauvaras_magic_shop",     name: "Kauvara's Magic Shop",    category: "Potions", neopetsTypeId: 2,   itemdbSlug: "kauvaras-magic-shop" },
  { id: "neopian_pharmacy",        name: "Neopian Pharmacy",        category: "Potions", neopetsTypeId: 13,  itemdbSlug: "neopian-pharmacy" },
  { id: "kaylas_potion_shop",      name: "Kayla's Potion Shop",     category: "Potions", neopetsTypeId: 73,  itemdbSlug: "kaylas-potion-shop" },
  { id: "royal_potionery",         name: "Royal Potionery",         category: "Potions", neopetsTypeId: 83,  itemdbSlug: "royal-potionery" },
  { id: "lost_desert_medicine",    name: "Lost Desert Medicine",    category: "Potions", neopetsTypeId: 85,  itemdbSlug: "lost-desert-medicine" },
  { id: "remarkable_restoratives", name: "Remarkable Restoratives", category: "Potions", neopetsTypeId: 102, itemdbSlug: "remarkable-restoratives" },

  // ── Toys ──────────────────────────────────────────────────────────────────
  { id: "toy_shop",                name: "Toy Shop",                category: "Toys", neopetsTypeId: 3,   itemdbSlug: "toy-shop" },
  { id: "neopian_gift_shop",       name: "Neopian Gift Shop",       category: "Toys", neopetsTypeId: 17,  itemdbSlug: "neopian-gift-shop" },
  { id: "usukiland",               name: "Usukiland",               category: "Toys", neopetsTypeId: 48,  itemdbSlug: "usukiland" },
  { id: "darigan_toys",            name: "Darigan Toys",            category: "Toys", neopetsTypeId: 74,  itemdbSlug: "darigan-toys" },
  { id: "plushie_palace",          name: "Plushie Palace",          category: "Toys", neopetsTypeId: 98,  itemdbSlug: "plushie-palace" },
  { id: "springy_things",          name: "Springy Things",          category: "Toys", neopetsTypeId: 116, itemdbSlug: "springy-things" },

];

export function getShopByTypeId(typeId: number): ShopDefinition | undefined {
  return SHOPS.find((s) => s.neopetsTypeId === typeId);
}

export function getShopBySlug(slug: string): ShopDefinition | undefined {
  return SHOPS.find((s) => s.itemdbSlug === slug);
}

export function getShopById(id: string): ShopDefinition | undefined {
  return SHOPS.find((s) => s.id === id);
}

export function groupedShops(): Record<string, ShopDefinition[]> {
  const groups: Record<string, ShopDefinition[]> = {};
  for (const shop of SHOPS) {
    if (!groups[shop.category]) groups[shop.category] = [];
    groups[shop.category].push(shop);
  }
  return groups;
}
