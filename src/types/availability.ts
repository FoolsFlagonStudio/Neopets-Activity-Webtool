// src/types/availability.ts

export type AvailabilityStatus = "AVAILABLE" | "LOCKED" | "SOON" | "TIME_LOCKED";

export interface AvailabilityResult {
  status: AvailabilityStatus;
  msUntilAvailable?: number;
}
