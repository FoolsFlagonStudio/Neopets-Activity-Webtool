type AvailabilityStatus = "AVAILABLE" | "LOCKED" | "SOON";

interface AvailabilityResult {
  status: AvailabilityStatus;
  msUntilAvailable?: number;
}

interface ActivityDefinitionLite {
  id: string;
  name: string;
  url: string;
  category: string;
}

interface ActivityView {
  definition: ActivityDefinitionLite;
  availability: AvailabilityResult;
}

interface GetActivitiesResponse {
  activities: ActivityView[];
}

interface MarkCompletedResponse {
  success: boolean;
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

function formatDuration(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `In ${hours}h ${minutes}m`;
  if (hours > 0) return `In ${hours}h`;
  return `In ${minutes}m`;
}

function availabilityLabel(a: AvailabilityResult): string {
  if (a.status === "AVAILABLE") return "Ready";

  if (a.msUntilAvailable !== undefined) {
    if (a.msUntilAvailable < 24 * 60 * 60 * 1000) {
      return formatDuration(a.msUntilAvailable);
    }
  }

  return "Tomorrow";
}

function render(activities: ActivityView[]): void {
  root.innerHTML = "";

  if (activities.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No activities configured.";
    root.appendChild(li);
    return;
  }

  const grouped = new Map<string, ActivityView[]>();

  for (const activity of activities) {
    const cat = activity.definition.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(activity);
  }

  for (const [category, items] of grouped.entries()) {
    const header = document.createElement("li");
    header.className = "category-header";
    header.textContent = titleCase(category);
    root.appendChild(header);

    for (const activity of items) {
      const li = document.createElement("li");
      li.className = "activity-row";

      const label = availabilityLabel(activity.availability);
      const isReady = activity.availability.status === "AVAILABLE";

      li.innerHTML = `
        <div class="activity-main">
          <a href="${activity.definition.url}" target="_blank" rel="noreferrer">
            ${activity.definition.name}
          </a>
          <span class="status ${isReady ? "ready" : "locked"}">
            ${label}
          </span>
        </div>
        <button type="button" ${isReady ? "" : "disabled"}>
          Mark completed
        </button>
      `;

      const btn = li.querySelector<HTMLButtonElement>("button");
      if (btn && isReady) {
        btn.addEventListener("click", () => {
          chrome.runtime.sendMessage(
            { type: "MARK_COMPLETED", activityId: activity.definition.id },
            (_resp: MarkCompletedResponse) => loadActivities()
          );
        });
      }

      root.appendChild(li);
    }
  }
}

function loadActivities(): void {
  chrome.runtime.sendMessage(
    { type: "GET_ACTIVITIES" },
    (response: GetActivitiesResponse | undefined) => {
      render(response?.activities ?? []);
    }
  );
}

loadActivities();
