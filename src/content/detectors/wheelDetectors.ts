import { WHEEL_CONFIGS } from "./wheelConfigs";

function isPopupDisplayed(): boolean {
  const popup = document.getElementById(
    "wheelPrizePopup"
  ) as HTMLElement | null;
  return !!popup && popup.style.display !== "none";
}

function pageIncludesAny(texts: string[]): boolean {
  const pageText = document.body.textContent?.toLowerCase() ?? "";
  return texts.some((t) => pageText.includes(t.toLowerCase()));
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

    const sessionKey = `wheel_detected_${config.activityId}`;
    const max = config.maxPerSession ?? 1;
    const count = Number(sessionStorage.getItem(sessionKey) ?? 0);

    if (count >= max) continue;
    if (!isPopupDisplayed()) continue;

    let confirmed = config.requiresPrizeName
      ? hasPrizeName()
      : hasWheelResultContent();

    if (!confirmed && config.alsoCountIfTextIncludes) {
      confirmed = pageIncludesAny(config.alsoCountIfTextIncludes);
    }

    if (!confirmed) continue;

    chrome.runtime.sendMessage({
      type: "AUTO_MARK_COMPLETED",
      activityId: config.activityId,
    });

    sessionStorage.setItem(sessionKey, String(count + 1));
  }
}
