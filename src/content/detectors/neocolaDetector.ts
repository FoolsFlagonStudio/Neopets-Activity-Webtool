/**
 * NeoCola Machine detector (read-only + opt-out prefill).
 *
 * neocola2.phtml: optionally prefills the three selects with the user's
 *   preferred combo (only if still on "Select one...") and remembers which
 *   token / flavor / button-press count was submitted.
 * neocola3.phtml: reads "Out of the machine comes N NP and ..." plus the
 *   prize name and sends a TRACKER_RECORD signal to the background.
 *
 * Never clicks or submits.
 */
import {
  NEOCOLA_BOOBY_PRIZES,
  NEOCOLA_FIELDS,
  NEOCOLA_ID,
  NEOCOLA_PREFILL_DEFAULTS,
  NEOCOLA_RARE_PRIZES,
  NEOCOLA_TOKENS,
  classifyNeocolaPrize,
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

const PATH_MATCH = "/moon/neocola";
const PENDING_KEY = "nat_neocola_pending";
const LAST_RESULT_KEY = "nat_neocola_last_result";

const RESULT_PATTERN = /out of the machine comes\s+([\d,]+)\s*np/i;

const SKIP_LINES = [
  /^better luck next time/i,
  /^play again/i,
  /^continue/i,
  /^onward/i,
  /out of the machine comes/i,
];

const FORM_MARKERS = [/select a token/i, /which token do you use/i, /your tokens/i];

const KNOWN_PRIZES = [...NEOCOLA_BOOBY_PRIZES, ...NEOCOLA_RARE_PRIZES];
const TRANSMOG_NAME =
  /[A-Z][\w'-]*(?: [A-Z][\w'-]*)* Transmogrification Potion|A? ?Beginners Guide to Mixing Transmogrification Potions/;

type ChoiceKey = keyof typeof NEOCOLA_FIELDS;

let formHooked = false;
let prefillDone = false;
let reportedThisPage = false;

/* ---------------- Form ---------------- */

function getMachineForm(): HTMLFormElement | null {
  const sel = document.querySelector<HTMLSelectElement>(
    `select[name="${NEOCOLA_FIELDS.token}"]`
  );
  return sel?.form ?? null;
}

function getSelect(form: HTMLFormElement, key: ChoiceKey) {
  return form.querySelector<HTMLSelectElement>(
    `select[name="${NEOCOLA_FIELDS[key]}"]`
  );
}

/** "Blue Neocola Token" → "Blue" (falls back to the raw label). */
function tokenColor(label: string): string {
  return (
    NEOCOLA_TOKENS.find((c) =>
      label.toLowerCase().startsWith(c.toLowerCase())
    ) ?? label
  );
}

function readChoices(form: HTMLFormElement): Record<string, string> {
  const choices: Record<string, string> = {};
  for (const key of Object.keys(NEOCOLA_FIELDS) as ChoiceKey[]) {
    const select = getSelect(form, key);
    const opt = select?.selectedOptions[0];
    if (!select || !opt || isUntouched(select)) continue;
    const label = optionLabel(opt);
    choices[key] = key === "token" ? tokenColor(label) : label;
  }
  return choices;
}

function hookForm(form: HTMLFormElement): void {
  if (formHooked) return;
  formHooked = true;
  form.addEventListener(
    "submit",
    () => savePending(PENDING_KEY, readChoices(form)),
    true
  );
}

function pickOption(
  select: HTMLSelectElement,
  key: ChoiceKey,
  wanted: string
): HTMLOptionElement | null {
  const real = [...select.options].slice(1);
  if (!real.length) return null;

  if (key === "token") {
    if (wanted && wanted !== "first") {
      const hit = real.find((o) => tokenColor(optionLabel(o)) === wanted);
      if (hit) return hit;
    }
    return real[0]; // preferred colour not owned → first available
  }

  return (
    real.find(
      (o) => optionLabel(o).toLowerCase() === wanted.toLowerCase()
    ) ?? null
  );
}

function applyPrefill(form: HTMLFormElement, prefs: Record<string, string>) {
  let filled = 0;
  for (const key of Object.keys(NEOCOLA_FIELDS) as ChoiceKey[]) {
    const select = getSelect(form, key);
    if (!select || !isUntouched(select)) continue; // never override the user
    const opt = pickOption(select, key, prefs[key] ?? "");
    if (!opt) continue;
    select.value = opt.value;
    filled++;
  }
  if (filled) addPrefillNote(form);
}

function maybePrefill(form: HTMLFormElement): void {
  if (prefillDone) return;
  prefillDone = true;

  chrome.storage.local.get(["trackerData"], (result) => {
    const store = (result.trackerData as TrackerStore | undefined) ?? {};
    const prefill =
      store[NEOCOLA_ID]?.settings.prefill ?? NEOCOLA_PREFILL_DEFAULTS;
    if (!prefill.enabled) return;
    applyPrefill(form, {
      ...NEOCOLA_PREFILL_DEFAULTS.choices,
      ...prefill.choices,
    });
  });
}

/* ---------------- Result ---------------- */

export function detectNeocola(): void {
  if (!location.pathname.includes(PATH_MATCH)) return;

  const form = getMachineForm();
  if (form) {
    hookForm(form);
    maybePrefill(form);
  }

  if (reportedThisPage) return;

  const text = getPageText();
  const match = text.match(RESULT_PATTERN);
  if (!match || match.index === undefined) return;

  const np = parseInt(match[1].replace(/,/g, ""), 10) || 0;
  const sentenceEnd = text.indexOf("\n", match.index);
  const sentence = text.slice(
    match.index,
    sentenceEnd === -1 ? undefined : sentenceEnd
  );
  const after = cutAt(text.slice(match.index + match[0].length), FORM_MARKERS);

  const saidBooby = /booby prize/i.test(sentence);
  const saidNothing = /\band nothing\b/i.test(sentence);
  const item = saidNothing
    ? null
    : findPrizeName(after, {
        pattern: TRANSMOG_NAME,
        knownNames: KNOWN_PRIZES,
        skipLines: SKIP_LINES,
      });

  reportedThisPage = true;
  if (!shouldRecord(PENDING_KEY, LAST_RESULT_KEY, `${np}|${item ?? ""}`)) {
    return;
  }

  const payload: TrackerRecordPayload = {
    trackerId: NEOCOLA_ID,
    np,
    item,
    tier: classifyNeocolaPrize(item, saidBooby),
    choices: takePending(PENDING_KEY),
    source: "auto",
  };

  console.log("[NAT] NeoCola result", payload);
  chrome.runtime.sendMessage({ type: "TRACKER_RECORD", payload });
}
