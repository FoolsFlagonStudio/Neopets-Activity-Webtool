function parseCardValue(src: string): number | null {
  const match = src.match(/\/(\d+)_\w+\.gif$/);
  return match ? parseInt(match[1], 10) : null;
}

export function applyPyramidsHelper(): void {
  if (!location.pathname.includes("/games/pyramids/pyramids.phtml")) return;

  // The draw/discard area is always in the first row of the green game table.
  // Scoping here means we find the current card regardless of how the draw pile
  // renders when exhausted (e.g. the discard card may move inside an action=draw link).
  // The draw/discard cell has valign="top". When the deck is exhausted the draw pile
  // shows empty.gif (not a back card), so we must skip any image that doesn't parse
  // to a card value rather than filtering only on the /backs/ path.
  const topCell = document.querySelector<HTMLTableCellElement>('td[align="center"][valign="top"]');
  let currentValue: number | null = null;

  if (topCell) {
    for (const img of topCell.querySelectorAll<HTMLImageElement>('img[src*="/games/mcards/"]')) {
      const v = parseCardValue(img.src);
      if (v !== null) { currentValue = v; break; }
    }
  }

  // Fallback: search anywhere outside pyramid play links (handles any layout change).
  if (currentValue === null) {
    for (const img of document.querySelectorAll<HTMLImageElement>('img[src*="/games/mcards/"]')) {
      if (img.closest('a[href*="action=play"]')) continue;
      const v = parseCardValue(img.src);
      if (v !== null) { currentValue = v; break; }
    }
  }

  if (currentValue === null) return;

  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href*="action=play"]')) {
    const img = link.querySelector<HTMLImageElement>("img");
    if (!img) continue;
    const val = parseCardValue(img.src);
    if (val === null) continue;

    const isAdjacent = val === currentValue - 1 || val === currentValue + 1;
    // Ace (14) wraps with both 2 and King (13).
    const isAceWrap = (val === 14 && (currentValue === 2 || currentValue === 13))
                   || (currentValue === 14 && (val === 2 || val === 13));
    const playable = isAdjacent || isAceWrap;
    img.style.outline = playable ? "3px solid #22c55e" : "";
    img.style.boxShadow = playable ? "0 0 8px #22c55e" : "";
    img.style.opacity = playable ? "1" : "0.45";
  }
}
