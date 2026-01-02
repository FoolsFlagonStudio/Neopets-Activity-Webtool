import {
  Activity,
  ActivityDefinition,
  ActivityState,
} from "./../types/activity";

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

  switch (definition.timingType) {
    case "DAILY_RESET": {
      if (!state.lastCompletedAt) {
        return { status: "AVAILABLE" };
      }
      return { status: "LOCKED" };
    }

    case "DAILY_LIMIT": {
      const uses = state.usesToday ?? 0;

      if (uses < definition.maxPerDay) {
        return { status: "AVAILABLE" };
      }

      return { status: "LOCKED" };
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

    default:
      return { status: "LOCKED" };
  }
}
