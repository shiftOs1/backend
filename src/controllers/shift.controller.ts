import { Response } from 'express';
import { shiftService } from '../services/shift.service';
import { AuthRequest } from '../types';
import { param } from '../utils/helpers';

export const createShift = async (req: AuthRequest, res: Response) => {
  const shift = await shiftService.create(req.body, req.user!.userId);
  res.status(201).json({ success: true, message: 'Shift created', data: { shift } });
};

export const createRecurringShifts = async (req: AuthRequest, res: Response) => {
  const { dates, ...shiftData } = req.body;
  const shifts = await shiftService.createRecurring(shiftData, req.user!.userId, dates);
  res.status(201).json({ success: true, message: `${shifts.length} recurring shifts created`, data: { shifts } });
};

export const getAllShifts = async (req: AuthRequest, res: Response) => {
  const result = await shiftService.getAll(req.query as any);
  res.status(200).json({ success: true, message: 'Shifts retrieved', data: result });
};

export const getMyShifts = async (req: AuthRequest, res: Response) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const shifts = await shiftService.getMyShifts(req.user!.userId, startDate, endDate);
  res.status(200).json({ success: true, message: 'My shifts retrieved', data: { shifts } });
};

export const getShiftById = async (req: AuthRequest, res: Response) => {
  const shift = await shiftService.getById(param(req.params.id));
  res.status(200).json({ success: true, message: 'Shift retrieved', data: { shift } });
};

export const updateShift = async (req: AuthRequest, res: Response) => {
  const shift = await shiftService.update(param(req.params.id), req.body, req.user!.userId);
  res.status(200).json({ success: true, message: 'Shift updated', data: { shift } });
};

export const deleteShift = async (req: AuthRequest, res: Response) => {
  await shiftService.delete(param(req.params.id));
  res.status(200).json({ success: true, message: 'Shift deleted' });
};

export const assignUser = async (req: AuthRequest, res: Response) => {
  const shift = await shiftService.assignUser(param(req.params.id), req.body.userId as string);
  res.status(200).json({ success: true, message: 'User assigned to shift', data: { shift } });
};

export const unassignUser = async (req: AuthRequest, res: Response) => {
  const shift = await shiftService.unassignUser(param(req.params.id));
  res.status(200).json({ success: true, message: 'User unassigned from shift', data: { shift } });
};
