import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createShiftSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  startTime: z.string().regex(timeRegex, 'Use HH:MM format'),
  endTime: z.string().regex(timeRegex, 'Use HH:MM format'),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  assignedUser: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceRule: z.string().optional(),
});

export const createRecurringShiftSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  startTime: z.string().regex(timeRegex, 'Use HH:MM format'),
  endTime: z.string().regex(timeRegex, 'Use HH:MM format'),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  assignedUser: z.string().optional(),
  dates: z.array(z.string()).min(1, 'At least one date is required'),
});

export const updateShiftSchema = z.object({
  title: z.string().min(1).max(100).trim().optional(),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date').optional(),
  startTime: z.string().regex(timeRegex, 'Use HH:MM format').optional(),
  endTime: z.string().regex(timeRegex, 'Use HH:MM format').optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['open', 'assigned', 'completed', 'cancelled']).optional(),
});

export const assignUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const shiftQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
  status: z.string().optional(),
  page: z.string().optional().transform(Number),
  limit: z.string().optional().transform(Number),
});