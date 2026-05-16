import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { User } from '../models/User';
import { UnauthorizedError } from '../utils/errors';
import { refreshCookieOptions } from '../utils/jwt';
import { AuthRequest } from '../types';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

export const register = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.register(req.body as RegisterInput);

  res.status(201).json({
    success: true,
    message: 'Account created. Please check your email to verify your account.',
    data: { user },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { accessToken, refreshToken, user } = await authService.login(
    req.body as LoginInput
  );

  // Refresh token → httpOnly cookie
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { accessToken, user },
  });
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.userId) {
    await authService.logout(req.user.userId);
  }

  res.clearCookie('refreshToken', { path: '/api/auth' });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const incomingToken = req.cookies?.refreshToken as string;
  const { accessToken, refreshToken } = await authService.refresh(incomingToken);

  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: { accessToken },
  });
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.verifyEmail(req.body.token as string);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
    data: { user },
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  await authService.forgotPassword(req.body as ForgotPasswordInput);

  // Generic response to prevent email enumeration
  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  await authService.resetPassword(req.body as ResetPasswordInput);

  res.status(200).json({
    success: true,
    message: 'Password reset successfully. You can now log in with your new password.',
  });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await authService.getMe(req.user!.userId);

  res.status(200).json({
    success: true,
    message: 'User profile retrieved',
    data: { user },
  });
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user!.userId).select('+password');
  if (!user) throw new UnauthorizedError('User not found');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new UnauthorizedError('Current password is incorrect');

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
};
