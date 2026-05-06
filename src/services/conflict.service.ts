import { Shift } from '../models/Shift';
import { WorkSession } from '../models/WorkSession';

/**
 * Converts "HH:MM" to minutes since midnight for easy comparison.
 */
const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Returns true if two time ranges overlap.
 */
const timesOverlap = (
  start1: string, end1: string,
  start2: string, end2: string
): boolean => {
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  return s1 < e2 && s2 < e1;
};

export class ConflictService {
  /**
   * Check if assigning a user to a shift conflicts with their existing shifts on the same date.
   * Returns the conflicting shift if found, null otherwise.
   */
  async checkShiftConflict(
    userId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeShiftId?: string
  ) {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const existingShifts = await Shift.find({
      assignedUser: userId,
      date: { $gte: dateStart, $lte: dateEnd },
      status: { $nin: ['cancelled'] },
      ...(excludeShiftId ? { _id: { $ne: excludeShiftId } } : {}),
    });

    for (const shift of existingShifts) {
      if (timesOverlap(startTime, endTime, shift.startTime, shift.endTime)) {
        return shift;
      }
    }

    return null;
  }

  /**
   * Check if a user already has an active work session.
   */
  async checkActiveSession(userId: string) {
    return WorkSession.findOne({ user: userId, status: 'active' });
  }
}

export const conflictService = new ConflictService();