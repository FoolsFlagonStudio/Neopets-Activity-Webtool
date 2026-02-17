function alreadyReported(key: string): boolean {
  return sessionStorage.getItem(key) === "1";
}

function markReported(key: string): void {
  sessionStorage.setItem(key, "1");
}

function incrementDailyOnce(sessionKey: string, activityId: string): void {
  if (sessionStorage.getItem(sessionKey) === "1") return;

  chrome.runtime.sendMessage({
    type: "INCREMENT_DAILY_COUNT",
    activityId,
  });

  sessionStorage.setItem(sessionKey, "1");
}

type RepeatableTakeConfig = {
  activityId: string;
  pathMatch: string;
  successText: string;
  getPageText: () => string;
};

function getQueryParam(name: string): string | null {
  return new URLSearchParams(location.search).get(name);
}

function detectSecondHandShoppeTake() {
  if (!location.pathname.includes("/thriftshoppe/take_donation.phtml")) return;

  const sessionKey = "secondhand_shoppe_attempt";

  const text = pageText();

  const success = text.includes("you got it");
  const failure =
    text.includes("someone else got it") || text.includes("nothing left");

  if (success && !sessionStorage.getItem(sessionKey)) {
    console.log("[NAT] Second-Hand Shoppe item taken");

    chrome.runtime.sendMessage({
      type: "INCREMENT_DAILY_COUNT",
      activityId: "money_tree",
    });

    sessionStorage.setItem(sessionKey, "1");
    return;
  }

  if (!success && !failure) {
    sessionStorage.removeItem(sessionKey);
  }
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function detectDonationTake(activityId: string) {
  if (!location.pathname.includes("takedonation_new.phtml")) return;

  const donationId = getQueryParam("donation_id");
  const locationId = getQueryParam("location_id");
  if (!donationId || !locationId) return;

  const sessionKey = `${activityId}_donation_${donationId}`;
  if (sessionStorage.getItem(sessionKey)) return;

  const container = document.getElementById("container__2020") ?? document.body;

  const readPage = () => normalizeText(container.innerText || "");

  const SUCCESS = "yeah! you got it";
  const FAILURE = [
    "oops! too late",
    "somebody seems to have taken that item",
    "too slow",
    "pondering",
  ];

  const check = () => {
    const text = readPage();

    console.log("[NAT][MoneyTree] Read text:", text);

    if (FAILURE.some((f) => text.includes(f))) {
      sessionStorage.setItem(sessionKey, "fail");
      return true;
    }

    if (text.includes(SUCCESS)) {
      console.log("[NAT] Money Tree success", donationId);

      chrome.runtime.sendMessage({
        type: "INCREMENT_DAILY_COUNT",
        activityId,
      });

      sessionStorage.setItem(sessionKey, "success");
      return true;
    }

    return false;
  };

  // ✅ synchronous check (most important)
  if (check()) return;

  // ✅ fallback observer
  const observer = new MutationObserver(() => {
    if (check()) observer.disconnect();
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

export function detectRepeatableTake({
  activityId,
  pathMatch,
  successText,
}: {
  activityId: string;
  pathMatch: string;
  successText: string;
}) {
  if (!location.pathname.includes(pathMatch)) return;

  const text = pageText();
  const success = text.includes(successText);

  const sessionKey = `repeat_${activityId}`;
  const pageFingerprint = text.slice(0, 600);

  const lastFingerprint = sessionStorage.getItem(sessionKey);

  if (success && lastFingerprint !== pageFingerprint) {
    chrome.runtime.sendMessage({
      type: "INCREMENT_DAILY_COUNT",
      activityId,
    });

    sessionStorage.setItem(sessionKey, pageFingerprint);
    return;
  }

  if (!success) {
    sessionStorage.removeItem(sessionKey);
  }
}

function getPageText(): string {
  const modern = document.querySelector<HTMLElement>("#container__2020");
  if (modern) {
    return modern.innerText.toLowerCase();
  }

  const legacy = document.querySelector<HTMLElement>("#content");
  if (legacy) {
    return legacy.innerText.toLowerCase();
  }

  return document.body.innerText.toLowerCase();
}

function pageText(): string {
  return getPageText();
}

function autoComplete(activityId: string): void {
  chrome.runtime.sendMessage({
    type: "AUTO_MARK_COMPLETED",
    activityId,
  });
}

function incrementDaily(activityId: string): void {
  chrome.runtime.sendMessage({
    type: "INCREMENT_DAILY_COUNT",
    activityId,
  });
}

function detectStandardDaily(
  activityId: string,
  pathMatch: string,
  completed: () => boolean,
): void {
  if (!location.pathname.includes(pathMatch)) return;
  if (alreadyReported(activityId)) return;

  if (completed()) {
    console.log(`[NAT] ${activityId} completed`);
    autoComplete(activityId);
    markReported(activityId);
  }
}

function parseRemainingTime(text: string): number {
  let ms = 0;

  const hourMatch = text.match(/(\d+)\s*hour/);
  const minuteMatch = text.match(/(\d+)\s*minute/);
  const secondMatch = text.match(/(\d+)\s*second/);

  if (hourMatch) ms += Number(hourMatch[1]) * 60 * 60 * 1000;
  if (minuteMatch) ms += Number(minuteMatch[1]) * 60 * 1000;
  if (secondMatch) ms += Number(secondMatch[1]) * 1000;

  return ms;
}

export function detectDailyCollect(): void {
  const text = pageText();

  // -------- FREE JELLY --------
  detectStandardDaily(
    "free_jelly",
    "/jelly/jelly.phtml",
    () =>
      pageText().includes("you take some") ||
      pageText().includes("the jelly keeper") ||
      pageText().includes("remember... only one helping per day"),
  );

  // -------- GIANT OMELETTE --------
  detectStandardDaily(
    "giant_omelette",
    "/prehistoric/omelette.phtml",
    () =>
      pageText().includes("take a slice") ||
      pageText().includes("manage to take a slice"),
  );

  // ---------------- Bank Interest ----------------
  detectStandardDaily(
    "bank_interest",
    "/bank.phtml",
    () =>
      pageText().includes("collected") && pageText().includes("np interest"),
  );

  // Money Tree + Rubbish Dump
  requestAnimationFrame(() => detectDonationTake("money_tree"));
  setTimeout(() => detectDonationTake("money_tree"), 50);

  // Secondhand Shoppe
  detectSecondHandShoppeTake();

  // ---------------- Shop of Offers ----------------
  detectStandardDaily(
    "shop_of_offers",
    "/shop_of_offers.phtml",
    () =>
      pageText().includes("something has happened") &&
      pageText().includes("very rich slorg"),
  );

  // ---------------- Trudy’s Surprise ----------------
  if (location.pathname.includes("/trudys_surprise.phtml")) {
    if (alreadyReported("trudys_surprise")) return;

    const observer = new MutationObserver(() => {
      const title = document.getElementById("trudyPrizeTitle");
      const text = document.getElementById("trudyPrizeText");

      const combined = `${title?.textContent ?? ""} ${
        text?.textContent ?? ""
      }`.toLowerCase();

      if (combined.includes("won") || combined.includes("come back tomorrow")) {
        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "trudys_surprise",
        });

        markReported("trudys_surprise");
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // ---------------- Monthly Freebies ----------------
  detectStandardDaily("monthly_freebies", "/freebies/index.phtml", () => true);

  // ---------------- Obsidian Quarry ----------------
  if (location.pathname.includes("/magma/quarry.phtml")) {
    if (!alreadyReported("obsidian_quarry")) {
      const text = pageText();

      const successText =
        text.includes("pick up a chunk of obsidian") ||
        text.includes("has been added to your inventory");

      const blockedText =
        text.includes("stop taking all the obsidian") ||
        text.includes("already taken");

      // Structural fallback: no pickup button
      const hasPickupAction = document.querySelector(
        "input[type='submit'], button",
      );

      if (successText || blockedText || !hasPickupAction) {
        console.log("[NAT] Obsidian Quarry completed or unavailable");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "obsidian_quarry",
        });

        markReported("obsidian_quarry");
      }
    }
  }

  // ---------------- Apple Bobbing ----------------
  detectStandardDaily("apple_bobbing", "/halloween/applebobbing.phtml", () => {
    const bobContent = document.getElementById("bob_content");
    return !!bobContent && !!bobContent.textContent?.trim();
  });

  // ---------------- Anchor Management ----------------
  if (location.pathname.includes("/pirates/anchormanagement.phtml")) {
    if (!alreadyReported("anchor_management")) {
      const container = document.body;

      const observer = new MutationObserver(() => {
        const t = pageText();

        const hasResult =
          (t.includes("krawken") &&
            (t.includes("left you") ||
              t.includes("memento") ||
              t.includes("retreats") ||
              t.includes("sneaky"))) ||
          t.includes("never been safer") ||
          t.includes(
            "At long last, Krawk Island has been restored and is now better than ever!",
          );

        if (hasResult) {
          console.log("[NAT] Anchor Management completed");

          autoComplete("anchor_management");
          markReported("anchor_management");
          observer.disconnect();
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  // ---------------- Mysterious Negg Cave ----------------
  if (location.pathname.includes("/shenkuu/neggcave")) {
    if (alreadyReported("mysterious_negg_cave")) return;

    const observer = new MutationObserver(() => {
      const successPopup = document.getElementById("mnc_popup_generic_correct");
      const text = document.body.textContent?.toLowerCase() ?? "";

      if (successPopup && !text.includes("already completed")) {
        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "mysterious_negg_cave",
        });

        markReported("mysterious_negg_cave");
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ---------------- Grave Danger ----------------
  if (location.pathname.includes("/halloween/gravedanger")) {
    const remainingEl = document.getElementById("gdRemaining");

    if (remainingEl?.textContent) {
      const remainingMs = parseRemainingTime(
        remainingEl.textContent.toLowerCase(),
      );

      if (remainingMs > 0) {
        const availableAt = Date.now() + remainingMs;

        console.log("[NAT] Grave Danger cooldown set", remainingMs);

        chrome.runtime.sendMessage({
          type: "SET_VARIABLE_COOLDOWN",
          activityId: "grave_danger",
          availableAt,
        });
      }
    }
  }
  // ---------------- Scratchcards (shared) ----------------
  if (
    location.pathname.includes("/winter/kiosk.phtml") ||
    location.pathname.includes("/halloween/scratch.phtml") ||
    location.pathname.includes("/desert/scratch.phtml")
  ) {
    const text = pageText();

    const bought =
      text.includes("thanks for buying a scratchcard") ||
      text.includes("thanksss for buying a ssscratchcard");

    if (bought) {
      console.log("[NAT] Scratchcard purchased");

      chrome.runtime.sendMessage({
        type: "AUTO_MARK_COMPLETED",
        activityId: "scratchcard_shared",
      });
    }
  }

  // ---------------- Wheel of Starlight ----------------
  detectStandardDaily("wheel_of_starlight", "/premium/wheel.phtml", () =>
    pageText().includes("stopped orbiting"),
  );

  // ---------------- Tombola ----------------
  detectStandardDaily("tombola", "/island/tombola2", () =>
    pageText().includes("you put your hand into the tombola"),
  );

  // ---------------- Snowager ----------------
  detectStandardDaily("snowager", "/winter/snowager.phtml", () => {
    const t = pageText();
    return (
      t.includes("you carefully walk in") ||
      t.includes("rooooaarrr") ||
      t.includes("the snowager moves slightly") ||
      t.includes("the snowager awakes")
    );
  });

  // ---------------- Guess the Marrow ----------------
  detectStandardDaily(
    "guess_the_marrow",
    "/medieval/guessmarrow.phtml",
    () => pageText().includes("right!") || pageText().includes("wrong!"),
  );

  // ---------------- Wise Old King ----------------
  detectStandardDaily("wise_old_king", "/medieval/wiseking.phtml", () =>
    pageText().includes("king hagan listens contently"),
  );

  // ---------------- Grumpy Old King ----------------
  if (location.pathname.includes("/medieval/grumpyking.phtml")) {
    const sessionKey = "grumpy_attempt";

    const text = pageText();

    const success = text.includes("king skarl listens as you tell your joke");
    const locked = text.includes("already told me a joke today");

    if (!sessionStorage.getItem(sessionKey) && success) {
      chrome.runtime.sendMessage({
        type: "AUTO_MARK_COMPLETED",
        activityId: "grumpy_old_king",
      });

      sessionStorage.setItem(sessionKey, "1");
    }

    if (locked) {
      chrome.runtime.sendMessage({
        type: "AUTO_MARK_LOCKED",
        activityId: "grumpy_old_king",
      });
    }

    if (!success && !locked) {
      sessionStorage.removeItem(sessionKey);
    }
  }

  // ---------------- Deserted Tomb ----------------
  if (
    location.pathname.includes("/worlds/geraptiku/tomb.phtml") ||
    location.pathname.includes("/worlds/geraptiku/process_tomb.phtml")
  ) {
    if (!alreadyReported("deserted_tomb")) {
      const text = pageText();

      const completed =
        text.includes("fiddlesticks!") ||
        text.includes("rawr") ||
        text.includes("me hungry") ||
        text.includes("oh no!") ||
        text.includes("eep!") ||
        text.includes("eureka!") ||
        text.includes("weren't you here earlier") ||
        text.includes("had enough excitement");

      if (completed) {
        console.log("[NAT] Deserted Tomb completed or already used");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "deserted_tomb",
        });

        markReported("deserted_tomb");
      }
    }
  }

  // ---------------- Fruit Machine ----------------
  if (location.pathname.includes("/desert/fruit/index.phtml")) {
    if (!alreadyReported("fruit_machine")) {
      const container = document.body;

      const observer = new MutationObserver(() => {
        const text = pageText();

        const spinning = text.includes("round and round and round they go");

        const completed =
          text.includes("congratulations") ||
          text.includes("not a winning spin");

        // Only mark after a spin actually happened
        if (spinning || completed) {
          if (completed) {
            console.log("[NAT] Fruit Machine completed");

            chrome.runtime.sendMessage({
              type: "AUTO_MARK_COMPLETED",
              activityId: "fruit_machine",
            });

            markReported("fruit_machine");
            observer.disconnect();
          }
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  // ---------------- Coltzan’s Shrine ----------------
  detectStandardDaily("coltzans_shrine", "/desert/shrine.phtml", () =>
    pageText().includes("walks slowly up to the strange shrine"),
  );

  // ---------------- Kreludor Meteor ----------------
  detectStandardDaily("kreludor_meteor", "/moon/meteor.phtml", () => {
    const t = pageText();
    return (
      t.includes("meteor has cracked open") ||
      t.includes("now empty space") ||
      t.includes("meteor has gotten very very hot") ||
      t.includes("angry grundo scientist") ||
      t.includes("meteor just disappeared") ||
      t.includes("try again later")
    );
  });

  // ---------------- TDMBGPOP ----------------
  if (location.pathname.includes("/faerieland/tdmbgpop.phtml")) {
    if (alreadyReported("tdmbgpop")) return;

    const observer = new MutationObserver(() => {
      const text = document.body.textContent?.toLowerCase() ?? "";

      const completed =
        text.includes("new plushie on the ground nearby") ||
        text.includes("nothing seems to happen") ||
        text.includes("haven't you been feeding") ||
        text.includes("discarded plushie") ||
        text.includes("there is no response from the plushie") ||
        text.includes("The plushie remains") ||
        text.includes("neopoints") ||
        text.includes("is so excited");

      if (completed) {
        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "tdmbgpop",
        });

        markReported("tdmbgpop");
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // ---------------- Qasalan Expellibox ----------------
  if (
    location.pathname.includes("/games/giveaway/giveaway_game.phtml") ||
    location.pathname.includes("/games/giveaway/process_giveaway.phtml")
  ) {
    if (!alreadyReported("qasalan_expellibox")) {
      const isAutoPlayEndpoint =
        location.hostname.includes("ncmall.neopets.com") &&
        location.pathname.includes("/games/giveaway/process_giveaway.phtml");

      const text = pageText();

      const legitPlayResult =
        text.includes("the scarab travels for miles") ||
        text.includes("the scarab mysteriously disappears") ||
        text.includes("that wasn't a real scarab") ||
        text.includes("you receive") ||
        text.includes("well done") ||
        text.includes("here's something for your trouble") ||
        text.includes("have a item") ||
        text.includes("you have been awarded") ||
        text.includes("wait a second") ||
        text.includes("the scarab escapes") ||
        text.includes("splendid!") ||
        text.includes("wow, it got all the way");

      if (isAutoPlayEndpoint || legitPlayResult) {
        console.log("[NAT] Qasalan Expellibox completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "qasalan_expellibox",
        });

        markReported("qasalan_expellibox");
      }
    }
  }

  // ---------------- Lunar Puzzle ----------------
  detectStandardDaily("lunar_puzzle", "/shenkuu/lunar", () => {
    const t = pageText();
    return (
      t.includes("that is the correct answer") ||
      t.includes("only attempt my challenge once per day") ||
      t.includes("please try again tomorrow")
    );
  });

  // ---------------- Potato Counter ----------------
  detectStandardDaily(
    "potato_counter",
    "/medieval/potatocounter.phtml",
    () =>
      pageText().includes("you got it right in") ||
      pageText().includes("hehe, no there were") ||
      pageText().includes("sorry... wrong") ||
      pageText().includes("play again"),
  );

  // ---------------- Forgotten Shore ----------------
  detectStandardDaily(
    "forgotten_shore",
    "/pirates/forgottenshore.phtml",
    () => {
      const t = pageText();
      return (
        t.includes("nothing of interest to be found today") ||
        t.includes("you found something buried in the sand")
      );
    },
  );

  const HEALING_SPRINGS_PHRASES = [
    "the water faerie says a few magical words",
    "gain three hit points",
    "gain seven hit points",
    "gain ten hit points",
    "gain fifteen hit points",
    "is fully healed",
    "regains their hit points",
    "health completely restored",
  ];

  // ---------------- Healing Springs ----------------
  if (location.pathname.includes("/faerieland/springs.phtml")) {
    if (!alreadyReported("healing_springs")) {
      const text = getPageText().toLowerCase();

      const healed = HEALING_SPRINGS_PHRASES.some((phrase) =>
        text.includes(phrase),
      );

      if (healed) {
        console.log("[NAT] Healing Springs used");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "healing_springs",
        });

        markReported("healing_springs");
      }
    }
  }

  const HAUNTED_WOODS_HUNT_PHRASES = [
    "you find",
    "as you search the clearing",
    "you go to pick something unusual up",
    "something scurries underneath",
    "you try to make your way deeper into the woods",
    "something on the ground catches your eye",
    "something smells",
  ];

  // ---------------- Haunted Woods Hunt ----------------
  if (location.pathname.includes("/halloween/haunted_woods_hunt.phtml")) {
    if (!alreadyReported("haunted_woods_hunt")) {
      const text = getPageText().toLowerCase();

      const triggered = HAUNTED_WOODS_HUNT_PHRASES.some((phrase) =>
        text.includes(phrase),
      );

      if (triggered) {
        console.log("[NAT] Haunted Woods Hunt detected");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "haunted_woods_hunt",
        });

        markReported("haunted_woods_hunt");
      }
    }
  }

  // ---------------- Test Your Strength ----------------
  detectStandardDaily("test_your_strength", "/halloween/strtest", () => {
    const t = pageText();
    return (
      location.pathname.includes("process_strtest") ||
      t.includes("view prize") ||
      t.includes("congratulations")
    );
  });

  // ---------------- Buried Treasure ----------------
  detectStandardDaily(
    "buried_treasure",
    "/pirates/buriedtreasure/buriedtreasure.phtml",
    () =>
      location.search.length > 1 || pageText().includes("pulls out a ticket"),
  );
}
