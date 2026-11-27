/**
 * Alien Aisha Vending Machine detector (read-only + opt-out prefill).
 *
 * vending2.phtml: optionally selects the first real option in each select
 *   (the choices don't affect prizes) and remembers which Nerkmid was used.
 * vending3.phtml: reads "You have won N NP, and ..." plus the prize and
 *   sends a TRACKER_RECORD signal to the background.
 *
 * Never clicks or submits.
 */
import {
  VENDING_FIELDS,
  VENDING_ID,
  classifyVendingPrize,
} from "../../data/trackers";
import type { TrackerRecordPayload, TrackerStore } from "../../types/tracker";
import {
  addPrefillNote,
  cutAt,
  findPrizeName,
  getPageText,
  isUntouched,
  optionLabel,
  savePending,
  shouldRecord,
  takePending,
} from "./trackerHelpers";

const PATH_MATCH = /^\/vending\d?\.phtml/;
const PENDING_KEY = "nat_vending_pending";
const LAST_RESULT_KEY = "nat_vending_last_result";

const RESULT_PATTERN = /you have won\s+(?:([\d,]+)\s*np)?/i;

const SKIP_LINES = [
  /^mm+/i,
  /hope you enjoy/i,
  /alien aisha/i,
  /^play again/i,
  /^you have won/i,
  /^back to/i,
];

const PRIZE_PATTERN =
  /[A-Z][\w'-]*(?: [A-Z][\w'-]*)* Paint ?Brush|Fading Bottled [A-Z]\w+ Faerie|[A-Z][\w'-]*(?: [A-Z][\w'-]*)* Nerkmid(?: [A-Z][\w'-]*)*/;

// Anything from here on is the machine form, not the prize.
const FORM_MARKERS = [/select a nerkmid/i, /which nerkmid do you use/i, /your nerkmids/i];

let formHooked = false;
let prefillDone = false;
let reportedThisPage = false;

function getMachineForm(): HTMLFormElement | null {
  const sel = document.querySelector<HTMLSelectElement>(
    `select[name="${VENDING_FIELDS.nerkmid}"]`
  );
  return sel?.form ?? null;
}

function hookForm(form: HTMLFormElement): void {
  if (formHooked) return;
  formHooked = true;

  form.addEventListener(
    "submit",
    () => {
      const sel = form.querySelector<HTMLSelectElement>(
        `select[name="${VENDING_FIELDS.nerkmid}"]`
      );
      const opt = sel?.selectedOptions[0];
      const choices: Record<string, string> = {};
      if (sel && opt && !isUntouched(sel)) choices.nerkmid = optionLabel(opt);
      savePending(PENDING_KEY, choices);
    },
    true
  );
}

function applyPrefill(form: HTMLFormElement): void {
  let filled = 0;
  for (const name of Object.values(VENDING_FIELDS)) {
    const select = form.querySelector<HTMLSelectElement>(
      `select[name="${name}"]`
    );
    if (!select || !isUntouched(select) || select.options.length < 2) continue;
    select.selectedIndex = 1; // first real option
    filled++;
  }
  if (filled) addPrefillNote(form);
}

function maybePrefill(form: HTMLFormElement): void {
  if (prefillDone) return;
  prefillDone = true;

  chrome.storage.local.get(["trackerData"], (result) => {
    const store = (result.trackerData as TrackerStore | undefined) ?? {};
    const enabled = store[VENDING_ID]?.settings.prefill?.enabled ?? true;
    if (enabled) applyPrefill(form);
  });
}

export function detectVending(): void {
  if (!PATH_MATCH.test(location.pathname)) return;

  const form = getMachineForm();
  if (form) {
    hookForm(form);
    maybePrefill(form);
  }

  if (reportedThisPage) return;

  const text = getPageText();
  const match = text.match(RESULT_PATTERN);
  if (!match || match.index === undefined) return;

  const np = match[1] ? parseInt(match[1].replace(/,/g, ""), 10) || 0 : 0;
  const after = cutAt(text.slice(match.index + match[0].length), FORM_MARKERS);

  const item = findPrizeName(after, {
    pattern: PRIZE_PATTERN,
    skipLines: SKIP_LINES,
  });

  reportedThisPage = true;
  if (!shouldRecord(PENDING_KEY, LAST_RESULT_KEY, `${np}|${item ?? ""}`)) {
    return;
  }

  const category = classifyVendingPrize(item);
  const payload: TrackerRecordPayload = {
    trackerId: VENDING_ID,
    np,
    item,
    tier: category.tier,
    category: category.id,
    choices: takePending(PENDING_KEY),
    source: "auto",
  };

  console.log("[NAT] Vending result", payload);
  chrome.runtime.sendMessage({ type: "TRACKER_RECORD", payload });
}
