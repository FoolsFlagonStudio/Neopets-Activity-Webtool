import { initActivitiesPage } from "./activities";
import { initInfoPage } from "./info";
import { initRestockPage } from "./restock";
import { initTrainingPage } from "./training";
import { initShopsPage } from "./shops";
import { initTrackersPage } from "./trackers";

const LAST_PAGE_KEY = "nat_last_page";
const container = document.getElementById("page-container")!;

async function loadPage(page: string) {
  const res = await fetch(`./views/${page}.html`);
  container.innerHTML = await res.text();

  if (page === "activities") initActivitiesPage();
  if (page === "trackers") initTrackersPage();
  if (page === "info") initInfoPage();
  if (page === "restock") initRestockPage();
  if (page === "training") initTrainingPage();
  if (page === "shops") initShopsPage();
}

function activateButton(page: string) {
  document.querySelectorAll(".popup-nav button").forEach((b) => {
    b.classList.toggle("active", (b as HTMLButtonElement).dataset.page === page);
  });
}

function setupNavigation() {
  document
    .querySelectorAll<HTMLButtonElement>(".popup-nav button")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = btn.dataset.page!;
        activateButton(page);
        chrome.storage.local.set({ [LAST_PAGE_KEY]: page });
        loadPage(page);
      });
    });
}

// init
setupNavigation();
chrome.storage.local.get([LAST_PAGE_KEY], (result) => {
  const page = (result[LAST_PAGE_KEY] as string | undefined) ?? "activities";
  activateButton(page);
  loadPage(page);
});
