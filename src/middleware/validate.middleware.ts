import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validates req[target] against a Zod schema.
 * Throws a ZodError on failure (caught by errorHandler).
 * On success, replaces req[target] with the parsed (coerced) value.
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req[target]);
    (req as any)[target] = parsed;
    next();
  };
};
