import { Response } from 'express';
import { AuthRequest } from '../types';
import { Availability } from '../models/Availability';
import { ExchangeRequest } from '../models/ExchangeRequest';
import { LeaveRequest } from '../models/LeaveRequest';
import { Notification } from '../models/Notification';
import { notificationService } from '../services/notification.service';
import { NotFoundError, AppError } from '../utils/errors';
import { param } from '../utils/helpers';

// ── AVAILABILITY ──────────────────────────────────────────────────────────────

export const addAvailability = async (req: AuthRequest, res: Response) => {
  const availability = await Availability.create({ ...req.body, user: req.user!.userId });
  res.status(201).json({ success: true, message: 'Availability added', data: { availability } });
};

export const getMyAvailability = async (req: AuthRequest, res: Response) => {
  const availability = await Availability.find({ user: req.user!.userId }).sort({ date: 1 });
  res.status(200).json({ success: true, message: 'Availability retrieved', data: { availability } });
};

export const getAllAvailability = async (_req: AuthRequest, res: Response) => {
  const availability = await Availability.find()
    .populate('user', 'name email avatarUrl')
    .sort({ date: 1 });
  res.status(200).json({ success: true, message: 'All availability retrieved', data: { availability } });
};

export const updateAvailability = async (req: AuthRequest, res: Response) => {
  const availability = await Availability.findOneAndUpdate(
    { _id: req.params.id, user: req.user!.userId },
    { ...req.body, status: 'pending' },
    { new: true }
  );
  if (!availability) throw new NotFoundError('Availability not found');
  res.status(200).json({ success: true, message: 'Availability updated', data: { availability } });
};

export const deleteAvailability = async (req: AuthRequest, res: Response) => {
  const availability = await Availability.findOneAndDelete({
    _id: req.params.id,
    user: req.user!.userId,
  });
  if (!availability) throw new NotFoundError('Availability not found');
  res.status(200).json({ success: true, message: 'Availability deleted' });
};

export const respondToAvailability = async (req: AuthRequest, res: Response) => {
  const { status, adminComment } = req.body;
  const availability = await Availability.findByIdAndUpdate(
    req.params.id,
    { status, adminComment },
    { new: true }
  ).populate('user', 'name email');
  if (!availability) throw new NotFoundError('Availability not found');

  await notificationService.create({
    recipient: (availability.user as any)._id.toString(),
    type: status === 'approved' ? 'availability_approved' : 'availability_rejected',
    title: `Availability ${status}`,
    body: adminComment || `Your availability request was ${status}`,
    link: '/availability',
  });

  res.status(200).json({ success: true, message: `Availability ${status}`, data: { availability } });
};

// ── EXCHANGE REQUESTS ─────────────────────────────────────────────────────────

export const requestExchange = async (req: AuthRequest, res: Response) => {
  const exchange = await ExchangeRequest.create({
    ...req.body,
    initiator: req.user!.userId,
    status: 'pending',
  });

  await notificationService.create({
    recipient: req.body.targetUser,
    type: 'exchange_requested',
    title: 'Shift exchange request',
    body: 'Someone wants to swap a shift with you',
    link: '/requests',
  });

  res.status(201).json({ success: true, message: 'Exchange request sent', data: { exchange } });
};

export const getMyExchanges = async (req: AuthRequest, res: Response) => {
  const exchanges = await ExchangeRequest.find({
    $or: [{ initiator: req.user!.userId }, { targetUser: req.user!.userId }],
  })
    .populate('initiator', 'name email avatarUrl')
    .populate('targetUser', 'name email avatarUrl')
    .populate('shiftFrom', 'title date startTime endTime')
    .populate('shiftTo', 'title date startTime endTime')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, message: 'Exchange requests retrieved', data: { exchanges } });
};

export const respondToExchange = async (req: AuthRequest, res: Response) => {
  const { response } = req.body; // 'accepted' | 'rejected'
  const exchange = await ExchangeRequest.findOne({
    _id: req.params.id,
    targetUser: req.user!.userId,
    status: 'pending',
  }).populate('initiator', 'name');

  if (!exchange) throw new NotFoundError('Exchange request not found');

  exchange.targetResponse = response;
  exchange.status = response === 'accepted' ? 'accepted' : 'rejected';
  await exchange.save();

  await notificationService.create({
    recipient: exchange.initiator.toString(),
    type: response === 'accepted' ? 'exchange_accepted' : 'exchange_rejected',
    title: `Exchange request ${response}`,
    body: `Your shift exchange request was ${response} by the other user`,
    link: '/requests',
  });

  res.status(200).json({ success: true, message: `Exchange ${response}`, data: { exchange } });
};

export const adminApproveExchange = async (req: AuthRequest, res: Response) => {
  const { status, adminComment } = req.body;
  const exchange = await ExchangeRequest.findByIdAndUpdate(
    req.params.id,
    { status, adminComment, resolvedBy: req.user!.userId, resolvedAt: new Date() },
    { new: true }
  ).populate('initiator targetUser shiftFrom shiftTo');

  if (!exchange) throw new NotFoundError('Exchange request not found');

  res.status(200).json({ success: true, message: `Exchange ${status} by admin`, data: { exchange } });
};

// ── LEAVE REQUESTS ────────────────────────────────────────────────────────────

export const requestLeave = async (req: AuthRequest, res: Response) => {
  const leave = await LeaveRequest.create({ ...req.body, user: req.user!.userId });
  res.status(201).json({ success: true, message: 'Leave request submitted', data: { leave } });
};

export const getMyLeaves = async (req: AuthRequest, res: Response) => {
  const leaves = await LeaveRequest.find({ user: req.user!.userId }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, message: 'Leave requests retrieved', data: { leaves } });
};

export const getAllLeaves = async (_req: AuthRequest, res: Response) => {
  const leaves = await LeaveRequest.find()
    .populate('user', 'name email avatarUrl')
    .populate('resolvedBy', 'name')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, message: 'All leave requests retrieved', data: { leaves } });
};

export const respondToLeave = async (req: AuthRequest, res: Response) => {
  const { status, adminComment } = req.body;
  const leave = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    { status, adminComment, resolvedBy: req.user!.userId, resolvedAt: new Date() },
    { new: true }
  ).populate('user', 'name email');

  if (!leave) throw new NotFoundError('Leave request not found');

  await notificationService.create({
    recipient: (leave.user as any)._id.toString(),
    type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
    title: `Leave request ${status}`,
    body: adminComment || `Your leave request was ${status}`,
    link: '/requests',
  });

  res.status(200).json({ success: true, message: `Leave ${status}`, data: { leave } });
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  const { page, limit } = req.query as any;
  const result = await notificationService.getForUser(
    req.user!.userId, Number(page) || 1, Number(limit) || 20
  );
  res.status(200).json({ success: true, message: 'Notifications retrieved', data: result });
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  await notificationService.markAllRead(req.user!.userId);
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  await notificationService.markOneRead(param(req.params.id), req.user!.userId);
  res.status(200).json({ success: true, message: 'Notification marked as read' });
};