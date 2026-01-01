/**
 * Activity timing models.
 * These MUST star in sync with DESIGN.md
 */

export type TimingType =
  | "DAILY_RESET"
  | "DAILY_LIMIT"
  | "COOLDOWN"
  | "WINDOWED"
  | "CONDITIONAL";

/**
 * Shared base fields for all activity definitions.
 * These never change at runtime.
 */
export interface BaseActivityDefinition {
  id: string; // stable unique identifier
  name: string; // readable name shown in UI
  url: string; // primary url for activity
  category: string; // used for grouping in ui; "wheels", "dailies", etc.
  timingType: TimingType;
  notes?: string; // Optinoal descriptive notes
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

/* ─────────────────────────────────────────────── */
/*           Union of all definitions              */
/* ─────────────────────────────────────────────── */

export type ActivityDefinition =
  | DailyResetActivity
  | DailyLimitActivity
  | CooldownActivity
  | WindowedActivity
  | ConditionalActivity;

/* ─────────────────────────────────────────────── */
/* Runtime activity state (mutable)                 */
/* ─────────────────────────────────────────────── */

export interface ActivityState {
  lastCompletedAt?: number; // Timestamp (ms) when the activity was last completed
  usesToday?: number; // Number of times used in the current reset window
  lastResetAt?: number; // Timestamp (ms) of the last reset applied
  enabled: boolean; // Whether this activity is enabled by the user
  notificationsEnabled: boolean; // Whether notifications are enabled for this activity
}

/**
 * Combined view used internally by the application.
 * Definition is static, state is mutable.
 */
export interface Activity {
  definition: ActivityDefinition;
  state: ActivityState;
}
