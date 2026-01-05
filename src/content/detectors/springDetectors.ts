export function detectHealingSprings(): void {
  if (!location.pathname.includes("springs.phtml")) return;

  const text = document.body.textContent || "";

  if (text.includes("You are healed") || text.includes("The faerie smiles")) {
    chrome.runtime.sendMessage({
      type: "AUTO_MARK_COMPLETED",
      activityId: "healing_springs",
    });
  }
}
