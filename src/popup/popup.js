console.log("[Neopets Activity Tracker] Popup loaded");

const listEl = document.getElementById("activity-list");

chrome.runtime.sendMessage({ type: "GET_ACTIVITY_STATE" }, (response) => {
  const state = response?.state ?? {};

  // render placeholders
  if (Object.keys(state).length === 0) {
    const li = document.createElement("li");
    li.textContent = "No activity data yet.";
    listEl.appendChild(li);
    return;
  }

  for (const [id, activityState] of Object.entries(state)) {
    const li = document.createElement("li");

    li.innerHTML = `
    <div>${id}</div>
    <div class="status locked">LOCKED</div>
    `;

    listEl.appendChild(li);
  }
});
