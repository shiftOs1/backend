import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as string,
  } as jwt.SignOptions);
};

export const signRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
};

export const generateTokenPair = (payload: JwtPayload) => {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

/** Cookie options for the refresh token */
export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.IS_PRODUCTION,
  sameSite: env.IS_PRODUCTION ? ('strict' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',
};
