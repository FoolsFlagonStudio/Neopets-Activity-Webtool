import { TRACKERS } from "../data/trackers";
import type {
  TrackerDefinition,
  TrackerEntry,
  TrackerLog,
  TrackerStore,
} from "../types/tracker";
import { computeStats, type GroupStat, type TrackerStats } from "./trackerStats";

const SELECTED_KEY = "nat_selected_tracker";
const RECENT_COUNT = 10;
const TOP_ITEMS = 8;

let selectedId = TRACKERS[0]?.id ?? "";
let breakdownKey: string | null = null;
let storageListener:
  | ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void)
  | null = null;

/* ---------------- tiny DOM helper ---------------- */

type Child = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

const fmt = (n: number) => Math.round(n).toLocaleString();
const pct = (n: number, d: number) =>
  d ? `${((n / d) * 100).toFixed(n / d < 0.01 && n > 0 ? 2 : 1)}%` : "0%";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---------------- messaging ---------------- */

function send<T = unknown>(message: object): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (res) => {
      resolve(res?.success ? (res.result as T) : undefined);
    });
  });
}

/* ---------------- render pieces ---------------- */

function tile(label: string, value: string, tone = ""): HTMLElement {
  return h(
    "div",
    { class: "col-3" },
    h(
      "div",
      { class: `stat-tile ${tone}` },
      h("div", { class: "stat-value" }, value),
      h("div", { class: "stat-label" }, label)
    )
  );
}

function sectionHeader(text: string): HTMLElement {
  return h("h5", { class: "category-header text-muted" }, text);
}

function renderPicker(root: HTMLElement): void {
  root.innerHTML = "";
  if (TRACKERS.length < 2) return; // nothing to pick yet

  for (const t of TRACKERS) {
    const btn = h(
      "button",
      { class: `tracker-chip ${t.id === selectedId ? "active" : ""}` },
      t.name
    );
    btn.addEventListener("click", () => {
      selectedId = t.id;
      breakdownKey = null;
      localStorage.setItem(SELECTED_KEY, t.id);
      refresh();
    });
    root.append(btn);
  }
}

function renderHeader(def: TrackerDefinition): HTMLElement {
  const link = h("a", { href: def.url, class: "tracker-go" }, "Go play →");
  link.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: def.url });
  });

  return h(
    "div",
    { class: "tracker-header d-flex justify-content-between align-items-start" },
    h(
      "div",
      {},
      h("h6", { class: "mb-0 fw-semibold" }, def.name),
      h("p", { class: "small text-muted mb-0" }, def.description)
    ),
    link
  );
}

function renderSummary(def: TrackerDefinition, s: TrackerStats): HTMLElement {
  const unit = def.playUnit.plural;
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

  return h(
    "div",
    {},
    h(
      "div",
      { class: "row g-2 mb-2" },
      tile(`${cap(unit)} used`, fmt(s.plays)),
      tile("Total NP", fmt(s.totalNp)),
      tile(`Avg NP / ${def.playUnit.singular}`, fmt(s.avgNp)),
      tile("Best NP", fmt(s.bestNp))
    ),
    h(
      "div",
      { class: "row g-2" },
      tile(def.jackpotLabel, fmt(s.jackpots), s.jackpots ? "tone-gold" : ""),
      tile("Good prizes", fmt(s.rares), s.rares ? "tone-green" : ""),
      tile("Booby prizes", fmt(s.common)),
      tile(
        `Since last ${def.jackpotLabel.replace(/s$/, "").toLowerCase()}`,
        fmt(s.playsSinceJackpot)
      )
    )
  );
}

