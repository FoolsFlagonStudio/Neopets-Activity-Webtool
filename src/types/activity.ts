import type { AvailabilityStatus } from "../background/availabilityEngine";

/**
 * Activity timing models.
 * These MUST star in sync with DESIGN.md
 */

export type TimingType =
  | "DAILY_RESET"
  | "DAILY_LIMIT"
  | "MONTHLY_RESET"
  | "COOLDOWN"
  | "WINDOWED"
  | "CONDITIONAL"
  | "STATIC"
  | "VARIABLE_COOLDOWN";

/**
 * Shared base fields for all activity definitions.
 * These never change at runtime.
 */
export interface BaseActivityDefinition {
  id: string; // stable unique identifier
  name: string; // readable name shown in UI
  links?: ActivityLink[];
  category: string; // used for grouping in ui; "wheels", "dailies", etc.
  timingType: TimingType;
  sharedWith?: string;
  notes?: string; // Optinoal descriptive notes
}

interface ActivityLink {
  label: string; // What the user sees
  url: string; // Where it goes
  kind?: "action" | "helper" | "external";
  tooltip?: string; // Optional hover text
}

/* ─────────────────────────────────────────────── */
/*           Timing-specific definitions           */
/* ─────────────────────────────────────────────── */

export interface DailyResetActivity extends BaseActivityDefinition {
  timingType: "DAILY_RESET";
  resetTimezone: string; // IANA timezone identifier
  resetHour: number;
}

export interface DailyLimitActivity extends BaseActivityDefinition {
  timingType: "DAILY_LIMIT";
  maxPerDay: number;
  cooldownMinutes?: number;
  bufferMinutes?: number;
  resetTimezone?: string;
  resetHour?: number;
}

export interface CooldownActivity extends BaseActivityDefinition {
  timingType: "COOLDOWN";
  cooldownMinutes: number;
  bufferMinutes?: number; // optional buffer added to cooldown to avoid early alerts
}

export interface TimeWindow {
  start: string; // in HH:MM (24h)
  end: string; // in HH:MM (24h)
}

export interface WindowedActivity extends BaseActivityDefinition {
  timingType: "WINDOWED";
  allowedWindows: TimeWindow[];
  maxPerDay?: number;
}

export interface ConditionalActivity extends BaseActivityDefinition {
  timingType: "CONDITIONAL";
  requirements: string[]; // readable requirements (not enforced programatically) e.g., "Requires full map"
}

export interface StaticActivity extends BaseActivityDefinition {
  timingType: "STATIC";
}

export interface MonthlyResetActivity extends BaseActivityDefinition {
  timingType: "MONTHLY_RESET";
  resetTimezone?: string;
}

export interface VariableCooldownActivity extends BaseActivityDefinition {
  timingType: "VARIABLE_COOLDOWN";
}

/* ─────────────────────────────────────────────── */
/*           Union of all definitions              */
/* ─────────────────────────────────────────────── */

export type ActivityDefinition =
  | DailyResetActivity
  | DailyLimitActivity
  | CooldownActivity
  | WindowedActivity
  | ConditionalActivity
  | StaticActivity
  | MonthlyResetActivity
  | VariableCooldownActivity;

/* ─────────────────────────────────────────────── */
/* Runtime activity state (mutable)                 */
/* ─────────────────────────────────────────────── */

export interface ActivityState {
  lastCompletedAt?: number; // Timestamp (ms) when the activity was last completed
  usesToday?: number; // Number of times used in the current reset window
  lastUsedDay?: string;
  lastResetAt?: number; // Timestamp (ms) of the last reset applied
  enabled: boolean; // Whether this activity is enabled by the user
  notificationsEnabled: boolean; // Whether notifications are enabled for this activity
  lastNotifiedAt?: number;
  lastResetDay?: string;
  lastAvailabilityStatus?: AvailabilityStatus;
}

/**
 * Combined view used internally by the application.
 * Definition is static, state is mutable.
 */
export interface Activity {
  definition: ActivityDefinition;
  state: ActivityState;
}
