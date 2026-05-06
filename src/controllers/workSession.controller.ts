import { Response } from 'express';
import { workSessionService } from '../services/workSession.service';
import { AuthRequest } from '../types';

// ── Work Session ───────────────────────────────────────────────────────────────
export const clockIn = async (req: AuthRequest, res: Response) => {
  const session = await workSessionService.clockIn(req.user!.userId, req.body.shiftId);
  res.status(201).json({ success: true, message: 'Clocked in successfully', data: { session } });
};

export const clockOut = async (req: AuthRequest, res: Response) => {
  const session = await workSessionService.clockOut(req.user!.userId, req.body.breakMinutes);
  res.status(200).json({ success: true, message: 'Clocked out. Awaiting admin approval.', data: { session } });
};

export const getActiveSessions = async (_req: AuthRequest, res: Response) => {
  const sessions = await workSessionService.getActiveSessions();
  res.status(200).json({ success: true, message: 'Active sessions', data: { sessions } });
};

export const getMySessions = async (req: AuthRequest, res: Response) => {
  const { page, limit, status } = req.query as any;
  const result = await workSessionService.getUserSessions(req.user!.userId, Number(page) || 1, Number(limit) || 20);
  res.status(200).json({ success: true, message: 'Sessions retrieved', data: result });
};

export const getAllSessions = async (req: AuthRequest, res: Response) => {
  const { page, limit, status } = req.query as any;
  const result = await workSessionService.getAllSessions(Number(page) || 1, Number(limit) || 20, status);
  res.status(200).json({ success: true, message: 'All sessions retrieved', data: result });
};

export const approveSession = async (req: AuthRequest, res: Response) => {
  const session = await workSessionService.approveSession(req.params.id, req.user!.userId, req.body.comment);
  res.status(200).json({ success: true, message: 'Session approved', data: { session } });
};

export const rejectSession = async (req: AuthRequest, res: Response) => {
  const session = await workSessionService.rejectSession(req.params.id, req.user!.userId, req.body.comment);
  res.status(200).json({ success: true, message: 'Session rejected', data: { session } });
};