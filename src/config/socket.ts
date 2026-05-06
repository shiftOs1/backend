import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { env } from './env';

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  // ── Auth middleware for socket connections ──────────────────────────────────
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ──────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.debug(`Socket connected: ${user.email} [${socket.id}]`);

    // Join personal room — for targeted notifications
    socket.join(`user:${user.userId}`);

    // Admins also join the admin broadcast room
    if (user.role === 'admin') {
      socket.join('role:admin');
    }

    // ── Client events ─────────────────────────────────────────────────────────

    // User starts watching a specific page/resource
    socket.on('join:room', (room: string) => {
      socket.join(room);
      logger.debug(`${user.email} joined room: ${room}`);
    });

    socket.on('leave:room', (room: string) => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${user.email} [${socket.id}]`);
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// ── Emit helpers — call these from services ────────────────────────────────────

/**
 * Send a notification event to a specific user
 */
export const emitToUser = (userId: string, event: string, data: unknown) => {
  try {
    getIO().to(`user:${userId}`).emit(event, data);
  } catch {
    // Socket not initialized yet — skip silently
  }
};

/**
 * Broadcast an event to all admins
 */
export const emitToAdmins = (event: string, data: unknown) => {
  try {
    getIO().to('role:admin').emit(event, data);
  } catch {}
};

/**
 * Broadcast to everyone connected
 */
export const emitToAll = (event: string, data: unknown) => {
  try {
    getIO().emit(event, data);
  } catch {}
};

// ── Typed socket events ────────────────────────────────────────────────────────
export const SocketEvents = {
  // Notifications
  NOTIFICATION_NEW: 'notification:new',

  // Shifts
  SHIFT_CREATED: 'shift:created',
  SHIFT_UPDATED: 'shift:updated',
  SHIFT_DELETED: 'shift:deleted',
  SHIFT_ASSIGNED: 'shift:assigned',

  // Sessions
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',
  SESSION_APPROVED: 'session:approved',
  SESSION_REJECTED: 'session:rejected',

  // Exchanges
  EXCHANGE_REQUESTED: 'exchange:requested',
  EXCHANGE_RESPONDED: 'exchange:responded',
  EXCHANGE_APPROVED: 'exchange:approved',

  // Leave
  LEAVE_RESPONDED: 'leave:responded',

  // Availability
  AVAILABILITY_RESPONDED: 'availability:responded',

  // Dashboard refresh
  DASHBOARD_REFRESH: 'dashboard:refresh',
} as const;