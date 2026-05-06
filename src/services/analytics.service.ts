import { WorkSession } from '../models/WorkSession';
import { Shift } from '../models/Shift';
import { User } from '../models/User';

export class AnalyticsService {
  /**
   * KPI summary cards for admin dashboard
   */
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalEmployees,
      activeSessionsCount,
      pendingApprovalsCount,
      monthlyHours,
      weeklyHours,
      dailyHours,
      overtimeHours,
      attendanceStats,
    ] = await Promise.all([
      User.countDocuments({ isActive: true, role: 'user' }),

      WorkSession.countDocuments({ status: 'active' }),

      WorkSession.countDocuments({ status: 'pending_approval' }),

      WorkSession.aggregate([
        { $match: { status: 'approved', clockIn: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$durationMinutes' } } },
      ]),

      WorkSession.aggregate([
        { $match: { status: 'approved', clockIn: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$durationMinutes' } } },
      ]),

      WorkSession.aggregate([
        { $match: { status: 'approved', clockIn: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$durationMinutes' } } },
      ]),

      WorkSession.aggregate([
        { $match: { status: 'approved', clockIn: { $gte: startOfMonth }, isOvertime: true } },
        { $group: { _id: null, total: { $sum: '$overtimeMinutes' } } },
      ]),

      WorkSession.aggregate([
        { $match: { clockIn: { $gte: startOfMonth } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const toHours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

    return {
      totalEmployees,
      activeSessionsCount,
      pendingApprovalsCount,
      monthlyHours: toHours(monthlyHours[0]?.total || 0),
      weeklyHours: toHours(weeklyHours[0]?.total || 0),
      dailyHours: toHours(dailyHours[0]?.total || 0),
      overtimeHours: toHours(overtimeHours[0]?.total || 0),
      attendanceStats,
    };
  }

  /**
   * Hours worked over time — grouped by day, week, or month
   */
  async getHoursOverTime(
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ) {
    const groupBy = {
      daily: { year: { $year: '$clockIn' }, month: { $month: '$clockIn' }, day: { $dayOfMonth: '$clockIn' } },
      weekly: { year: { $year: '$clockIn' }, week: { $week: '$clockIn' } },
      monthly: { year: { $year: '$clockIn' }, month: { $month: '$clockIn' } },
    }[period];

    const results = await WorkSession.aggregate([
      {
        $match: {
          status: 'approved',
          clockIn: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: groupBy,
          totalMinutes: { $sum: '$durationMinutes' },
          overtimeMinutes: { $sum: '$overtimeMinutes' },
          sessionCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ]);

    return results.map((r) => ({
      period: r._id,
      totalHours: Math.round((r.totalMinutes / 60) * 10) / 10,
      overtimeHours: Math.round((r.overtimeMinutes / 60) * 10) / 10,
      sessionCount: r.sessionCount,
    }));
  }

  /**
   * Per-user hours breakdown
   */
  async getUserHours(startDate: Date, endDate: Date) {
    return WorkSession.aggregate([
      {
        $match: {
          status: 'approved',
          clockIn: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$user',
          totalMinutes: { $sum: '$durationMinutes' },
          overtimeMinutes: { $sum: '$overtimeMinutes' },
          sessionCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          avatarUrl: '$user.avatarUrl',
          totalHours: { $round: [{ $divide: ['$totalMinutes', 60] }, 1] },
          overtimeHours: { $round: [{ $divide: ['$overtimeMinutes', 60] }, 1] },
          sessionCount: 1,
        },
      },
      { $sort: { totalHours: -1 } },
    ]);
  }

  /**
   * Attendance rate — approved sessions vs total scheduled shifts
   */
  async getAttendanceRate(startDate: Date, endDate: Date) {
    const [scheduledShifts, completedSessions] = await Promise.all([
      Shift.countDocuments({
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ['assigned', 'completed'] },
      }),
      WorkSession.countDocuments({
        clockIn: { $gte: startDate, $lte: endDate },
        status: 'approved',
      }),
    ]);

    const rate = scheduledShifts > 0
      ? Math.round((completedSessions / scheduledShifts) * 100)
      : 0;

    return { scheduledShifts, completedSessions, attendanceRate: rate };
  }

  /**
   * Shift completion stats by status
   */
  async getShiftStats(startDate: Date, endDate: Date) {
    return Shift.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }

  /**
   * Per-user stats for their own dashboard
   */
  async getMyStats(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [monthly, weekly, allTime] = await Promise.all([
      WorkSession.aggregate([
        { $match: { user: userId as any, status: 'approved', clockIn: { $gte: startOfMonth } } },
        { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, overtime: { $sum: '$overtimeMinutes' }, count: { $sum: 1 } } },
      ]),
      WorkSession.aggregate([
        { $match: { user: userId as any, status: 'approved', clockIn: { $gte: startOfWeek } } },
        { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, overtime: { $sum: '$overtimeMinutes' } } },
      ]),
      WorkSession.aggregate([
        { $match: { user: userId as any, status: 'approved' } },
        { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, overtime: { $sum: '$overtimeMinutes' }, count: { $sum: 1 } } },
      ]),
    ]);

    const toHours = (min: number) => Math.round((min / 60) * 10) / 10;

    return {
      monthly: {
        hours: toHours(monthly[0]?.minutes || 0),
        overtimeHours: toHours(monthly[0]?.overtime || 0),
        sessions: monthly[0]?.count || 0,
      },
      weekly: {
        hours: toHours(weekly[0]?.minutes || 0),
        overtimeHours: toHours(weekly[0]?.overtime || 0),
      },
      allTime: {
        hours: toHours(allTime[0]?.minutes || 0),
        overtimeHours: toHours(allTime[0]?.overtime || 0),
        sessions: allTime[0]?.count || 0,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();