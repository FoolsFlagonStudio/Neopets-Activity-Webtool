/**
 * NeoCola Machine detector (read-only).
 *
 * 1. On the machine page (neocola2.phtml), optionally prefills the three
 *    selects with the user's preferred combo (only if still on "Select
 *    one..."), and listens for the form submit to remember which token /
 *    flavor / button-press count was chosen (sessionStorage only).
 * 2. On the result page, reads "Out of the machine comes N NP and ..." plus
 *    the prize name, and sends a TRACKER_RECORD signal to the background.
 *
 * Never clicks or submits. The only page change is the opt-out prefill,
 * which the user still has to submit themselves.
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

const PATH_MATCH = "/moon/neocola";
const PENDING_KEY = "nat_neocola_pending";
const LAST_RESULT_KEY = "nat_neocola_last_result";
const PENDING_MAX_AGE_MS = 5 * 60 * 1000;

const RESULT_PATTERN = /out of the machine comes\s+([\d,]+)\s*np/i;

// Lines on the result page that are never the prize name.
const NON_PRIZE_LINES = [
  /^better luck next time/i,
  /^play again/i,
  /^continue/i,
  /^onward/i,
  /out of the machine comes/i,
];

let formHooked = false;
let prefillDone = false;
let reportedThisPage = false;

interface PendingCombo {
  at: number;
  choices: Record<string, string>;
}

/* ---------------- Form capture ---------------- */

type ChoiceKey = keyof typeof NEOCOLA_FIELDS;

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

function optionLabel(opt: HTMLOptionElement): string {
  return (opt.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** "Blue Neocola Token" → "Blue" (falls back to the raw label). */
function tokenColor(label: string): string {
  return NEOCOLA_TOKENS.find((c) => label.toLowerCase().startsWith(c.toLowerCase())) ?? label;
}

function readChoices(form: HTMLFormElement): Record<string, string> {
  const choices: Record<string, string> = {};
  for (const key of Object.keys(NEOCOLA_FIELDS) as ChoiceKey[]) {
    const select = getSelect(form, key);
    const opt = select?.selectedOptions[0];
    if (!select || !opt || select.value === "") continue;
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
    () => {
      const choices = readChoices(form);
      if (Object.keys(choices).length === 0) return;
      const pending: PendingCombo = { at: Date.now(), choices };
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    },
    true
  );
}

/* ---------------- Prefill (QoL) ---------------- */

function pickOption(
  select: HTMLSelectElement,
  key: ChoiceKey,
  wanted: string
): HTMLOptionElement | null {
  const real = [...select.options].filter((o) => o.value !== "");
  if (!real.length) return null;

  if (key === "token") {
    if (wanted && wanted !== "first") {
      const hit = real.find((o) => tokenColor(optionLabel(o)) === wanted);
      if (hit) return hit;
    }
    return real[0]; // preferred colour not owned → first available
  }

  return real.find((o) => optionLabel(o).toLowerCase() === wanted.toLowerCase()) ?? null;
}

function applyPrefill(form: HTMLFormElement, prefs: Record<string, string>): void {
  let filled = 0;
  for (const key of Object.keys(NEOCOLA_FIELDS) as ChoiceKey[]) {
    const select = getSelect(form, key);
    if (!select || select.value !== "") continue; // never override the user
    const opt = pickOption(select, key, prefs[key] ?? "");
    if (!opt) continue;
    select.value = opt.value;
    filled++;
  }

  if (filled && !form.querySelector(".nat-prefill-note")) {
    const note = document.createElement("div");
    note.className = "nat-prefill-note";
    note.textContent = "Prefilled by Neopets Companion - change anything you like, then submit.";
    note.style.cssText = "font-size:11px;color:#6b7280;text-align:center;margin-top:4px;";
    form.appendChild(note);
  }
}

function maybePrefill(form: HTMLFormElement): void {
  if (prefillDone) return;
  prefillDone = true;

  chrome.storage.local.get(["trackerData"], (result) => {
    const store = (result.trackerData as TrackerStore | undefined) ?? {};
    const prefill = store[NEOCOLA_ID]?.settings.prefill ?? NEOCOLA_PREFILL_DEFAULTS;
    if (!prefill.enabled) return;
    applyPrefill(form, { ...NEOCOLA_PREFILL_DEFAULTS.choices, ...prefill.choices });
  });
}

function takePending(): Record<string, string> {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  if (!raw) return {};
  try {
    const pending = JSON.parse(raw) as PendingCombo;
    if (Date.now() - pending.at > PENDING_MAX_AGE_MS) return {};
    return pending.choices ?? {};
  } catch {
    return {};
  }
}

/* ---------------- Result parsing ---------------- */

const KNOWN_PRIZES = [...NEOCOLA_BOOBY_PRIZES, ...NEOCOLA_RARE_PRIZES];
const TRANSMOG_NAME =
  /([A-Z][\w'-]*(?: [A-Z][\w'-]*)*) Transmogrification Potion|A? ?Beginners Guide to Mixing Transmogrification Potions/;

function findPrizeName(afterText: string): string | null {
  const window = afterText.slice(0, 400);

  const transmog = window.match(TRANSMOG_NAME);
  if (transmog) return transmog[0].trim();

  const lower = window.toLowerCase();
  let best: { name: string; idx: number } | null = null;
  for (const name of KNOWN_PRIZES) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx !== -1 && (!best || idx < best.idx)) best = { name, idx };
  }
  if (best) return best.name;

  // Unknown item: take the first plausible line after the result sentence.
  const rawLines = window.split(/\n+/);
  // The first chunk is the rest of the "Out of the machine comes..." line.
  if (!/^\s*\n/.test(window)) rawLines.shift();
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (NON_PRIZE_LINES.some((re) => re.test(line))) continue;
    if (line.length > 80) continue;
    return line;
  }
  return null;
}

export function detectNeocola(): void {
  if (!location.pathname.includes(PATH_MATCH)) return;

  const form = getMachineForm();
  if (form) {
    hookForm(form);
    maybePrefill(form);
  }

  if (reportedThisPage) return;

  const text = document.body?.innerText ?? document.body?.textContent ?? "";
  const match = text.match(RESULT_PATTERN);
  if (!match || match.index === undefined) return;

  const np = parseInt(match[1].replace(/,/g, ""), 10) || 0;
  const sentenceEnd = text.indexOf("\n", match.index);
  const sentence = text.slice(
    match.index,
    sentenceEnd === -1 ? undefined : sentenceEnd
  );
  const after = text.slice(match.index + match[0].length);

  const saidBooby = /booby prize/i.test(sentence);
  const saidNothing = /\band nothing\b/i.test(sentence);
  const item = saidNothing ? null : findPrizeName(after);

  // Guard against refreshes re-counting the same result: a fresh form
  // submit always leaves a pending combo; without one, only record if the
  // result differs from the last one seen in this tab.
  const fingerprint = `${np}|${item ?? ""}`;
  const hadPending = sessionStorage.getItem(PENDING_KEY) !== null;
  if (!hadPending && sessionStorage.getItem(LAST_RESULT_KEY) === fingerprint) {
    reportedThisPage = true;
    return;
  }

  reportedThisPage = true;
  const choices = takePending();
  sessionStorage.setItem(LAST_RESULT_KEY, fingerprint);

  const payload: TrackerRecordPayload = {
    trackerId: NEOCOLA_ID,
    np,
    item,
    tier: classifyNeocolaPrize(item, saidBooby),
    choices,
    source: "auto",
  };

  console.log("[NAT] NeoCola result", payload);
  chrome.runtime.sendMessage({ type: "TRACKER_RECORD", payload });
}
