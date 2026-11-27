import {
  Activity,
  ActivityDefinition,
  ActivityState,
} from "./../types/activity";
import type { AvailabilityResult } from "../types/availability";
import { ACTIVITIES } from "../data/activities";
import { loadActivityState } from "./stateManager";
import { getDateKeyInTimezone, getTimeParts } from "../utils/npt";

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
      const tz = definition.windowTimezone ?? "America/Los_Angeles";
      const tp = getTimeParts(now, tz);

      // Check daily cap — single-use tracks lastCompletedAt, multi-use tracks usesToday
      if (definition.maxPerDay) {
        if (definition.maxPerDay === 1) {
          if (state.lastCompletedAt) {
            const lastDoneDay = getDateKeyInTimezone(state.lastCompletedAt, tz);
            const today = getDateKeyInTimezone(now, tz);
            if (lastDoneDay === today) return { status: "LOCKED" };
          }
        } else {
          if ((state.usesToday ?? 0) >= definition.maxPerDay) return { status: "LOCKED" };
        }
      }

      // Seasonal full-day override (e.g. Snowager Dec 1–Jan 3)
      if (definition.seasonalFullDay) {
        const { startMonth, startDay, endMonth, endDay } = definition.seasonalFullDay;
        const m = tp.month;
        const d = tp.day;
        const inRange =
          (m === startMonth && d >= startDay) ||
          (m === endMonth && d <= endDay) ||
          (startMonth > endMonth
            ? m > startMonth || m < endMonth
            : m > startMonth && m < endMonth);
        if (inRange) return { status: "AVAILABLE" };
      }

      // Check time windows
      const currentMinutes = tp.hour * 60 + tp.minute;
      let msToNextWindow = Infinity;

      for (const win of definition.allowedWindows) {
        const [startH, startM] = win.start.split(":").map(Number);
        const [endH, endM] = win.end.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return { status: "AVAILABLE" };
        }

        let minUntilStart = startMinutes - currentMinutes;
        if (minUntilStart <= 0) minUntilStart += 24 * 60;
        msToNextWindow = Math.min(msToNextWindow, minUntilStart * 60 * 1000);
      }

      return {
        status: "TIME_LOCKED",
        msUntilAvailable: isFinite(msToNextWindow) ? msToNextWindow : undefined,
      };
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
