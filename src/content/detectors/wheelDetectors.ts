import { WHEEL_CONFIGS } from "./wheelConfigs";

function isPopupDisplayed(): boolean {
  const popup = document.getElementById(
    "wheelPrizePopup"
  ) as HTMLElement | null;
  return !!popup && popup.style.display !== "none";
}

function hasWheelResultContent(): boolean {
  const success = document.getElementById("responseDisplaySuccess");
  const fail = document.getElementById("responseDisplayFail");

  const successText = success?.textContent?.trim() ?? "";
  const failText = fail?.textContent?.trim() ?? "";

  return successText.length > 0 || failText.length > 0;
}

function hasPrizeName(): boolean {
  const itemName = document.getElementById("itemName");
  return !!itemName && itemName.textContent?.trim().length > 0;
}

export function detectWheels(): void {
  for (const config of WHEEL_CONFIGS) {
    if (!location.pathname.includes(config.pathMatch)) continue;

    const sessionKey = `wheel_spin_${config.activityId}`;

    const popupVisible = isPopupDisplayed();

    if (!popupVisible) {
      sessionStorage.removeItem(sessionKey);
      continue;
    }

    if (sessionStorage.getItem(sessionKey) === "1") continue;

    const pageText = document.body.textContent?.toLowerCase() ?? "";

    if (
      config.alsoCountIfTextIncludes &&
      config.alsoCountIfTextIncludes.some((t) =>
        pageText.includes(t.toLowerCase())
      )
    ) {
      console.log(`[NAT] ${config.activityId} locked`);

      chrome.runtime.sendMessage({
        type: "AUTO_MARK_LOCKED",
        activityId: config.activityId,
      });

      sessionStorage.setItem(sessionKey, "1");
      continue;
    }

    let confirmed = config.requiresPrizeName
      ? hasPrizeName()
      : hasWheelResultContent();

    if (!confirmed) continue;

    console.log(`[NAT] ${config.activityId} completed`);

    chrome.runtime.sendMessage({
      type: "AUTO_MARK_COMPLETED",
      activityId: config.activityId,
    });

    sessionStorage.setItem(sessionKey, "1");
  }
}
