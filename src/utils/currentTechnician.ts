import type { Profile, Technician } from "../types";

/**
 * Resolve the technician record belonging to the current user.
 *
 * Priority:
 *   1. `owner_technician_id` (owner-as-technician feature)
 *   2. `technicians.user_id === profile.id` (invited technicians)
 *   3. Legacy name match fallback (case-insensitive)
 *
 * Returns `null` when no technician record can be reliably linked to the user.
 */
export function resolveCurrentTechnician(
  profile: Profile | null,
  technicians: Technician[],
): Technician | null {
  if (!profile) return null;

  // 1. Owner-as-technician explicit link
  if (profile.owner_technician_id) {
    const linked = technicians.find((t) => t.id === profile.owner_technician_id);
    if (linked) return linked;
  }

  // 2. Reliable user_id link (invited technicians)
  if (profile.id) {
    const byUserId = technicians.find((t) => t.user_id === profile.id);
    if (byUserId) return byUserId;
  }

  // 3. Legacy name match fallback
  if (profile.name) {
    return (
      technicians.find(
        (t) => t.name.toLowerCase() === profile.name.toLowerCase(),
      ) ?? null
    );
  }

  return null;
}

/**
 * Return only the work orders that belong to the given technician.
 * When `technician` is null, returns an empty array (never the whole company).
 */
export function filterWorkOrdersByTechnician<T extends { assignedTo: string | null }>(
  workOrders: T[],
  technician: Technician | null,
): T[] {
  if (!technician) return [];
  return workOrders.filter((w) => w.assignedTo === technician.id);
}
