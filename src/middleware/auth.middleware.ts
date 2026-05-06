import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { AuthRequest, UserRole } from '../types';

/**
 * Verifies the JWT access token from the Authorization header.
 * Attaches the decoded payload to req.user.
 */
export const verifyToken = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('admin') or requireRole('admin', 'user')
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${roles.join(' or ')}`
      );
    }

    next();
  };
};

/** Shorthand: admin only */
export const adminOnly = requireRole('admin');
