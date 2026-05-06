import { Router } from 'express';
import { verifyToken, adminOnly, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createShiftSchema, updateShiftSchema,
  assignUserSchema, createRecurringShiftSchema,
} from '../validators/shift.validator';

// Shift controller
import {
  createShift, createRecurringShifts, getAllShifts, getMyShifts,
  getShiftById, updateShift, deleteShift, assignUser, unassignUser,
} from '../controllers/shift.controller';

// WorkSession controller
import {
  clockIn, clockOut, getActiveSessions, getMySessions,
  getAllSessions, approveSession, rejectSession,
} from '../controllers/workSession.controller';

// Resources controller
import {
  addAvailability, getMyAvailability, getAllAvailability,
  updateAvailability, deleteAvailability, respondToAvailability,
  requestExchange, getMyExchanges, respondToExchange, adminApproveExchange,
  requestLeave, getMyLeaves, getAllLeaves, respondToLeave,
  getMyNotifications, markAllNotificationsRead, markNotificationRead,
} from '../controllers/resources.controller';

const router = Router();

// All routes below require authentication
router.use(verifyToken);

// ── SHIFTS ────────────────────────────────────────────────────────────────────
router.get('/shifts', getAllShifts);
router.get('/shifts/my', getMyShifts);
router.get('/shifts/:id', getShiftById);
router.post('/shifts', adminOnly, validate(createShiftSchema), createShift);
router.post('/shifts/recurring', adminOnly, validate(createRecurringShiftSchema), createRecurringShifts);
router.patch('/shifts/:id', adminOnly, validate(updateShiftSchema), updateShift);
router.delete('/shifts/:id', adminOnly, deleteShift);
router.post('/shifts/:id/assign', adminOnly, validate(assignUserSchema), assignUser);
router.post('/shifts/:id/unassign', adminOnly, unassignUser);

// ── AVAILABILITY ──────────────────────────────────────────────────────────────
router.get('/availability/all', adminOnly, getAllAvailability);
router.get('/availability', getMyAvailability);
router.post('/availability', addAvailability);
router.patch('/availability/:id', updateAvailability);
router.delete('/availability/:id', deleteAvailability);
router.patch('/availability/:id/respond', adminOnly, respondToAvailability);

// ── WORK SESSIONS ─────────────────────────────────────────────────────────────
router.get('/sessions', adminOnly, getAllSessions);
router.get('/sessions/active', adminOnly, getActiveSessions);
router.get('/sessions/my', getMySessions);
router.post('/sessions/clock-in', clockIn);
router.post('/sessions/clock-out', clockOut);
router.patch('/sessions/:id/approve', adminOnly, approveSession);
router.patch('/sessions/:id/reject', adminOnly, rejectSession);

// ── EXCHANGE REQUESTS ─────────────────────────────────────────────────────────
router.get('/exchanges', getMyExchanges);
router.post('/exchanges', requestExchange);
router.patch('/exchanges/:id/respond', respondToExchange);
router.patch('/exchanges/:id/approve', adminOnly, adminApproveExchange);

// ── LEAVE REQUESTS ────────────────────────────────────────────────────────────
router.get('/leaves', getMyLeaves);
router.get('/leaves/all', adminOnly, getAllLeaves);
router.post('/leaves', requestLeave);
router.patch('/leaves/:id/respond', adminOnly, respondToLeave);

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
router.get('/notifications', getMyNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;