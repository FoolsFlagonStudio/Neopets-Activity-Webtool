import { initActivitiesPage } from "./activities";
import { initInfoPage } from "./info";
import { initRestockPage } from "./restock";

const container = document.getElementById("page-container")!;

async function loadPage(page: string) {
  const res = await fetch(`./views/${page}.html`);
  container.innerHTML = await res.text();

  if (page === "activities") initActivitiesPage();
  if (page === "info") initInfoPage();
  if (page === "restock") initRestockPage();
}

function setupNavigation() {
  document
    .querySelectorAll<HTMLButtonElement>(".popup-nav button")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".popup-nav button")
          .forEach((b) => b.classList.remove("active"));

        btn.classList.add("active");
        loadPage(btn.dataset.page!);
      });
    });
}

// init
setupNavigation();
loadPage("activities");
