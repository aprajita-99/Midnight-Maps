/**
 * Maps the current hour (0-23) to one of the 12 two-hour time slots (0-11).
 * If isDemoNightMode is active, it forces the midnight slot (index 0).
 */
export function getTimeSlot(isDemoNightMode: boolean = false): number {
  if (isDemoNightMode) return 0; // Forced Midnight slot (00:00 - 02:00)
  
  const currentHour = new Date().getHours();
  return Math.floor(currentHour / 2);
}