function renderProfit(
  def: TrackerDefinition,
  log: TrackerLog,
  s: TrackerStats
): HTMLElement {
  const input = h("input", {
    type: "number",
    min: "0",
    step: "1",
    class: "form-control form-control-sm cost-input",
    placeholder: "e.g. 600",
  });
  if (log.settings.costPerPlay !== undefined) {
    input.value = String(log.settings.costPerPlay);
  }
  input.addEventListener("change", () => {
    const raw = input.value.trim();
    const costPerPlay = raw === "" ? null : Math.max(0, Number(raw));
    send({
      type: "TRACKER_UPDATE_SETTINGS",
      trackerId: def.id,
      settings: { costPerPlay },
    });
  });

  const result =
    s.netNp === null
      ? h(
          "span",
          { class: "small text-muted" },
          `Set a price to see if the machine owes you NP.`
        )
      : h(
          "span",
          { class: "small" },
          `Spent ${fmt(s.spent ?? 0)} NP → `,
          h(
            "strong",
            { class: s.netNp >= 0 ? "text-success" : "text-danger" },
            `${s.netNp >= 0 ? "+" : ""}${fmt(s.netNp)} NP net`
          ),
          h("span", { class: "text-muted" }, " (NP only, prizes not valued)")
        );

  return h(
    "div",
    { class: "profit-row d-flex align-items-center gap-2" },
    h("label", { class: "small text-muted text-nowrap" }, def.costLabel),
    input,
    result
  );
}

function renderPrefill(def: TrackerDefinition, log: TrackerLog): HTMLElement | null {
  if (!def.prefill) return null;
  const current = log.settings.prefill ?? def.prefill.defaults;
  const choices = { ...def.prefill.defaults.choices, ...current.choices };

  const save = (patch: Partial<{ enabled: boolean; choices: Record<string, string> }>) =>
    send({
      type: "TRACKER_UPDATE_SETTINGS",
      trackerId: def.id,
      settings: {
        prefill: {
          enabled: patch.enabled ?? current.enabled,
          choices: { ...choices, ...(patch.choices ?? {}) },
        },
      },
    });

  const toggle = h("input", { type: "checkbox", class: "form-check-input", id: `prefill-${def.id}` });
  toggle.checked = current.enabled;
  toggle.addEventListener("change", () => save({ enabled: toggle.checked }));

  const selects = def.choiceFields
    .filter((f) => def.prefill!.options[f.key])
    .map((f) => {
      const sel = h("select", { class: "form-select form-select-sm" });
      for (const o of def.prefill!.options[f.key]) {
        const opt = h("option", { value: o.value }, o.label);
        if (o.value === choices[f.key]) opt.selected = true;
        sel.append(opt);
      }
      sel.disabled = !current.enabled;
      sel.addEventListener("change", () => save({ choices: { [f.key]: sel.value } }));
      return h("label", { class: "prefill-field small text-muted" }, f.label, sel);
    });

  return h(
    "div",
    { class: "prefill-box" },
    h(
      "div",
      { class: "form-check form-switch mb-1" },
      toggle,
      h("label", { class: "form-check-label small fw-semibold", for: `prefill-${def.id}` }, "Prefill the machine form"),
    ),
    h("div", { class: "d-flex gap-2" }, ...selects),
    h(
      "p",
      { class: "small text-muted mb-0 mt-1" },
      "Only fills fields still on \"Select one...\" - you always hit submit yourself."
    )
  );
}

function renderTierBar(s: TrackerStats): HTMLElement {
  const seg = (n: number, cls: string, title: string) =>
    n
      ? h("div", {
          class: `tier-seg ${cls}`,
          style: `width:${(n / s.plays) * 100}%`,
          title: `${title}: ${n} (${pct(n, s.plays)})`,
        })
      : null;

  return h(
    "div",
    {},
    h(
      "div",
      { class: "tier-bar" },
      seg(s.common, "tier-common", "Booby"),
      seg(s.rares, "tier-rare", "Good"),
      seg(s.jackpots, "tier-jackpot", "Jackpot")
    ),
    h(
      "div",
      { class: "tier-legend small text-muted" },
      h("span", {}, h("i", { class: "dot tier-common" }), ` Booby ${pct(s.common, s.plays)}`),
      h("span", {}, h("i", { class: "dot tier-rare" }), ` Good ${pct(s.rares, s.plays)}`),
      h("span", {}, h("i", { class: "dot tier-jackpot" }), ` Jackpot ${pct(s.jackpots, s.plays)}`)
    )
  );
}

