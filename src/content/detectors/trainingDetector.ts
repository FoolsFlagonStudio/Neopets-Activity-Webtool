import type { PetTraining, TrainingStore } from "../../types/training";
import { TRAINING_STORAGE_KEY } from "../../types/training";

function parseTimeMs(text: string): number {
  let ms = 0;
  const h = text.match(/(\d+)\s*hr/);
  const m = text.match(/(\d+)\s*minute/);
  const s = text.match(/(\d+)\s*second/);
  if (h) ms += parseInt(h[1], 10) * 3_600_000;
  if (m) ms += parseInt(m[1], 10) * 60_000;
  if (s) ms += parseInt(s[1], 10) * 1_000;
  return ms;
}

// Both training schools share the same DOM structure:
// td[bgcolor="#efefef"][colspan="2"] > b > "PetName (Level N) is currently studying Stat"
// next sibling tr > td:nth-child(2) > b > "X hrs, Y minutes, Z seconds"
function parsePetRows(): PetTraining[] {
  const headerCells = document.querySelectorAll<HTMLTableCellElement>(
    'td[bgcolor="#efefef"][colspan="2"]'
  );
  if (headerCells.length === 0) return [];

  const now = Date.now();
  const pets: PetTraining[] = [];

  for (const cell of headerCells) {
    const headerText = cell.querySelector("b")?.textContent?.trim() ?? "";

    const studyingMatch = headerText.match(
      /^(.+?)\s+\(Level \d+\) is currently studying (.+)$/
    );
    const idleMatch = headerText.match(
      /^(.+?)\s+\(Level \d+\) is not on a course$/
    );

    if (studyingMatch) {
      const petName = studyingMatch[1];
      const stat = studyingMatch[2];
      const headerRow = cell.closest("tr");
      const detailsRow = headerRow?.nextElementSibling as HTMLTableRowElement | null;
      const timeBold = detailsRow?.querySelectorAll("td")[1]?.querySelector("b");
      const timeMs = parseTimeMs(timeBold?.textContent ?? "");
      pets.push({ petName, stat, finishesAt: now + timeMs, updatedAt: now });
    } else if (idleMatch) {
      pets.push({ petName: idleMatch[1], stat: null, finishesAt: null, updatedAt: now });
    }
  }

  return pets;
}

type TrainingSource = "swashbuckling" | "island_school";

function getSource(): TrainingSource | null {
  const p = location.pathname;
  if (p.includes("/pirates/academy.phtml")) return "swashbuckling";
  if (p.includes("/island/training.phtml")) return "island_school";
  return null;
}

export function detectTraining(): void {
  const source = getSource();
  if (!source) return;
  if (new URLSearchParams(location.search).get("type") !== "status") return;

  const pets = parsePetRows();
  if (pets.length === 0) return;

  chrome.storage.local.get([TRAINING_STORAGE_KEY], (result) => {
    const store: TrainingStore = (result[TRAINING_STORAGE_KEY] as TrainingStore) ?? {
      swashbuckling: [],
      island_school: [],
    };

    // Preserve notifiedAt if it's the same training session (finishesAt unchanged)
    const prev = new Map(store[source].map((p) => [p.petName, p]));
    store[source] = pets.map((p) => {
      const old = prev.get(p.petName);
      if (old?.notifiedAt && old.finishesAt === p.finishesAt) {
        return { ...p, notifiedAt: old.notifiedAt };
      }
      return p;
    });

    chrome.storage.local.set({ [TRAINING_STORAGE_KEY]: store });
  });
}
