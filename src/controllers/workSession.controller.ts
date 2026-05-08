import { Response } from 'express';
import { workSessionService } from '../services/workSession.service';
import { AuthRequest } from '../types';
import { param } from '../utils/helpers';

export const clockIn = async (req: AuthRequest, res: Response) => {
  const shiftId = req.body.shiftId as string | undefined;
  const session = await workSessionService.clockIn(req.user!.userId, shiftId);
  res.status(201).json({ success: true, message: 'Clocked in successfully', data: { session } });
};

export const clockOut = async (req: AuthRequest, res: Response) => {
  const breakMinutes = Number(req.body.breakMinutes) || 0;
  const session = await workSessionService.clockOut(req.user!.userId, breakMinutes);
  res.status(200).json({ success: true, message: 'Clocked out. Awaiting admin approval.', data: { session } });
};

export const getActiveSessions = async (_req: AuthRequest, res: Response) => {
  const sessions = await workSessionService.getActiveSessions();
  res.status(200).json({ success: true, message: 'Active sessions', data: { sessions } });
};

export const getMySessions = async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await workSessionService.getUserSessions(req.user!.userId, page, limit);
  res.status(200).json({ success: true, message: 'Sessions retrieved', data: result });
};

export const getAllSessions = async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status as string | undefined;
  const result = await workSessionService.getAllSessions(page, limit, status);
  res.status(200).json({ success: true, message: 'All sessions retrieved', data: result });
};

export const approveSession = async (req: AuthRequest, res: Response) => {
  const comment = req.body.comment as string | undefined;
  const session = await workSessionService.approveSession(param(req.params.id), req.user!.userId, comment);
  res.status(200).json({ success: true, message: 'Session approved', data: { session } });
};

export const rejectSession = async (req: AuthRequest, res: Response) => {
  const comment = req.body.comment as string;
  const session = await workSessionService.rejectSession(param(req.params.id), req.user!.userId, comment);
  res.status(200).json({ success: true, message: 'Session rejected', data: { session } });
};