function renderItems(s: TrackerStats): HTMLElement {
  const list = h("ul", { class: "item-list list-unstyled mb-0" });
  for (const it of s.items.slice(0, TOP_ITEMS)) {
    list.append(
      h(
        "li",
        { class: `item-row tier-text-${it.tier}` },
        h("span", { class: "item-name" }, it.item),
        h("span", { class: "item-count" }, `×${fmt(it.count)}  ·  ${pct(it.count, s.plays)}`)
      )
    );
  }
  if (s.items.length > TOP_ITEMS) {
    list.append(
      h("li", { class: "small text-muted" }, `+ ${s.items.length - TOP_ITEMS} more`)
    );
  }
  return list;
}

function renderJackpots(def: TrackerDefinition, s: TrackerStats): HTMLElement | null {
  if (!s.jackpotEntries.length) return null;
  const list = h("ul", { class: "list-unstyled mb-0 jackpot-list" });
  for (const e of s.jackpotEntries) {
    const combo = def.choiceFields
      .map((f) => e.choices[f.key])
      .filter(Boolean)
      .join(" · ");
    list.append(
      h(
        "li",
        {},
        h("strong", {}, `✨ ${e.item ?? "?"}`),
        h("span", { class: "small text-muted" }, `  ${fmtDate(e.at)}${combo ? `  ·  ${combo}` : ""}`)
      )
    );
  }
  return h("div", {}, sectionHeader(`${def.jackpotLabel} pulled`), list);
}

function renderBreakdown(def: TrackerDefinition, s: TrackerStats): HTMLElement | null {
  if (!def.choiceFields.length) return null;
  const key = breakdownKey ?? def.choiceFields[0].key;

  const tabs = h("div", { class: "breakdown-tabs" });
  for (const f of def.choiceFields) {
    const b = h("button", { class: `tracker-chip small ${f.key === key ? "active" : ""}` }, f.label);
    b.addEventListener("click", () => {
      breakdownKey = f.key;
      refresh();
    });
    tabs.append(b);
  }

  const rows: GroupStat[] = s.byChoice[key] ?? [];
  const table = h(
    "table",
    { class: "table table-sm small mb-0 breakdown-table" },
    h(
      "thead",
      {},
      h(
        "tr",
        {},
        h("th", {}, def.choiceFields.find((f) => f.key === key)?.label ?? key),
        h("th", { class: "text-end" }, "Plays"),
        h("th", { class: "text-end" }, "Avg NP"),
        h("th", { class: "text-end" }, "Good"),
        h("th", { class: "text-end" }, def.jackpotLabel)
      )
    ),
    h(
      "tbody",
      {},
      ...rows.map((g) =>
        h(
          "tr",
          {},
          h("td", {}, g.key),
          h("td", { class: "text-end" }, fmt(g.plays)),
          h("td", { class: "text-end" }, fmt(g.avgNp)),
          h("td", { class: "text-end" }, `${g.rares} (${pct(g.rares, g.plays)})`),
          h("td", { class: "text-end" }, String(g.jackpots))
        )
      )
    )
  );

  return h(
    "div",
    {},
    sectionHeader("Breakdown"),
    tabs,
    table,
    h(
      "p",
      { class: "small text-muted mb-0 mt-1" },
      "Just for fun - combos are logged so you can test your superstitions."
    )
  );
}

function renderRecent(def: TrackerDefinition, entries: TrackerEntry[]): HTMLElement {
  const list = h("ul", { class: "list-unstyled mb-0 recent-list" });
  for (const e of entries.slice(-RECENT_COUNT).reverse()) {
    const del = h("button", { class: "btn-icon", title: "Delete this entry" }, "×");
    del.addEventListener("click", async () => {
      await send({ type: "TRACKER_DELETE_ENTRY", trackerId: def.id, entryId: e.id });
      refresh();
    });
    const combo = def.choiceFields
      .map((f) => e.choices[f.key])
      .filter(Boolean)
      .join(" · ");
    list.append(
      h(
        "li",
        { class: `recent-row tier-text-${e.tier}` },
        h("span", { class: "recent-np" }, `${fmt(e.np)} NP`),
        h("span", { class: "recent-item" }, e.item ?? "(nothing)"),
        h("span", { class: "recent-meta small text-muted" }, `${fmtDate(e.at)}${combo ? ` · ${combo}` : ""}`),
        del
      )
    );
  }
  return h("div", {}, sectionHeader("Recent"), list);
}

