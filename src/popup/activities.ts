import type { ActivityDefinition } from "../types/activity";

type AvailabilityStatus = "AVAILABLE" | "LOCKED" | "SOON";

interface AvailabilityResult {
  status: AvailabilityStatus;
  msUntilAvailable?: number;
}

interface ActivityStateLite {
  usesToday?: number;
}

interface ActivityView {
  definition: ActivityDefinition;
  state: ActivityStateLite;
  availability: AvailabilityResult;
}

interface GetActivitiesResponse {
  activities: ActivityView[];
}

interface MarkCompletedResponse {
  success: boolean;
}

const CATEGORY_ORDER = [
  "wheels",
  "dailies",
  "games",
  "adventures",
  "misc",
  "utilities",
] as const;

function resolveState(
  activity: ActivityView,
  allActivities: ActivityView[]
): ActivityStateLite {
  const { sharedWith } = activity.definition;
  if (!sharedWith) return activity.state;

  const shared = allActivities.find((a) => a.definition.id === sharedWith);
  return shared?.state ?? activity.state;
}

function formatAvailableDate(msUntilAvailable: number): string {
  const date = new Date(Date.now() + msUntilAvailable);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function assertElement<T extends Element>(el: T | null, msg: string): T {
  if (!el) throw new Error(msg);
  return el;
}

// const root = assertElement(
//   document.getElementById("activity-list"),
//   "Missing #activity-list"
// );

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getPrimaryLink(def: ActivityDefinition): string | null {
  return def.links?.find((l) => l.kind === "action")?.url ?? null;
}

// ---------- DAILY_LIMIT label helper ----------
function getLimitLabel(
  definition: ActivityDefinition,
  state: ActivityStateLite
): string | null {
  if (definition.timingType !== "DAILY_LIMIT") return null;

  const used = state.usesToday ?? 0;
  return `${used} / ${definition.maxPerDay}`;
}

// ---------- Time formatting ----------
function formatDuration(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `In ${hours}h ${minutes}m`;
  if (hours > 0) return `In ${hours}h`;
  return `In ${minutes}m`;
}

function resolveAvailability(
  activity: ActivityView,
  allActivities: ActivityView[]
): AvailabilityResult {
  const { sharedWith } = activity.definition;
  if (!sharedWith) return activity.availability;

  const shared = allActivities.find((a) => a.definition.id === sharedWith);
  return shared?.availability ?? activity.availability;
}

function availabilityLabel(
  activity: ActivityView,
  limitLabel: string | null
): string {
  const { availability, definition } = activity;

  // -------- Special cases --------
  if (definition.id === "snowager" && availability.status === "AVAILABLE") {
    return "Check time window in notes";
  }

  // Guess the Marrow & Wise Old King (no limits)
  if (
    (definition.id === "guess_the_marrow" ||
      definition.id === "wise_old_king") &&
    availability.status === "AVAILABLE"
  ) {
    return "Check time window in notes";
  }

  // Grumpy Old King (limited per day)
  if (
    definition.id === "grumpy_old_king" &&
    availability.status === "AVAILABLE"
  ) {
    return limitLabel
      ? `Check time window in notes (${limitLabel})`
      : "Check time window in notes";
  }

  // -------- DAILY_LIMIT (with or without cooldown) --------
  if (limitLabel) {
    if (availability.status === "AVAILABLE") {
      return `Ready (${limitLabel})`;
    }

    if (availability.msUntilAvailable !== undefined) {
      return `${formatDuration(availability.msUntilAvailable)} (${limitLabel})`;
    }

    return `Done (${limitLabel})`;
  }

  // -------- Plain AVAILABLE activities --------
  if (availability.status === "AVAILABLE") {
    return "Ready";
  }

  // -------- Cooldowns --------
  if (
    availability.msUntilAvailable !== undefined &&
    availability.msUntilAvailable < 24 * 60 * 60 * 1000
  ) {
    return formatDuration(availability.msUntilAvailable);
  }

  if (availability.msUntilAvailable !== undefined) {
    return `Available ${formatAvailableDate(availability.msUntilAvailable)}`;
  }

  return "Tomorrow";
}

function statusClass(activity: ActivityView, isReady: boolean): string {
  if (isReady) return "text-success";

  if (
    activity.definition.timingType === "DAILY_LIMIT" &&
    activity.state.usesToday !== undefined
  ) {
    return "text-warning";
  }

  return "text-muted";
}

function renderActivity(
  activity: ActivityView,
  allActivities: ActivityView[]
): HTMLElement {
  const col = document.createElement("div");
  col.className = "col-3";

  const effectiveState = resolveState(activity, allActivities);
  const effectiveAvailability = resolveAvailability(activity, allActivities);

  const limitLabel = getLimitLabel(activity.definition, effectiveState);

  const label = availabilityLabel(
    { ...activity, availability: effectiveAvailability },
    limitLabel
  );

  const isReady = effectiveAvailability.status === "AVAILABLE";

  const wrapper = document.createElement("div");
  wrapper.className = "text-center small activity";
  wrapper.dataset.activityId = activity.definition.id;

  const img = document.createElement("img");
  img.src = `../../assets/icons/activities/${activity.definition.id}.png`;
  img.className = "img-fluid rounded border";
  img.alt = activity.definition.name;

  const name = document.createElement("p");
  name.className = "fw-semibold mb-0";
  name.textContent = activity.definition.name;

  const status = document.createElement("p");
  status.className = `mb-0 ${statusClass(activity, isReady)}`;
  status.textContent = label;

  if (activity.definition.notes) {
    wrapper.title = activity.definition.notes;
  }

  wrapper.append(img, name, status);
  col.appendChild(wrapper);

  const primaryLink = getPrimaryLink(activity.definition);
  if (primaryLink) {
    wrapper.style.cursor = "pointer";
    wrapper.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      if (
        target.closest("a") ||
        target.closest(".activity-info") ||
        target.closest(".activity-tooltip")
      ) {
        return;
      }

      chrome.tabs.create({ url: primaryLink });
    });
  }

  const secondaryLinks =
    activity.definition.links?.filter((l) => l.kind !== "action") ?? [];

  if (secondaryLinks.length > 0) {
    wrapper.style.position = "relative";

    const info = document.createElement("div");
    info.className = "activity-info";
    info.textContent = "ⓘ";

    const tooltip = document.createElement("div");
    tooltip.className = "activity-tooltip";

    tooltip.innerHTML = secondaryLinks
      .map(
        (l) => `
        <a
          href="${l.url}"
          target="_blank"
          title="${l.tooltip ?? ""}"
        >
          ${l.label}
        </a>
      `
      )
      .join("<br>");

    info.appendChild(tooltip);
    wrapper.appendChild(info);
  }

  return col;
}

