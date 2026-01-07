type AvailabilityStatus = "AVAILABLE" | "LOCKED" | "SOON";

interface AvailabilityResult {
  status: AvailabilityStatus;
  msUntilAvailable?: number;
}

interface ActivityStateLite {
  usesToday?: number;
}

interface ActivityDefinitionLite {
  id: string;
  name: string;
  url?: string;
  urls?: string[];
  category: string;
  timingType?: "DAILY_RESET" | "DAILY_LIMIT" | "COOLDOWN";
  maxPerDay?: number;
  notes?: string;
}

interface ActivityView {
  definition: ActivityDefinitionLite;
  state: ActivityStateLite;
  availability: AvailabilityResult;
}

interface GetActivitiesResponse {
  activities: ActivityView[];
}

interface MarkCompletedResponse {
  success: boolean;
}

function resolveState(
  activity: ActivityView,
  allActivities: ActivityView[]
): ActivityStateLite {
  const sharedWith = (activity.definition as any).sharedWith;
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

const root = assertElement(
  document.getElementById("activity-list"),
  "Missing #activity-list"
);

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---------- DAILY_LIMIT label helper ----------
function getLimitLabel(
  definition: ActivityDefinitionLite,
  state: ActivityStateLite
): string | null {
  if (definition.timingType !== "DAILY_LIMIT") return null;
  if (typeof definition.maxPerDay !== "number") return null;

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

function availabilityLabel(
  activity: ActivityView,
  limitLabel: string | null
): string {
  const { availability, definition } = activity;

  // Snowager special-case (time windows)
  if (definition.id === "snowager" && availability.status === "AVAILABLE") {
    return "Check time window in notes";
  }

  if (
    definition.id === "guess_the_marrow" &&
    availability.status === "AVAILABLE"
  ) {
    return "Check regularly";
  }

  if (
    definition.id === "wise_old_king" &&
    availability.status === "AVAILABLE"
  ) {
    return "Check time window in notes";
  }

  if (
    definition.id === "grumpy_old_king" &&
    availability.status === "AVAILABLE"
  ) {
    return "Check time window in notes";
  }

  if (availability.status === "AVAILABLE") {
    return limitLabel ? `Ready (${limitLabel})` : "Ready";
  }

  if (limitLabel) {
    return `Done (${limitLabel})`;
  }

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

// ---------- Link rendering ----------
function renderLinks(def: ActivityDefinitionLite): string {
  const links = def.urls ?? (def.url ? [def.url] : []);

  if (links.length === 0) return "";

  if (links.length === 1) {
    return `
      <a href="${links[0]}" target="_blank" rel="noreferrer">
        ${def.name}
      </a>
    `;
  }

  return `
    <div class="multi-links">
      ${links
        .map((u) => {
          const label = new URL(u).pathname.split("/")[1] ?? "link";
          return `<a href="${u}" target="_blank" rel="noreferrer">${label}</a>`;
        })
        .join(" · ")}
    </div>
  `;
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
  const limitLabel = getLimitLabel(activity.definition, effectiveState);
  const label = availabilityLabel(activity, limitLabel);

  const isReady = activity.availability.status === "AVAILABLE";

  const wrapper = document.createElement("div");
  wrapper.className = "text-center small activity";
  wrapper.dataset.activityId = activity.definition.id;

  const img = document.createElement("img");
  img.src = `../../assets/icons/${activity.definition.id}.png`;
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

  const link = activity.definition.url ?? activity.definition.urls?.[0];
  if (link) {
    wrapper.style.cursor = "pointer";
    wrapper.addEventListener("click", () => {
      chrome.tabs.create({ url: link });
    });
  }

  return col;
}

// ---------- Render ----------
function render(activities: ActivityView[]): void {
  root.innerHTML = "";

  if (activities.length === 0) {
    root.innerHTML = `<p class="text-muted">No activities configured.</p>`;
    return;
  }

  const grouped = new Map<string, ActivityView[]>();

  for (const activity of activities) {
    const cat = activity.definition.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(activity);
  }

  for (const [category, items] of grouped.entries()) {
    const section = document.createElement("section");
    section.className = "mb-3";

    const header = document.createElement("h5");
    header.className = "text-muted";
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

// ---------- Load ----------
function loadActivities(): void {
  chrome.runtime.sendMessage(
    { type: "GET_ACTIVITIES" },
    (response: GetActivitiesResponse | undefined) => {
      render(response?.activities ?? []);
    }
  );
}

loadActivities();
