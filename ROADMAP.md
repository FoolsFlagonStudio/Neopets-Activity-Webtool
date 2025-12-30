# Project Roadmap — Neopets Activity Tracker

This roadmap defines the planned development phases for the Neopets Activity Tracker.
Each phase builds strictly on the previous one and must conform to `DESIGN.md`.

---

## Phase 0 — Specification Lock

**Goal:** Eliminate architectural uncertainty before writing code.

### Deliverables
- `DESIGN.md` (architecture, principles, tech stack)
- `ACTIVITIES.md` (human-readable activity reference)
- License and `.gitignore`

### Exit Criteria
- Core concepts are frozen
- No unresolved architectural questions
- Implementation can begin without refactors

---

## Phase 1 — Repository & Skeleton Setup

**Goal:** Create a clean, stable foundation with no behavior yet.

### Tasks
- Initialize folder structure exactly as defined in `DESIGN.md`
- Add empty placeholder files:
  - `background/index.ts`
  - `popup/popup.html`
  - `popup/popup.ts`
  - `content/observer.ts`
- Create `manifest.json` (Manifest V3)
  - Minimal permissions only
  - No logic
- Configure ESLint and Prettier
- Verify extension loads in Chrome without errors

### Exit Criteria
- Extension loads successfully
- No runtime errors
- No logic implemented yet

---

## Phase 2 — Core Type System

**Goal:** Lock data contracts before implementing behavior.

### Tasks
- Create `types/activity.ts`
- Define:
  - `TimingType`
  - `ActivityDefinition`
  - `ActivityState`
- Encode timing models from `DESIGN.md`
- Enable strict TypeScript checking
- Avoid use of `any`

### Exit Criteria
- Types compile cleanly
- No circular dependencies
- Type system can represent all activities in `ACTIVITIES.md`

---

## Phase 3 — State Management Engine

**Goal:** Centralize state logic before UI or detection.

### Tasks
- Implement `stateManager.ts`
  - Load and persist state via `chrome.storage.local`
  - Handle daily resets (NPT midnight)
- Implement `availabilityEngine.ts`
  - Compute `available`, `locked`, and `soon` states
  - Support all timing types
- Support manual overrides (mark complete, reset)

### Exit Criteria
- State transitions are deterministic
- No UI dependencies
- Logic can be tested via console logs or mocks

---

## Phase 4 — Popup UI (Read-Only First)

**Goal:** Visualize computed state without side effects.

### Tasks
- Build base `popup.html` layout
- Implement rendering in `popup.ts`
- Display:
  - Activity name
  - Status indicator
  - Time remaining
  - Link to activity
- Use mock or static data initially
- No notifications
- No content scripts

### Exit Criteria
- Popup accurately reflects state
- UI contains no business logic
- Data flows one-way from background to UI

---

## Phase 5 — Manual Tracking MVP (v0.1)

**Goal:** Ship a usable tracker without automation.

### Tasks
- Add manual “Mark as Completed” actions
- Enable per-activity notification toggles
- Fire notifications when availability changes
- Populate `activities.ts` with 5–10 core activities
  - Mix of daily-reset and cooldown activities

### Exit Criteria
- Fully usable activity tracker
- All state changes are user-driven
- No content scripts required

---

## Phase 6 — Read-Only Detection (v0.2)

**Goal:** Reduce manual input while remaining ToS-safe.

### Tasks
- Implement content script observers
- Detect activity completion via:
  - URL changes
  - Reward or result page text
- Send detection signals to background service worker
- Update state based on signals
- Preserve manual override functionality

### Exit Criteria
- Detection is reliable and non-invasive
- No automated clicks or requests
- Manual tracking remains possible

---

## Phase 7 — Full Activity Catalog

**Goal:** Expand supported activities safely and incrementally.

### Tasks
- Gradually migrate activities from `ACTIVITIES.md` into `activities.ts`
- Add category groupings
- Hide conditional or seasonal activities by default
- Add per-category enable/disable toggles

### Exit Criteria
- Majority of common Neopets activities supported
- Edge cases documented
- Performance remains stable

---

## Phase 8 — Polish & Public Release (v1.0)

**Goal:** Stabilize and prepare for public use.

### Tasks
- Add icons and basic branding
- UX and accessibility polish
- Improve error handling
- Expand README documentation
- Optional Chrome Web Store submission

### Exit Criteria
- Stable schema
- No breaking changes planned
- Ready for external users

---

## Explicit Out-of-Scope (All Phases)

This project will **never** include:
- Auto-clicking
- Auto-refreshing pages
- Request replay
- CAPTCHA bypass
- User credential storage
- Network requests to Neopets

---

## Maintenance Philosophy

- `DESIGN.md` is authoritative
- `ACTIVITIES.md` is descriptive, not executable
- Schema changes require justification
- Prefer additive changes over rewrites

---

## Final Notes

This roadmap is intentionally conservative.
The priority is long-term maintainability, ToS safety, and clarity over speed.
