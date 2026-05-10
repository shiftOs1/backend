import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { verifyToken, adminOnly } from './middleware/auth.middleware';

import authRoutes from './routes/auth.routes';
import apiRoutes from './routes/api.routes';
import userRoutes from './routes/user.routes';

import {
  getSummary, getHoursOverTime, getUserHours,
  getAttendanceRate, getShiftStats, getMyStats,
} from './controllers/analytics.controller';

const app = express();

app.use(helmet());

// Allow multiple origins
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:3000',
  'https://frontend-eta-eosin-raimyo6ozp.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));
app.use(mongoSanitize());

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/users', userRoutes);

app.get('/api/analytics/summary',    verifyToken, adminOnly, getSummary);
app.get('/api/analytics/hours',      verifyToken, adminOnly, getHoursOverTime);
app.get('/api/analytics/users',      verifyToken, adminOnly, getUserHours);
app.get('/api/analytics/attendance', verifyToken, adminOnly, getAttendanceRate);
app.get('/api/analytics/shifts',     verifyToken, adminOnly, getShiftStats);
app.get('/api/analytics/me',         verifyToken, getMyStats);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
