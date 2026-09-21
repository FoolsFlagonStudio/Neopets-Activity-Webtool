type Suit = "clubs" | "diamonds" | "hearts" | "spades";

function suitColor(suit: Suit): "red" | "black" {
  return suit === "diamonds" || suit === "hearts" ? "red" : "black";
}

interface SCard {
  rank: number; // 1=Ace, 2-10, 11=J, 12=Q, 13=K
  suit: Suit;
}

interface TableauEntry {
  card: SCard;
  img: HTMLImageElement;
  col: number;
  depth: number; // higher = lower in the visual column = more accessible
}

function parseCard(src: string): SCard | null {
  const m = src.match(/\/(\d+)_(clubs|diamonds|hearts|spades)(?:_chosen)?\.gif/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  return { rank: v === 14 ? 1 : v, suit: m[2] as Suit };
}

function canStackOn(card: SCard, target: SCard): boolean {
  return card.rank === target.rank - 1 && suitColor(card.suit) !== suitColor(target.suit);
}

function canGoToFoundation(card: SCard, top: SCard | null): boolean {
  if (!top) return card.rank === 1;
  return top.suit === card.suit && card.rank === top.rank + 1;
}

function applyHighlights(): void {
  // Foundation tops (null = empty)
  const foundations: (SCard | null)[] = [];
  const foundationImgs: (HTMLImageElement | null)[] = [];
  for (let i = 0; i < 4; i++) {
    const img = document.querySelector<HTMLImageElement>(`a[onclick*="'base_${i}'"] img`);
    foundationImgs.push(img ?? null);
    foundations.push(img ? parseCard(img.src) : null);
  }

  // All face-up tableau cards with column + depth (card_X_Y → col=X, depth=Y)
  const tableauCards: TableauEntry[] = [];
  for (const img of document.querySelectorAll<HTMLImageElement>("img[name^='card_']")) {
    const m = img.name.match(/^card_(\d+)_(\d+)$/);
    if (!m) continue;
    const card = parseCard(img.src);
    if (card) tableauCards.push({ card, img, col: parseInt(m[1], 10), depth: parseInt(m[2], 10) });
  }

  // Bottom card per column = highest depth (the only card that can RECEIVE a placed card)
  const bottomByCol = new Map<number, TableauEntry>();
  for (const entry of tableauCards) {
    const cur = bottomByCol.get(entry.col);
    if (!cur || entry.depth > cur.depth) bottomByCol.set(entry.col, entry);
  }
  const bottomCards = Array.from(bottomByCol.values());

  // Empty column = fewer than 7 distinct columns have face-up cards (Kings can move there)
  const hasEmptyColumn = bottomByCol.size < 7;

  // Waste pile card
  const stackImg = document.querySelector<HTMLImageElement>(`a[onclick*="'stack_0'"] img`);
  const stackCard = stackImg ? parseCard(stackImg.src) : null;

  // Detect selected card: clicking a column marks its entire sub-stack as _chosen.gif.
  // Find the topmost chosen card (lowest depth) — that's the head of the sub-stack being moved.
  let selectedCard: SCard | null = null;
  let selectedCol = -1;
  let selectedDepth = Infinity;

  for (const { img, col, depth } of tableauCards) {
    if (img.src.includes("_chosen.gif") && depth < selectedDepth) {
      selectedDepth = depth;
      selectedCard = parseCard(img.src);
      selectedCol = col;
    }
  }
  if (!selectedCard && stackImg?.src.includes("_chosen.gif")) {
    selectedCard = parseCard(stackImg.src);
    selectedCol = -1;
  }

  if (selectedCard) {
    // Blue = valid destination; dim everything else.
    // Only bottom cards of OTHER columns can receive a card.
    for (const { card: t, img, col, depth } of tableauCards) {
      const isBottom = bottomByCol.get(col)?.depth === depth;
      const valid = isBottom && col !== selectedCol && canStackOn(selectedCard, t);
      img.style.outline = valid ? "3px solid #3b82f6" : "";
      img.style.boxShadow = valid ? "0 0 8px #3b82f6" : "";
      img.style.opacity = valid ? "1" : "0.45";
    }
    for (let i = 0; i < 4; i++) {
      const img = foundationImgs[i];
      if (!img) continue;
      const valid = canGoToFoundation(selectedCard, foundations[i]);
      img.style.outline = valid ? "3px solid #3b82f6" : "";
      img.style.boxShadow = valid ? "0 0 8px #3b82f6" : "";
      img.style.opacity = valid ? "1" : "0.45";
    }
    if (stackImg && !stackImg.src.includes("_chosen")) {
      stackImg.style.outline = "";
      stackImg.style.boxShadow = "";
      stackImg.style.opacity = "1";
    }
  } else {
    // Green = has at least one valid move; dim = stuck.
    // Destination check is against bottom cards only (covered cards can't receive).
    function hasValidMove(card: SCard, col: number): boolean {
      for (let i = 0; i < 4; i++) {
        if (canGoToFoundation(card, foundations[i])) return true;
      }
      for (const b of bottomCards) {
        if (b.col === col) continue;
        if (canStackOn(card, b.card)) return true;
      }
      if (hasEmptyColumn && card.rank === 13) return true;
      return false;
    }

    for (const { card, img, col } of tableauCards) {
      const movable = hasValidMove(card, col);
      img.style.outline = movable ? "3px solid #22c55e" : "";
      img.style.boxShadow = movable ? "0 0 8px #22c55e" : "";
      img.style.opacity = movable ? "1" : "0.6";
    }
    if (stackCard && stackImg) {
      const movable = hasValidMove(stackCard, -1);
      stackImg.style.outline = movable ? "3px solid #22c55e" : "";
      stackImg.style.boxShadow = movable ? "0 0 8px #22c55e" : "";
      stackImg.style.opacity = movable ? "1" : "0.6";
    }
    for (const img of foundationImgs) {
      if (img) { img.style.outline = ""; img.style.boxShadow = ""; img.style.opacity = "1"; }
    }
  }
}

export function applySolitaireHelper(): void {
  if (!location.pathname.includes("sakhmet_solitaire.phtml")) return;
  applyHighlights();
  document.addEventListener("click", () => setTimeout(applyHighlights, 50));
}
