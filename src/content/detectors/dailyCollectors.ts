function alreadyReported(key: string): boolean {
  return sessionStorage.getItem(key) === "1";
}

function markReported(key: string): void {
  sessionStorage.setItem(key, "1");
}

export function detectDailyCollect(): void {
  const text = (document.body.textContent || "").toLowerCase();

  // -------- FREE JELLY --------
  if (location.pathname.includes("/jelly/jelly.phtml")) {
    if (!alreadyReported("free_jelly")) {
      const jellyDetected =
        text.includes("you take some") || text.includes("the jelly keeper");

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
        text.includes("take a slice") || text.includes("manage to take");

      if (omeletteDetected) {
        chrome.runtime.sendMessage({
          type: "AUTO_MARK_COMPLETED",
          activityId: "giant_omelette",
        });

        markReported("giant_omelette");
      }
    }
  }
}
