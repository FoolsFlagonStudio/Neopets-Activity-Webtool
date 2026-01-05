type AvailabilityStatus = "AVAILABLE" | "LOCKED" | "SOON";

interface AvailabilityResult {
  status: AvailabilityStatus;
  msUntilAvailable?: number;
}

interface ActivityDefinitionLite {
  id: string;
  name: string;
  url: string;
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

const listEl = document.getElementById("activity-list");

function assertElement<T extends Element>(el: T | null, message: string): T {
  if (!el) throw new Error(message);
  return el;
}

const activityList = assertElement(
  listEl,
  "Missing #activity-list element in popup.html"
);

function statusClass(status: AvailabilityStatus): string {
  return status === "AVAILABLE" ? "available" : "locked";
}

function render(activities: ActivityView[]): void {
  activityList.innerHTML = "";

  if (activities.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No activities configured yet.";
    activityList.appendChild(li);
    return;
  }

  for (const activity of activities) {
    const li = document.createElement("li");

    li.innerHTML = `
      <div>
        <a href="${activity.definition.url}" target="_blank" rel="noreferrer">
          ${activity.definition.name}
        </a>
      </div>
      <div class="status ${statusClass(activity.availability.status)}">
        ${activity.availability.status}
      </div>
      <button type="button" data-id="${activity.definition.id}">
        Mark completed
      </button>
    `;

    const btn = li.querySelector<HTMLButtonElement>("button");
    if (!btn) {
      continue;
    }

    btn.addEventListener("click", () => {
      chrome.runtime.sendMessage(
        { type: "MARK_COMPLETED", activityId: activity.definition.id },
        (_resp: MarkCompletedResponse) => {

          loadActivities();
        }
      );
    });

    activityList.appendChild(li);
  }
}

function loadActivities(): void {
  chrome.runtime.sendMessage(
    { type: "GET_ACTIVITIES" },
    (response: GetActivitiesResponse | undefined) => {
      const activities = response?.activities ?? [];
      render(activities);
    }
  );
}

console.log("[Neopets Activity Tracker] Popup loaded");
loadActivities();
