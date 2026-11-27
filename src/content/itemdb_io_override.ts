// Runs at document_start in the page's MAIN JS world (world: "MAIN").
// itemdb lazy-loads lower-rarity sections via IntersectionObserver, but
// background tabs have no visible viewport so IO callbacks never fire.
// This shim replaces IO with one that immediately reports every observed
// element as intersecting, forcing all lazy sections to load at once.

(function () {
  const _OrigIO = window.IntersectionObserver;

  // If IO isn't defined in this context (rare edge case), bail out.
  if (typeof _OrigIO !== "function") return;

  class ImmediateIntersectionObserver {
    private _callback: IntersectionObserverCallback;
    private _targets: Element[] = [];

    constructor(callback: IntersectionObserverCallback) {
      this._callback = callback;
    }

    observe(target: Element): void {
      if (this._targets.includes(target)) return;
      this._targets.push(target);

      // Fire synchronously on the next microtask so React's useEffect
      // can set up its state before the callback runs.
      Promise.resolve().then(() => {
        const rect = target.getBoundingClientRect();
        const entry = {
          target,
          isIntersecting: true,
          intersectionRatio: 1.0,
          boundingClientRect: rect,
          intersectionRect: rect,
          rootBounds: null,
          time: performance.now(),
        } as IntersectionObserverEntry;
        this._callback([entry], this as unknown as IntersectionObserver);
      });
    }

    unobserve(target: Element): void {
      this._targets = this._targets.filter((t) => t !== target);
    }

    disconnect(): void {
      this._targets = [];
    }

    get root(): Element | Document | null { return null; }
    get rootMargin(): string { return "0px"; }
    get thresholds(): ReadonlyArray<number> { return [0]; }
    takeRecords(): IntersectionObserverEntry[] { return []; }
  }

  (window as unknown as Record<string, unknown>).IntersectionObserver =
    ImmediateIntersectionObserver;
})();
