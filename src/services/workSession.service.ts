import { WorkSession, IWorkSession } from '../models/WorkSession';
import { notificationService } from './notification.service';
import { conflictService } from './conflict.service';
import { AppError, NotFoundError } from '../utils/errors';
import mongoose from 'mongoose';

const OVERTIME_THRESHOLD_MINUTES = 8 * 60;

export class WorkSessionService {
  async clockIn(userId: string, shiftId?: string) {
    const active = await conflictService.checkActiveSession(userId);
    if (active) throw new AppError('You already have an active work session. Clock out first.', 409);

    const session = await WorkSession.create({
      user: new mongoose.Types.ObjectId(userId),
      shift: shiftId ? new mongoose.Types.ObjectId(shiftId) : undefined,
      clockIn: new Date(),
      status: 'active',
    });

    return session;
  }

  async clockOut(userId: string, breakMinutes = 0) {
    const session = await WorkSession.findOne({ user: userId, status: 'active' });
    if (!session) throw new NotFoundError('No active work session found');

    const clockOut = new Date();
    const totalMinutes = Math.floor((clockOut.getTime() - session.clockIn.getTime()) / 60000);
    const workedMinutes = totalMinutes - breakMinutes;
    const overtimeMinutes = Math.max(0, workedMinutes - OVERTIME_THRESHOLD_MINUTES);

    session.clockOut = clockOut;
    session.breakMinutes = breakMinutes;
    session.durationMinutes = workedMinutes;
    session.isOvertime = overtimeMinutes > 0;
    session.overtimeMinutes = overtimeMinutes;
    session.status = 'pending_approval';
    await session.save();

    return session;
  }

  async getActiveSessions() {
    return WorkSession.find({ status: 'active' })
      .populate('user', 'name email avatarUrl')
      .populate('shift', 'title location')
      .sort({ clockIn: 1 });
  }

  async getUserSessions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      WorkSession.find({ user: userId })
        .populate('shift', 'title location date')
        .sort({ clockIn: -1 })
        .skip(skip)
        .limit(limit),
      WorkSession.countDocuments({ user: userId }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveSession(sessionId: string, adminId: string, comment?: string) {
    const session = await WorkSession.findById(sessionId).populate('user', 'name');
    if (!session) throw new NotFoundError('Session not found');
    if (session.status !== 'pending_approval') {
      throw new AppError('Session is not pending approval', 400);
    }

    session.status = 'approved';
    session.approvedBy = new mongoose.Types.ObjectId(adminId) as any;
    session.approvedAt = new Date();
    if (comment) session.adminComment = comment;
    await session.save();

    await notificationService.create({
      recipient: session.user.toString(),
      type: 'session_approved',
      title: 'Work session approved',
      body: `Your work session on ${session.clockIn.toDateString()} has been approved`,
      link: '/reports',
    });

    return session;
  }

  async rejectSession(sessionId: string, adminId: string, comment: string) {
    const session = await WorkSession.findById(sessionId);
    if (!session) throw new NotFoundError('Session not found');

    session.status = 'rejected';
    session.approvedBy = new mongoose.Types.ObjectId(adminId) as any;
    session.approvedAt = new Date();
    session.adminComment = comment;
    await session.save();

    await notificationService.create({
      recipient: session.user.toString(),
      type: 'session_rejected',
      title: 'Work session rejected',
      body: comment || 'Your work session was rejected by admin',
      link: '/reports',
    });

    return session;
  }

  async getAllSessions(page = 1, limit = 20, status?: string) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status as IWorkSession['status'];

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      WorkSession.find(filter)
        .populate('user', 'name email avatarUrl')
        .populate('shift', 'title location date')
        .populate('approvedBy', 'name')
        .sort({ clockIn: -1 })
        .skip(skip)
        .limit(limit),
      WorkSession.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export const workSessionService = new WorkSessionService();
