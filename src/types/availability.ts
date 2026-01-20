// src/types/availability.ts

export type AvailabilityStatus = "AVAILABLE" | "LOCKED" | "SOON";

export interface AvailabilityResult {
  status: AvailabilityStatus;
  msUntilAvailable?: number;
}
