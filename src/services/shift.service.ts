import { v4 as uuidv4 } from 'uuid';
import { Shift } from '../models/Shift';
import { User } from '../models/User';
import { conflictService } from './conflict.service';
import { notificationService } from './notification.service';
import { NotFoundError, ConflictError, AppError } from '../utils/errors';

interface CreateShiftInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
  assignedUser?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

interface UpdateShiftInput {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  status?: string;
}

interface ShiftQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class ShiftService {
  async create(input: CreateShiftInput, createdById: string) {
    const date = new Date(input.date);

    // Check for time conflict if assigning a user
    if (input.assignedUser) {
      const user = await User.findById(input.assignedUser);
      if (!user) throw new NotFoundError('Assigned user not found');

      const conflict = await conflictService.checkShiftConflict(
        input.assignedUser, date, input.startTime, input.endTime
      );
      if (conflict) {
        throw new ConflictError(
          `User already has a shift (${conflict.title}) overlapping this time on this date`
        );
      }
    }

    const shift = await Shift.create({
      ...input,
      date,
      status: input.assignedUser ? 'assigned' : 'open',
      createdBy: createdById,
    });

    // Notify assigned user
    if (input.assignedUser) {
      await notificationService.create({
        recipient: input.assignedUser,
        type: 'shift_assigned',
        title: 'New shift assigned',
        body: `You have been assigned to "${shift.title}" on ${date.toDateString()}`,
        link: `/schedule`,
      });
    }

    return shift.populate(['assignedUser', 'createdBy']);
  }

  async createRecurring(input: CreateShiftInput, createdById: string, dates: string[]) {
    const groupId = uuidv4();
    const shifts = [];

    for (const dateStr of dates) {
      const date = new Date(dateStr);

      if (input.assignedUser) {
        const conflict = await conflictService.checkShiftConflict(
          input.assignedUser, date, input.startTime, input.endTime
        );
        if (conflict) continue; // skip conflicting dates silently
      }

      const shift = await Shift.create({
        ...input,
        date,
        status: input.assignedUser ? 'assigned' : 'open',
        isRecurring: true,
        recurrenceGroupId: groupId,
        createdBy: createdById,
      });
      shifts.push(shift);
    }

    if (input.assignedUser && shifts.length > 0) {
      await notificationService.create({
        recipient: input.assignedUser,
        type: 'shift_assigned',
        title: 'Recurring shifts assigned',
        body: `You have been assigned ${shifts.length} recurring shifts for "${input.title}"`,
        link: `/schedule`,
      });
    }

    return shifts;
  }

  async getAll(query: ShiftQuery) {
    const {
      startDate, endDate, userId, status,
      page = 1, limit = 50,
    } = query;

    const filter: Record<string, unknown> = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as any).$gte = new Date(startDate);
      if (endDate) (filter.date as any).$lte = new Date(endDate);
    }
    if (userId) filter.assignedUser = userId;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Shift.find(filter)
        .populate('assignedUser', 'name email avatarUrl')
        .populate('createdBy', 'name email')
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limit),
      Shift.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(shiftId: string) {
    const shift = await Shift.findById(shiftId)
      .populate('assignedUser', 'name email avatarUrl role')
      .populate('createdBy', 'name email');
    if (!shift) throw new NotFoundError('Shift not found');
    return shift;
  }

  async update(shiftId: string, input: UpdateShiftInput, actorId: string) {
    const shift = await Shift.findById(shiftId);
    if (!shift) throw new NotFoundError('Shift not found');

    Object.assign(shift, {
      ...input,
      ...(input.date ? { date: new Date(input.date) } : {}),
    });

    await shift.save();

    // Notify assigned user of update
    if (shift.assignedUser) {
      await notificationService.create({
        recipient: shift.assignedUser.toString(),
        type: 'shift_updated',
        title: 'Shift updated',
        body: `Your shift "${shift.title}" has been updated`,
        link: `/schedule`,
      });
    }

    return shift.populate(['assignedUser', 'createdBy']);
  }

  async delete(shiftId: string) {
    const shift = await Shift.findById(shiftId);
    if (!shift) throw new NotFoundError('Shift not found');

    if (shift.assignedUser) {
      await notificationService.create({
        recipient: shift.assignedUser.toString(),
        type: 'shift_cancelled',
        title: 'Shift cancelled',
        body: `Your shift "${shift.title}" on ${shift.date.toDateString()} has been cancelled`,
        link: `/schedule`,
      });
    }

    await shift.deleteOne();
  }

  async assignUser(shiftId: string, userId: string) {
    const shift = await Shift.findById(shiftId);
    if (!shift) throw new NotFoundError('Shift not found');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const conflict = await conflictService.checkShiftConflict(
      userId, shift.date, shift.startTime, shift.endTime, shiftId
    );
    if (conflict) {
      throw new ConflictError(
        `User already has a shift (${conflict.title}) overlapping this time`
      );
    }

    shift.assignedUser = user._id;
    shift.status = 'assigned';
    await shift.save();

    await notificationService.create({
      recipient: userId,
      type: 'shift_assigned',
      title: 'Shift assigned',
      body: `You have been assigned to "${shift.title}" on ${shift.date.toDateString()}`,
      link: `/schedule`,
    });

    return shift.populate('assignedUser', 'name email avatarUrl');
  }

  async unassignUser(shiftId: string) {
    const shift = await Shift.findById(shiftId);
    if (!shift) throw new NotFoundError('Shift not found');

    shift.assignedUser = undefined;
    shift.status = 'open';
    await shift.save();

    return shift;
  }

  async getMyShifts(userId: string, startDate?: string, endDate?: string) {
    const filter: Record<string, unknown> = { assignedUser: userId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as any).$gte = new Date(startDate);
      if (endDate) (filter.date as any).$lte = new Date(endDate);
    }

    return Shift.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: 1, startTime: 1 });
  }
}

export const shiftService = new ShiftService();