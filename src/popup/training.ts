import type { TrainingStore, PetTraining } from "../types/training";
import { TRAINING_STORAGE_KEY } from "../types/training";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Done!";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatAge(updatedAt: number): string {
  const mins = Math.floor((Date.now() - updatedAt) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function buildRow(pet: PetTraining, sourceLabel: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "tr-row";
  if (pet.finishesAt !== null && pet.finishesAt <= Date.now()) {
    row.classList.add("tr-complete");
  }

  const name = document.createElement("span");
  name.className = "tr-name";
  name.textContent = pet.petName;
  name.title = pet.petName;

  const stat = document.createElement("span");
  stat.className = "tr-stat";

  const timer = document.createElement("span");
  timer.className = "tr-timer";

  if (!pet.stat) {
    stat.textContent = "Idle";
    stat.classList.add("tr-idle");
    timer.textContent = "—";
  } else if (pet.finishesAt !== null && pet.finishesAt <= Date.now()) {
    stat.textContent = pet.stat;
    timer.textContent = "Done!";
    timer.classList.add("tr-done");
    row.classList.add("tr-complete");
  } else {
    stat.textContent = pet.stat;
    timer.textContent = pet.finishesAt ? formatCountdown(pet.finishesAt - Date.now()) : "—";
    timer.classList.add("tr-active");
    if (pet.finishesAt) timer.dataset.finishesAt = String(pet.finishesAt);
  }

  const src = document.createElement("span");
  src.className = "tr-source";
  src.textContent = sourceLabel;

  row.append(name, stat, timer, src);
  return row;
}

function tickTimers(list: HTMLElement): void {
  const now = Date.now();
  for (const el of list.querySelectorAll<HTMLElement>(".tr-timer[data-finishes-at]")) {
    const finishesAt = parseInt(el.dataset.finishesAt ?? "0", 10);
    if (!finishesAt) continue;
    const remaining = finishesAt - now;
    const row = el.closest<HTMLElement>(".tr-row");
    if (remaining <= 0) {
      el.textContent = "Done!";
      el.className = "tr-timer tr-done";
      delete el.dataset.finishesAt;
      row?.classList.add("tr-complete");
    } else {
      el.textContent = formatCountdown(remaining);
    }
  }
}

function renderSyncBar(container: HTMLElement, lastUpdated: number | undefined): void {
  const bar = document.createElement("div");
  bar.className = "tr-sync-bar";

  const links = [
    {
      label: "Sync Academy",
      url: "https://www.neopets.com/pirates/academy.phtml?type=status",
    },
    {
      label: "Sync Island School",
      url: "https://www.neopets.com/island/training.phtml?type=status",
    },
  ];

  for (const { label, url } of links) {
    const btn = document.createElement("button");
    btn.className = "tr-sync-btn";
    btn.textContent = label;
    btn.addEventListener("click", () => chrome.tabs.create({ url }));
    bar.appendChild(btn);
  }

  if (lastUpdated) {
    const age = document.createElement("span");
    age.className = "tr-age";
    age.textContent = `Synced ${formatAge(lastUpdated)}`;
    bar.appendChild(age);
  }

  container.appendChild(bar);
}

export function initTrainingPage(): void {
  const root = document.getElementById("training-list");
  if (!root) return;

  let tickInterval: ReturnType<typeof setInterval> | null = null;

  function render(store: TrainingStore | undefined): void {
    if (tickInterval !== null) {
      clearInterval(tickInterval);
      tickInterval = null;
    }

    root!.innerHTML = "";

    const swash = store?.swashbuckling ?? [];
    const island = store?.island_school ?? [];

    // Merge by pet name — a pet can only train at one school at a time.
    // If the same pet appears in both lists, keep whichever has active training;
    // if both are idle or both are active, prefer the more recently synced entry.
    const petMap = new Map<string, { pet: PetTraining; label: string }>();
    for (const pet of swash) {
      petMap.set(pet.petName.toLowerCase(), { pet, label: "Academy" });
    }
    for (const pet of island) {
      const key = pet.petName.toLowerCase();
      const existing = petMap.get(key);
      if (!existing) {
        petMap.set(key, { pet, label: "Island" });
      } else {
        const existingActive = existing.pet.stat !== null;
        const newActive = pet.stat !== null;
        if (
          (newActive && !existingActive) ||
          (newActive === existingActive && pet.updatedAt > existing.pet.updatedAt)
        ) {
          petMap.set(key, { pet, label: "Island" });
        }
      }
    }
    const all = Array.from(petMap.values());

    const lastUpdated = all.reduce<number | undefined>(
      (acc, { pet }) => (acc === undefined || pet.updatedAt > acc ? pet.updatedAt : acc),
      undefined
    );

    renderSyncBar(root!, lastUpdated);

    const list = document.createElement("div");
    list.id = "tr-pet-list";

    if (all.length === 0) {
      const msg = document.createElement("p");
      msg.className = "tr-empty";
      msg.textContent =
        "No training data yet. Use the buttons above to visit a training school — the extension will sync automatically.";
      list.appendChild(msg);
    } else {
      for (const { pet, label } of all) {
        list.appendChild(buildRow(pet, label));
      }
    }

    root!.appendChild(list);
    tickInterval = setInterval(() => tickTimers(list), 1_000);
  }

  chrome.storage.local.get([TRAINING_STORAGE_KEY], (result) => {
    render(result[TRAINING_STORAGE_KEY] as TrainingStore | undefined);
  });

  // Re-render automatically when detectTraining() updates storage in any tab —
  // without this the popup would show stale data until manually closed and reopened.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(TRAINING_STORAGE_KEY in changes)) return;
    render(changes[TRAINING_STORAGE_KEY].newValue as TrainingStore | undefined);
  });
}
