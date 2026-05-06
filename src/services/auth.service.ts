import crypto from 'crypto';
import { User } from '../models/User';
import { generateTokenPair } from '../utils/jwt';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../utils/email';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  AppError,
} from '../utils/errors';
import { logger } from '../utils/logger';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

export class AuthService {
  /**
   * Register a new user, send verification email.
   */
  async register(input: RegisterInput) {
    const existing = await User.findOne({ email: input.email });
    if (existing) throw new ConflictError('An account with this email already exists');

    const user = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      timezone: input.timezone,
    });

    const rawToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendVerificationEmail(user.email, user.name, rawToken);
    } catch (err) {
      // Don't block registration if email fails — just log
      logger.error('Verification email failed:', err);
    }

    return user.toSafeObject();
  }

  /**
   * Login — validate credentials, issue token pair.
   */
  async login(input: LoginInput) {
    const user = await User.findByEmail(input.email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const passwordMatch = await user.comparePassword(input.password);
    if (!passwordMatch) throw new UnauthorizedError('Invalid email or password');

    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email before logging in', 403);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Contact support.', 403);
    }

    const payload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const { accessToken, refreshToken } = generateTokenPair(payload);

    // Persist hashed refresh token in DB
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    };
  }

  /**
   * Logout — clear refresh token from DB.
   */
  async logout(userId: string) {
    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: '' } });
  }

  /**
   * Refresh token rotation — validate incoming refresh token,
   * issue new pair, rotate DB token.
   */
  async refresh(incomingRefreshToken: string) {
    if (!incomingRefreshToken) throw new UnauthorizedError('No refresh token provided');

    const { verifyRefreshToken, generateTokenPair } = await import('../utils/jwt');

    let payload;
    try {
      payload = verifyRefreshToken(incomingRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Verify it matches what's stored (token rotation check)
    const user = await User.findById(payload.userId).select('+refreshToken');
    if (!user || user.refreshToken !== incomingRefreshToken) {
      // Possible token reuse attack — clear stored token
      if (user) {
        user.refreshToken = undefined;
        await user.save({ validateBeforeSave: false });
      }
      throw new UnauthorizedError('Refresh token reuse detected');
    }

    const newPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(newPayload);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Verify email using the raw token from the email link.
   */
  async verifyEmail(rawToken: string) {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) throw new AppError('Verification link is invalid or has expired', 400);

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return user.toSafeObject();
  }

  /**
   * Send password reset email.
   */
  async forgotPassword(input: ForgotPasswordInput) {
    const user = await User.findOne({ email: input.email });

    // Always respond generically to prevent email enumeration
    if (!user) return;

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user.email, user.name, rawToken);
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      throw new AppError('Failed to send reset email. Try again later.', 500);
    }
  }

  /**
   * Apply new password using the reset token.
   */
  async resetPassword(input: ResetPasswordInput) {
    const hashedToken = crypto.createHash('sha256').update(input.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) throw new AppError('Reset link is invalid or has expired', 400);

    user.password = input.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined; // invalidate all sessions
    await user.save();

    return user.toSafeObject();
  }

  /**
   * Get the currently authenticated user's profile.
   */
  async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return user.toSafeObject();
  }
}

export const authService = new AuthService();
