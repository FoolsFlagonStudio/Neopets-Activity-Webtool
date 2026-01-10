import {
  Activity,
  ActivityDefinition,
  ActivityState,
} from "./../types/activity";
import { ACTIVITIES } from "../data/activities";
import { loadActivityState } from "./stateManager";
import { getDateKeyInTimezone } from "../utils/npt";

/**
 * Returns all activities with computed availability
 * Used by scheduler & notifications
 */
export async function getAllActivitiesWithAvailability(): Promise<
  {
    definition: ActivityDefinition;
    state: ActivityState;
    availability: AvailabilityResult;
  }[]
> {
  const now = Date.now();
  const stateMap = await loadActivityState();

  return ACTIVITIES.map((definition) => {
    const state: ActivityState = stateMap[definition.id] ?? {
      enabled: true,
      notificationsEnabled: true,
    };

    const availability = computeAvailability({ definition, state }, now);

    return {
      definition,
      state,
      availability,
    };
  });
}

// availability status for an activity
export type AvailabilityStatus = "AVAILABLE" | "LOCKED" | "SOON";

// result of availability computation
export interface AvailabilityResult {
  status: AvailabilityStatus;
  msUntilAvailable?: number; // milliseconds until available (if LOCKED or SOON)
}

// computation function
export function computeAvailability(
  activity: Activity,
  now: number
): AvailabilityResult {
  const { definition, state } = activity;

  // Enforce daily limit first (even if cooldown exists)
  if (
    definition.timingType === "DAILY_LIMIT" &&
    typeof definition.maxPerDay === "number"
  ) {
    const uses = state.usesToday ?? 0;
    if (uses >= definition.maxPerDay) {
      return { status: "LOCKED" };
    }
  }

  switch (definition.timingType) {
    case "DAILY_RESET": {
      if (!state.lastCompletedAt) {
        return { status: "AVAILABLE" };
      }

      const timeZone = definition.resetTimezone ?? "America/Los_Angeles";

      const lastDoneDay = getDateKeyInTimezone(state.lastCompletedAt, timeZone);

      const today = getDateKeyInTimezone(now, timeZone);

      if (lastDoneDay !== today) {
        return { status: "AVAILABLE" };
      }

      return { status: "LOCKED" };
    }

    case "DAILY_LIMIT": {
      const uses = state.usesToday ?? 0;

      // Hard daily cap
      if (uses >= definition.maxPerDay) {
        return { status: "LOCKED" };
      }

      // Optional cooldown between uses
      if (definition.cooldownMinutes && state.lastCompletedAt) {
        const cooldownMs =
          (definition.cooldownMinutes + (definition.bufferMinutes ?? 0)) *
          60 *
          1000;

        const remaining = state.lastCompletedAt + cooldownMs - now;

        if (remaining > 0) {
          return {
            status: remaining < 5 * 60 * 1000 ? "SOON" : "LOCKED",
            msUntilAvailable: remaining,
          };
        }
      }

      return { status: "AVAILABLE" };
    }

    case "COOLDOWN": {
      if (!state.lastCompletedAt) {
        return { status: "AVAILABLE" };
      }

      const cooldownMs =
        (definition.cooldownMinutes + (definition.bufferMinutes ?? 0)) *
        60 *
        1000;

      const availableAt = state.lastCompletedAt + cooldownMs;
      const remaining = availableAt - now;

      if (remaining <= 0) {
        return { status: "AVAILABLE" };
      }

      return {
        status: remaining < 5 * 60 * 1000 ? "SOON" : "LOCKED",
        msUntilAvailable: remaining,
      };
    }

    case "WINDOWED": {
      return { status: "LOCKED" };
    }

    case "CONDITIONAL": {
      return state.enabled ? { status: "AVAILABLE" } : { status: "LOCKED" };
    }

    case "STATIC": {
      return { status: "AVAILABLE" };
    }

    case "MONTHLY_RESET": {
      if (!state.lastCompletedAt) {
        return { status: "AVAILABLE" };
      }

      const tz = "America/Los_Angeles";

      const last = new Date(getDateKeyInTimezone(state.lastCompletedAt, tz));
      const nowDate = new Date(getDateKeyInTimezone(now, tz));

      const sameMonth =
        last.getUTCFullYear() === nowDate.getUTCFullYear() &&
        last.getUTCMonth() === nowDate.getUTCMonth();

      if (!sameMonth) {
        return { status: "AVAILABLE" };
      }

      // Compute next month 1st at 00:00 NPT
      const nextMonth = new Date(now);
      nextMonth.setUTCDate(1);
      nextMonth.setUTCMonth(nowDate.getUTCMonth() + 1);
      nextMonth.setUTCHours(8, 0, 0, 0); // midnight PST = 08:00 UTC

      return {
        status: "LOCKED",
        msUntilAvailable: nextMonth.getTime() - now,
      };
    }

    case "VARIABLE_COOLDOWN": {
      if (!state.lastCompletedAt) {
        return { status: "AVAILABLE" };
      }

      const remaining = state.lastCompletedAt - now;

      if (remaining <= 0) {
        return { status: "AVAILABLE" };
      }

      return {
        status: remaining < 5 * 60 * 1000 ? "SOON" : "LOCKED",
        msUntilAvailable: remaining,
      };
    }

    default:
      return { status: "LOCKED" };
  }
}
