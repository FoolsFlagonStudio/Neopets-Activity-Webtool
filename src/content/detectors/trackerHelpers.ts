/**
 * Shared helpers for reward-tracker detectors (NeoCola, Vending, ...).
 * Everything here is read-only apart from sessionStorage bookkeeping.
 */

const PENDING_MAX_AGE_MS = 5 * 60 * 1000;

interface PendingCombo {
  at: number;
  choices: Record<string, string>;
}

/** Remember which options were picked when the user submitted the form. */
export function savePending(key: string, choices: Record<string, string>): void {
  const pending: PendingCombo = { at: Date.now(), choices };
  sessionStorage.setItem(key, JSON.stringify(pending));
}

export function hasPending(key: string): boolean {
  return sessionStorage.getItem(key) !== null;
}

/** Read and clear the pending combo (empty if missing or stale). */
export function takePending(key: string): Record<string, string> {
  const raw = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);
  if (!raw) return {};
  try {
    const pending = JSON.parse(raw) as PendingCombo;
    if (Date.now() - pending.at > PENDING_MAX_AGE_MS) return {};
    return pending.choices ?? {};
  } catch {
    return {};
  }
}

/**
 * Refresh guard: a real form submit always leaves a pending combo. Without
 * one, only count the result if it differs from the last one seen in this tab.
 * Returns true if the result should be recorded (and remembers it).
 */
export function shouldRecord(
  pendingKey: string,
  lastKey: string,
  fingerprint: string
): boolean {
  const fresh = hasPending(pendingKey);
  if (!fresh && sessionStorage.getItem(lastKey) === fingerprint) return false;
  sessionStorage.setItem(lastKey, fingerprint);
  return true;
}

export function getPageText(): string {
  return document.body?.innerText ?? document.body?.textContent ?? "";
}

/** Cut text at the first marker (e.g. where a "play again" form begins). */
export function cutAt(text: string, markers: RegExp[]): string {
  let end = text.length;
  for (const re of markers) {
    const m = text.match(re);
    if (m?.index !== undefined && m.index < end) end = m.index;
  }
  return text.slice(0, end);
}

export function optionLabel(opt: HTMLOptionElement): string {
  return (opt.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** True while a select still shows its "Select one..." placeholder. */
export function isUntouched(select: HTMLSelectElement): boolean {
  if (select.selectedIndex <= 0) return true;
  return select.value === "";
}

export function addPrefillNote(form: HTMLFormElement): void {
  if (form.querySelector(".nat-prefill-note")) return;
  const note = document.createElement("div");
  note.className = "nat-prefill-note";
  note.textContent =
    "Prefilled by Neopets Companion - change anything you like, then submit.";
  note.style.cssText =
    "font-size:11px;color:#6b7280;text-align:center;margin-top:4px;";
  form.appendChild(note);
}

/**
 * Find the prize name in the text that follows a result sentence.
 * Tries a pattern, then known names, then the first plausible line.
 */
export function findPrizeName(
  afterText: string,
  opts: {
    pattern?: RegExp;
    knownNames?: string[];
    skipLines?: RegExp[];
  }
): string | null {
  const window = afterText.slice(0, 400);

  if (opts.pattern) {
    const m = window.match(opts.pattern);
    if (m) return m[0].trim();
  }

  if (opts.knownNames?.length) {
    const lower = window.toLowerCase();
    let best: { name: string; idx: number } | null = null;
    for (const name of opts.knownNames) {
      const idx = lower.indexOf(name.toLowerCase());
      if (idx !== -1 && (!best || idx < best.idx)) best = { name, idx };
    }
    if (best) return best.name;
  }

  const rawLines = window.split(/\n+/);
  // The first chunk is the rest of the result sentence's own line.
  if (!/^\s*\n/.test(window)) rawLines.shift();
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (opts.skipLines?.some((re) => re.test(line))) continue;
    if (line.length > 80) continue;
    return line;
  }
  return null;
}
