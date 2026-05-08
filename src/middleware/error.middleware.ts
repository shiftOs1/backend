import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Validation failed';
    errors = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if ((err as any).name === 'MongoServerError' && (err as any).code === 11000) {
    statusCode = 409;
    const field = Object.keys((err as any).keyValue || {})[0] || 'field';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (statusCode === 500) {
    logger.error(`[${req.method}] ${req.path} — ${err.message}`, { stack: err.stack });
  }

  const response: ApiResponse = {
    success: false,
    message,
    ...(errors ? { errors } : {}),
  };

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};
