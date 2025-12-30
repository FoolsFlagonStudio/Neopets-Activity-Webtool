# Neopets Activity Tracker
**Design & Architecture Document**

---

## 1. Summary

The purpose of this webtool is to track activity availability on the Neopets website and alert the user when an activity becomes available again. The tool provides useful information and direct links to each activity to simplify the daily Neopets routine as much as possible.

Activities on Neopets follow several different timing rules:

- **Once per day** (resets at 12:00 AM NPT, equivalent to PST)
- **X times per day** (resets at 12:00 AM NPT)
- **Once every X minutes or hours** (cooldown based on last completion)
- **Multiple plays per day up to a fixed count**

By providing a centralized dashboard with quick access to activity links and availability timing, the tool helps users complete dailies more efficiently while tracking cooldown-based activities (for example, the Wheel of Mediocrity every 40 minutes) and sending alerts when they are ready.

---

## 2. Core Principles

### ToS-Safe by Design

- No automated clicks
- No request replay
- No page refresh loops
- No headless browsing
- Read-only observation only

### Deterministic & Predictable

- All timing rules are explicit
- No “magic” or implicit behavior
- Users can always manually override activity state

### Data-Driven

- Activities are defined declaratively
- No hard-coded logic per activity
- All behavior is derived from metadata

### Offline-First

- Works without internet once installed
- No backend server
- No external APIs required

---

## 3. Technology Stack (Locked)

### Platform

- Chrome Extension (Manifest V3)
- Chromium-first (Chrome, Edge, Brave)
- Firefox support possible later (out of scope)

### Languages

- TypeScript (strict mode)
- Plain HTML + CSS (no React)

**Why no React?**
- Overkill for a popup UI
- Adds unnecessary build complexity
- MV3 service workers + React introduce friction

### Storage

- `chrome.storage.local`
- Optional `chrome.storage.sync` in the future

### Notifications

- `chrome.notifications`
- Background service worker–based scheduling

### Tooling

- ESLint
- Prettier
- No test framework initially (can be added later)

---

## 4. Extension Architecture (High Level)

User → Neopets site </br>
↓</br>
Content Script (read-only)</br>
↓</br>
Background Service Worker</br>
↓</br>
Popup UI + Notifications

---

### Separation of Concerns

- **Content scripts observe**
- **Background service worker computes**
- **Popup UI displays**

No layer performs responsibilities outside its scope.

---

## 5. Core Extension Components

### Content Scripts (Observer Layer)

**Purpose**
- Detect when an activity has been completed
- Emit signals only (no state changes or decisions)

**Capabilities**
- Read URL
- Read DOM text
- Listen for navigation changes
- Optionally inspect network responses (read-only)

**Explicit Restrictions**
- ❌ No clicks
- ❌ No form submissions
- ❌ No timers
- ❌ No storage writes

**Output Format**
```ts
{
  activityId: string;
  detectedAt: number;
  signalType: "reward" | "completion" | "blocked";
}
```
---

## Background Service Worker (Brain)
### Purpose

- Central authority for all state

- Timing logic

- Notification scheduling

### Responsibilities

- Store activity state

- Calculate availability

- Handle resets

- Fire notifications

### This is the ONLY place that:

- Mutates activity state

- Computes cooldowns

- Decides availability


### Popup UI (Dashboard)

#### Purpose

- Human-readable control center

#### Features

- Activity list grouped by category

- Status icons (available / locked / soon)

- Countdown timers

- Quick links to activities

- Manual overrides

#### Zero Logic

- UI reads computed state only

- All logic lives in the background service worker

---

## 6. Activity Timing Model (Locked Design)

**Every activity must fit one of the following timing types.**

### DAILY_RESET

- Resets at a fixed time (NPT midnight)

- Independent of completion time

```ts
{
  timingType: "DAILY_RESET",
  resetTimezone: "America/Los_Angeles",
  resetHour: 0
}
```

### DAILY_LIMIT

- X uses per day

- Resets at NPT midnight

```ts
{
  timingType: "DAILY_LIMIT",
  maxPerDay: number
}
```

### COOLDOWN

- Availability based on last completion time
```ts
{
  timingType: "COOLDOWN",
  cooldownMinutes: number,
  bufferMinutes?: number
}
```

### WINDOWED

- Available only during specific time windows

```ts
{
  timingType: "WINDOWED",
  allowedWindows: TimeRange[],
  maxPerDay?: number
}
```

### CONDITIONAL

- User-controlled enable/disable

- Requires external conditions

```ts
{
  timingType: "CONDITIONAL",
  requirements: string[]
}
```
---

## 7. Activity State Model

**Activity definition ≠ Activity state**

### Definition (Static)

- Name

- URL

- Timing rules

### State (Mutable)

```ts
{
  lastCompletedAt?: number;
  usesToday?: number;
  lastResetAt?: number;
  enabled: boolean;
  notificationsEnabled: boolean;
}
```


This separation prevents data corruption and makes daily resets trivial.

---

## 8. Repository Structure (Locked)

```stylus
neopets-activity-tracker/
├─ manifest.json
├─ src/
│  ├─ background/
│  │  ├─ index.ts
│  │  ├─ scheduler.ts
│  │  ├─ stateManager.ts
│  │  ├─ availabilityEngine.ts
│  │  └─ notifications.ts
│  │
│  ├─ content/
│  │  ├─ observer.ts
│  │  ├─ detectors/
│  │  │  └─ wheelDetectors.ts
│  │  └─ messaging.ts
│  │
│  ├─ popup/
│  │  ├─ popup.html
│  │  ├─ popup.ts
│  │  ├─ popup.css
│  │  └─ components/
│  │
│  ├─ data/
│  │  ├─ activities.ts
│  │  └─ categories.ts
│  │
│  ├─ types/
│  │  └─ activity.ts
│  │
│  └─ utils/
│     ├─ time.ts
│     ├─ npt.ts
│     └─ guards.ts
│
├─ assets/
│  └─ icons/
│
├─ .gitignore
├─ LICENSE
└─ README.md

```
---

## 9. Notification Philosophy

- Opt-in per activity

- Default OFF for spammy timers

- Fire only once per availability window

- No repeat nagging

Example:

“Wheel of Mediocrity is available”

---

## 10. Versioning & Evolution Plan

### v0.1

- Manual tracking only

- No content scripts

### v0.2

- Read-only detection

- Cooldown timers

### v1.0

- Full activity catalog

- Stable schema

- Public release

---

## 11. Explicit Non-Goals

This tool will **never**:

- Auto-play games

- Auto-spin wheels

- Auto-refresh pages

- Bypass ads or captchas

- Store user credentials

- Send network requests to Neopets

---

## Final Notes

This document acts as a design contract.
Once accepted, implementation must conform to this structure without redefining core concepts.