import { Router } from 'express';
import {
  register,
  login,
  logout,
  refresh,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { verifyToken } from '../middleware/auth.middleware';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Protected routes
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getMe);

export default router;