function renderActions(def: TrackerDefinition, log: TrackerLog): HTMLElement {
  const undo = h("button", { class: "btn btn-sm btn-outline-secondary" }, "Undo last");
  undo.addEventListener("click", async () => {
    await send({ type: "TRACKER_UNDO_LAST", trackerId: def.id });
    refresh();
  });

  const exportBtn = h("button", { class: "btn btn-sm btn-outline-secondary" }, "Export JSON");
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ tracker: def.id, ...log }, null, 2)], {
      type: "application/json",
    });
    const a = h("a", {
      href: URL.createObjectURL(blob),
      download: `${def.id}-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // Two-click reset (avoids blocking confirm() dialogs)
  const reset = h("button", { class: "btn btn-sm btn-outline-danger ms-auto" }, "Reset");
  let armed = false;
  reset.addEventListener("click", async () => {
    if (!armed) {
      armed = true;
      reset.textContent = "Click again to wipe";
      setTimeout(() => {
        armed = false;
        reset.textContent = "Reset";
      }, 3000);
      return;
    }
    await send({ type: "TRACKER_RESET", trackerId: def.id });
    refresh();
  });

  return h("div", { class: "d-flex gap-2 mt-3 mb-1" }, undo, exportBtn, reset);
}

function renderEmpty(def: TrackerDefinition): HTMLElement {
  return h(
    "div",
    { class: "tracker-empty text-center text-muted small" },
    h("p", { class: "mb-1" }, `No ${def.playUnit.plural} logged yet.`),
    h(
      "p",
      { class: "mb-0" },
      `Play the ${def.name} and results will show up here automatically.`
    )
  );
}

/* ---------------- main render ---------------- */

function render(store: TrackerStore): void {
  const picker = document.getElementById("tracker-picker");
  const body = document.getElementById("tracker-body");
  if (!picker || !body) return;

  const def = TRACKERS.find((t) => t.id === selectedId) ?? TRACKERS[0];
  if (!def) {
    body.textContent = "No trackers configured.";
    return;
  }
  selectedId = def.id;

  renderPicker(picker);
  body.innerHTML = "";

  const log: TrackerLog = store[def.id] ?? { entries: [], settings: {} };
  const s = computeStats(
    log,
    def.choiceFields.map((f) => f.key)
  );

  body.append(renderHeader(def));
  const prefill = renderPrefill(def, log);
  if (prefill) body.append(prefill);

  if (s.plays === 0) {
    body.append(renderProfit(def, log, s), renderEmpty(def));
    return;
  }

  body.append(
    renderSummary(def, s),
    renderProfit(def, log, s),
    sectionHeader("Prizes"),
    renderTierBar(s),
    renderItems(s)
  );

  const jackpots = renderJackpots(def, s);
  if (jackpots) body.append(jackpots);

  const breakdown = renderBreakdown(def, s);
  if (breakdown) body.append(breakdown);

  body.append(renderRecent(def, log.entries), renderActions(def, log));

  if (s.firstAt) {
    body.append(
      h(
        "p",
        { class: "small text-muted text-center mb-0" },
        `Tracking since ${new Date(s.firstAt).toLocaleDateString()} · stored on this device only`
      )
    );
  }
}

async function refresh(): Promise<void> {
  const store = (await send<TrackerStore>({ type: "TRACKER_GET_ALL" })) ?? {};
  render(store);
}

export function initTrackersPage(): void {
  const saved = localStorage.getItem(SELECTED_KEY);
  if (saved && TRACKERS.some((t) => t.id === saved)) selectedId = saved;

  // Live-update while the popup is open (e.g. playing in another window).
  if (!storageListener) {
    storageListener = (changes, area) => {
      if (area !== "local" || !changes.trackerData) return;
      if (!document.getElementById("tracker-body")) return;
      render((changes.trackerData.newValue as TrackerStore) ?? {});
    };
    chrome.storage.onChanged.addListener(storageListener);
  }

  refresh();
}
