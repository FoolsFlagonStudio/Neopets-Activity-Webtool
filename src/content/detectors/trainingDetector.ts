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

function parseAcademyPage(): PetTraining[] | null {
  if (!location.pathname.includes("/pirates/academy.phtml")) return null;
  if (new URLSearchParams(location.search).get("type") !== "status") return null;

  // Header cells: <td bgcolor="#efefef" colspan="2"><b>PetName ...</b></td>
  const headerCells = document.querySelectorAll<HTMLTableCellElement>(
    'td[bgcolor="#efefef"][colspan="2"]'
  );
  if (headerCells.length === 0) return null;

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

      // Details row is the <tr> sibling immediately after the header <tr>
      const headerRow = cell.closest("tr");
      const detailsRow = headerRow?.nextElementSibling as HTMLTableRowElement | null;
      const timeBold = detailsRow?.querySelectorAll("td")[1]?.querySelector("b");
      const timeMs = parseTimeMs(timeBold?.textContent ?? "");

      pets.push({
        petName,
        stat,
        finishesAt: now + timeMs,
        updatedAt: now,
      });
    } else if (idleMatch) {
      pets.push({
        petName: idleMatch[1],
        stat: null,
        finishesAt: null,
        updatedAt: now,
      });
    }
  }

  return pets.length > 0 ? pets : null;
}

export function detectTraining(): void {
  const swashPets = parseAcademyPage();

  if (swashPets) {
    chrome.storage.local.get([TRAINING_STORAGE_KEY], (result) => {
      const store: TrainingStore = (result[TRAINING_STORAGE_KEY] as TrainingStore) ?? {
        swashbuckling: [],
        island_school: [],
      };

      // Clear notifiedAt for pets that are now freshly enrolled
      // (finishesAt changed means a new training run started)
      const prev = new Map(store.swashbuckling.map((p) => [p.petName, p]));
      store.swashbuckling = swashPets.map((p) => {
        const old = prev.get(p.petName);
        // If the pet was previously enrolled and the finishesAt changed,
        // it's a new session — clear the old notification flag.
        if (old?.notifiedAt && old.finishesAt !== p.finishesAt) {
          return p; // fresh entry, no notifiedAt
        }
        // Preserve notifiedAt if finishesAt is unchanged (same training session)
        if (old?.notifiedAt && old.finishesAt === p.finishesAt) {
          return { ...p, notifiedAt: old.notifiedAt };
        }
        return p;
      });

      chrome.storage.local.set({ [TRAINING_STORAGE_KEY]: store });
    });
  }
}