// ---------- Render ----------
function render(activities: ActivityView[], root: HTMLElement): void {
  root.innerHTML = "";

  if (activities.length === 0) {
    root.innerHTML = `<p class="text-muted">No activities configured.</p>`;
    return;
  }

  const grouped = new Map<string, ActivityView[]>();

  for (const activity of activities) {
    if (activity.definition.id === "scratchcard_shared") continue;

    const category = activity.definition.category;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(activity);
  }

  for (const category of CATEGORY_ORDER) {
    const items = grouped.get(category);
    if (!items || items.length === 0) continue;

    const section = document.createElement("section");
    section.className = "mb-3";

    const header = document.createElement("h5");
    header.className = "category-header text-muted";
    header.textContent = titleCase(category);

    const row = document.createElement("div");
    row.className = "row g-2";

    for (const activity of items) {
      row.appendChild(renderActivity(activity, activities));
    }

    section.append(header, row);
    root.appendChild(section);
  }
}

export function initActivitiesPage() {
  const root = document.getElementById("activity-list");
  if (!root) {
    console.warn("[NAT] activity-list not found");
    return;
  }

  chrome.runtime.sendMessage(
    { type: "GET_ACTIVITIES" },
    (response: GetActivitiesResponse | undefined) => {
      render(response?.activities ?? [], root);
    }
  );
}
