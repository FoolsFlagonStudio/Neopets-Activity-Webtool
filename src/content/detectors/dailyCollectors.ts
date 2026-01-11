function alreadyReported(key: string): boolean {
  return sessionStorage.getItem(key) === "1";
}

function markReported(key: string): void {
  sessionStorage.setItem(key, "1");
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
  const text = (document.body.textContent || "").toLowerCase();

  // -------- FREE JELLY --------
  if (location.pathname.includes("/jelly/jelly.phtml")) {
    if (!alreadyReported("free_jelly")) {
      const jellyDetected =
        text.includes("you take some") ||
        text.includes("the jelly keeper") ||
        text.includes("remember... only one helping per day");

      if (jellyDetected) {
        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "free_jelly",
        });

        markReported("free_jelly");
      }
    }
  }

  // -------- GIANT OMELETTE --------
  if (location.pathname.includes("/prehistoric/omelette.phtml")) {
    if (!alreadyReported("giant_omelette")) {
      const omeletteDetected =
        text.includes("take a slice") ||
        text.includes("manage to take a slice");

      if (omeletteDetected) {
        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "giant_omelette",
        });

        markReported("giant_omelette");
      }
    }
  }

  // ---------------- Bank Interest ----------------
  if (location.pathname.includes("/bank.phtml")) {
    if (!alreadyReported("bank_interest")) {
      const completed =
        text.includes("collected") && text.includes("np interest");

      if (completed) {
        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "bank_interest",
        });

        markReported("bank_interest");
      }
    }
  }

  // ---------------- Money Tree ----------------
  if (location.pathname.includes("takedonation_new.phtml")) {
    if (!alreadyReported("money_tree_take")) {
      const text = getPageText();

      const completed = text.includes("yeah! you got it");

      if (completed) {
        console.log("[NAT] Money Tree item taken");

        chrome.runtime.sendMessage({
          type: "INCREMENT_DAILY_COUNT",
          activityId: "money_tree",
        });

        markReported("money_tree_take");
      }
    }
  }

  // ---------------- Second-Hand Shoppe ----------------
  if (location.pathname.includes("/thriftshoppe/take_donation.phtml")) {
    if (!alreadyReported("secondhand_shoppe_take")) {
      const text = getPageText();

      const completed = text.includes("you got it");

      if (completed) {
        console.log("[NAT] Second-Hand Shoppe item taken");

        chrome.runtime.sendMessage({
          type: "INCREMENT_DAILY_COUNT",
          activityId: "money_tree", // shared pool
        });

        markReported("secondhand_shoppe_take");
      }
    }
  }

  // ---------------- Rubbish Dump ----------------
  if (location.pathname.includes("takedonation_new.phtml")) {
    if (!alreadyReported("rubbish_dump_take")) {
      const text = getPageText();

      const completed = text.includes("yeah! you got it");

      if (completed) {
        console.log("[NAT] Rubbish Dump item taken");

        chrome.runtime.sendMessage({
          type: "INCREMENT_DAILY_COUNT",
          activityId: "money_tree", // shared pool
        });

        markReported("rubbish_dump_take");
      }
    }
  }

  // ---------------- Shop of Offers ----------------
  if (location.pathname.includes("/shop_of_offers.phtml")) {
    if (!alreadyReported("shop_of_offers")) {
      const text = getPageText();

      const completed =
        text.includes("something has happened") &&
        text.includes("very rich slorg");

      if (completed) {
        console.log("[NAT] Shop of Offers completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "shop_of_offers",
        });

        markReported("shop_of_offers");
      }
    }
  }
  // ---------------- Trudy’s Surprise ----------------
  if (location.pathname.includes("/trudys_surprise.phtml")) {
    if (!alreadyReported("trudys_surprise")) {
      const popup = document.getElementById("trudyprizePopup");
      const title = document.getElementById("trudyPrizeTitle");
      const text = document.getElementById("trudyPrizeText");

      const isVisible =
        popup instanceof HTMLElement && popup.style.display === "block";

      const hasWinText =
        title?.textContent?.toLowerCase().includes("won") ||
        text?.textContent?.toLowerCase().includes("come back tomorrow");

      if (isVisible && hasWinText) {
        console.log("[NAT] Trudy’s Surprise completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "trudys_surprise",
        });

        markReported("trudys_surprise");
      }
    }
  }

  // ---------------- Monthly Freebies ----------------
  if (location.pathname.includes("/freebies/index.phtml")) {
    if (!alreadyReported("monthly_freebies")) {
      console.log("[NAT] Monthly Freebies page visited");

      chrome.runtime.sendMessage({
        type: "AUTO_MARK_COMPLETED",
        activityId: "monthly_freebies",
      });

      markReported("monthly_freebies");
    }
  }

  // ---------------- Obsidian Quarry ----------------
  if (location.pathname.includes("/magma/quarry.phtml")) {
    if (!alreadyReported("obsidian_quarry")) {
      const text = getPageText();

      const successText =
        text.includes("pick up a chunk of obsidian") ||
        text.includes("has been added to your inventory");

      const blockedText =
        text.includes("stop taking all the obsidian") ||
        text.includes("already taken");

      // Structural fallback: no pickup button
      const hasPickupAction = document.querySelector(
        "input[type='submit'], button"
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
  if (location.pathname.includes("/halloween/applebobbing.phtml")) {
    if (!alreadyReported("apple_bobbing")) {
      const bobContent = document.getElementById("bob_content");

      if (bobContent && bobContent.textContent?.trim()) {
        console.log("[NAT] Apple Bobbing completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "apple_bobbing",
        });

        markReported("apple_bobbing");
      }
    }
  }

  // ---------------- Anchor Management ----------------
  if (location.pathname.includes("/pirates/anchormanagement.phtml")) {
    if (!alreadyReported("anchor_management")) {
      const text = getPageText();

      const hasResult =
        text.includes("krawken") &&
        (text.includes("left you") ||
          text.includes("memento") ||
          text.includes("retreats") ||
          text.includes("sneaky"));

      if (hasResult) {
        console.log("[NAT] Anchor Management completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "anchor_management",
        });

        markReported("anchor_management");
      }
    }
  }

  // ---------------- Mysterious Negg Cave ----------------
  if (location.pathname.includes("/shenkuu/neggcave")) {
    if (!alreadyReported("mysterious_negg_cave")) {
      const successPopup = document.getElementById("mnc_popup_generic_correct");

      if (successPopup) {
        console.log("[NAT] Mysterious Negg Cave completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "mysterious_negg_cave",
        });

        markReported("mysterious_negg_cave");
      }
    }
  }

  // ---------------- Grave Danger ----------------
  if (location.pathname.includes("/halloween/gravedanger")) {
    const remainingEl = document.getElementById("gdRemaining");

    if (remainingEl?.textContent) {
      const remainingMs = parseRemainingTime(
        remainingEl.textContent.toLowerCase()
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
    const text = getPageText();

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
  if (location.pathname.includes("/premium/wheel.phtml")) {
    if (!alreadyReported("wheel_of_starlight")) {
      const text = getPageText();

      const completed = text.includes("stopped orbiting");

      if (completed) {
        console.log("[NAT] Wheel of Starlight completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "wheel_of_starlight",
        });

        markReported("wheel_of_starlight");
      }
    }
  }

  // ---------------- Tombola ----------------
  if (
    location.pathname.includes("/island/tombola.phtml") ||
    location.pathname.includes("/island/tombola2.phtml")
  ) {
    if (!alreadyReported("tombola")) {
      const text = getPageText();

      const completed = text.includes("you put your hand into the tombola");

      if (completed) {
        console.log("[NAT] Tombola completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "tombola",
        });

        markReported("tombola");
      }
    }
  }

  // ---------------- Snowager ----------------
  if (location.pathname.includes("/winter/snowager.phtml")) {
    if (!alreadyReported("snowager")) {
      const text = getPageText();

      const attempted =
        text.includes("you carefully walk in") ||
        text.includes("rooooaarrr") ||
        text.includes("The Snowager moves slightly in its sleep") ||
        text.includes("The Snowager awakes");

      if (attempted) {
        console.log("[NAT] Snowager attempted");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "snowager",
        });

        markReported("snowager");
      }
    }
  }

  // ---------------- Guess the Marrow ----------------
  if (location.pathname.includes("/medieval/guessmarrow.phtml")) {
    if (!alreadyReported("guess_the_marrow")) {
      const text = getPageText();

      const attempted = text.includes("right!") || text.includes("wrong!");

      if (attempted) {
        console.log("[NAT] Guess the Marrow attempted");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "guess_the_marrow",
        });

        markReported("guess_the_marrow");
      }
    }
  }

  // ---------------- Wise Old King ----------------
  if (location.pathname.includes("/medieval/wiseking.phtml")) {
    if (!alreadyReported("wise_old_king")) {
      const text = getPageText();

      const completed = text.includes("king hagan listens contently");

      if (completed) {
        console.log("[NAT] Wise Old King completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "wise_old_king",
        });

        markReported("wise_old_king");
      }
    }
  }

  // ---------------- Grumpy Old King ----------------
  if (location.pathname.includes("/medieval/grumpyking.phtml")) {
    const text = getPageText().toLowerCase();

    const success = text.includes("king skarl listens as you tell your joke");

    const hardLocked = text.includes("you've already told me a joke today");

    if (success) {
      console.log("[NAT] Grumpy Old King joke submitted");

      chrome.runtime.sendMessage({
        type: "AUTO_MARK_COMPLETED",
        activityId: "grumpy_old_king",
      });
    }

    if (hardLocked) {
      console.log("[NAT] Grumpy Old King already completed today");

      chrome.runtime.sendMessage({
        type: "AUTO_MARK_LOCKED",
        activityId: "grumpy_old_king",
      });
    }
  }

  // ---------------- Deserted Tomb ----------------
  if (
    location.pathname.includes("/worlds/geraptiku/tomb.phtml") ||
    location.pathname.includes("/worlds/geraptiku/process_tomb.phtml")
  ) {
    if (!alreadyReported("deserted_tomb")) {
      const text = getPageText();

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
        const text = getPageText();

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
  if (location.pathname.includes("/desert/shrine.phtml")) {
    if (!alreadyReported("coltzans_shrine")) {
      const text = getPageText();

      const completed = text.includes("walks slowly up to the strange shrine");

      if (completed) {
        console.log("[NAT] Coltzan’s Shrine visited");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "coltzans_shrine",
        });

        markReported("coltzans_shrine");
      }
    }
  }

  // ---------------- Kreludor Meteor ----------------
  if (location.pathname.includes("/moon/meteor.phtml")) {
    if (!alreadyReported("kreludor_meteor")) {
      const text = getPageText();

      const completed =
        text.includes("meteor has cracked open") ||
        text.includes("now empty space and wonder what happened") ||
        text.includes("meteor has gotten very very hot") ||
        text.includes("angry grundo scientist") ||
        text.includes("meteor just disappeared") ||
        text.includes("try again later");

      if (completed) {
        console.log("[NAT] Kreludor Meteor used");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "kreludor_meteor",
        });

        markReported("kreludor_meteor");
      }
    }
  }

  // ---------------- TDMBGPOP ----------------
  if (location.pathname.includes("/faerieland/tdmbgpop.phtml")) {
    if (!alreadyReported("tdmbgpop")) {
      const text = getPageText();

      const completed =
        text.includes("new plushie on the ground nearby") ||
        text.includes(
          "you wait around for a bit, but nothing seems to happen"
        ) ||
        text.includes("haven't you been feeding") ||
        text.includes("is so excited to visit the little plushie") ||
        text.includes("nothing seems to make a neopet feel better") ||
        text.includes("seeing the poor discarded plushie") ||
        text.includes("while staring at the discarded plushie") ||
        text.includes("the plushie remains ever silent") ||
        text.includes("There is no response from the plushie");

      if (completed) {
        console.log("[NAT] TDMBGPOP visited");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "tdmbgpop",
        });

        markReported("tdmbgpop");
      }
    }
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

      const text = getPageText();

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
  if (location.pathname.includes("/shenkuu/lunar")) {
    if (!alreadyReported("lunar_puzzle")) {
      const text = getPageText();

      const completed =
        // Correct solution
        text.includes("that is the correct answer") ||
        // Already attempted today
        text.includes("you may only attempt my challenge once per day") ||
        text.includes("please try again tomorrow");

      if (completed) {
        console.log("[NAT] Lunar Puzzle completed or already done today");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "lunar_puzzle",
        });

        markReported("lunar_puzzle");
      }
    }
  }
  // ---------------- Potato Counter ----------------
  if (location.pathname.includes("/medieval/potatocounter.phtml")) {
    if (!alreadyReported("potato_counter")) {
      const text = getPageText();

      const attempted =
        text.includes("you got it right in") ||
        text.includes("hehe, no there were") ||
        text.includes("sorry... wrong") ||
        text.includes("play again");

      if (attempted) {
        console.log("[NAT] Potato Counter attempt used");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "potato_counter",
        });

        markReported("potato_counter");
      }
    }
  }
  // ---------------- Forgotten Shore ----------------
  if (location.pathname.includes("/pirates/forgottenshore.phtml")) {
    if (!alreadyReported("forgotten_shore")) {
      const text = getPageText();

      const completed =
        text.includes("nothing of interest to be found today") ||
        text.includes("you found something buried in the sand");

      if (completed) {
        console.log("[NAT] Forgotten Shore searched");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "forgotten_shore",
        });

        markReported("forgotten_shore");
      }
    }
  }

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
        text.includes(phrase)
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
        text.includes(phrase)
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
  if (
    location.pathname.includes("/halloween/strtest/process_strtest.phtml") ||
    location.pathname.includes("/halloween/strtest/index.phtml")
  ) {
    if (!alreadyReported("test_your_strength")) {
      const text = getPageText().toLowerCase();

      const played =
        location.pathname.includes("process_strtest") ||
        text.includes("view prize") ||
        text.includes("congratulations");

      if (played) {
        console.log("[NAT] Test Your Strength detected");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "test_your_strength",
        });

        markReported("test_your_strength");
      }
    }
  }

  // ---------------- Buried Treasure ----------------
  if (
    location.pathname.includes("/pirates/buriedtreasure/buriedtreasure.phtml")
  ) {
    if (!alreadyReported("buried_treasure")) {
      const hasCoords = location.search.length > 1;
      const text = getPageText().toLowerCase();

      const completed = hasCoords || text.includes("pulls out a ticket");

      if (completed) {
        console.log("[NAT] Buried Treasure completed");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "buried_treasure",
        });

        markReported("buried_treasure");
      }
    }
  }
  // ---------------- Bagatelle ----------------
  // ---------- IMMEDIATE URL-BASED DETECTIONS ----------

  (function immediateDetections() {
    // Bagatelle auto-play
    if (location.pathname === "/halloween/process_bagatelle.phtml") {
      console.log("[NAT] Immediate Bagatelle process endpoint detected");

      chrome.runtime.sendMessage({
        type: "AUTO_MARK_COMPLETED",
        activityId: "bagatelle",
      });

      markReported("bagatelle");
    }
  })();

  // Auto-play endpoint (NO HTML response)
  if (location.pathname === "/halloween/process_bagatelle.phtml") {
    if (!alreadyReported("bagatelle")) {
      console.log("[NAT] Bagatelle auto-play detected");

      chrome.runtime.sendMessage({
        type: "AUTO_MARK_COMPLETED",
        activityId: "bagatelle",
      });

      markReported("bagatelle");
    }
  }

  // Flash / legacy fallback (if DOM text is ever readable)
  if (location.pathname === "/halloween/bagatelle.phtml") {
    if (!alreadyReported("bagatelle")) {
      const text = getPageText().toLowerCase();

      const phrases = [
        "jackpot",
        "you won",
        "we have a loser",
        "congratulations",
        "this game must be rigged",
        "awwwwww",
        "nice one",
      ];

      if (phrases.some((p) => text.includes(p))) {
        console.log("[NAT] Bagatelle result text detected");

        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "bagatelle",
        });

        markReported("bagatelle");
      }
    }
  }
}
