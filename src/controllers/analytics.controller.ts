import { Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { AuthRequest } from '../types';

const parseDateRange = (req: AuthRequest) => {
  const now = new Date();
  const startDate = req.query.startDate
    ? new Date(req.query.startDate as string)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = req.query.endDate
    ? new Date(req.query.endDate as string)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { startDate, endDate };
};

export const getSummary = async (_req: AuthRequest, res: Response) => {
  const data = await analyticsService.getSummary();
  res.status(200).json({ success: true, message: 'Summary retrieved', data });
};

export const getHoursOverTime = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = parseDateRange(req);
  const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
  const data = await analyticsService.getHoursOverTime(period, startDate, endDate);
  res.status(200).json({ success: true, message: 'Hours over time retrieved', data });
};

export const getUserHours = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = parseDateRange(req);
  const data = await analyticsService.getUserHours(startDate, endDate);
  res.status(200).json({ success: true, message: 'User hours retrieved', data });
};

export const getAttendanceRate = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = parseDateRange(req);
  const data = await analyticsService.getAttendanceRate(startDate, endDate);
  res.status(200).json({ success: true, message: 'Attendance rate retrieved', data });
};

export const getShiftStats = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = parseDateRange(req);
  const data = await analyticsService.getShiftStats(startDate, endDate);
  res.status(200).json({ success: true, message: 'Shift stats retrieved', data });
};

export const getMyStats = async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getMyStats(req.user!.userId);
  res.status(200).json({ success: true, message: 'My stats retrieved', data });
};