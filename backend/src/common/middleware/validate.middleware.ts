import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../errors.js';

interface RequestValidationSchema {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

export function validate(schema: RequestValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        const validatedQuery = await schema.query.parseAsync(req.query);
        Object.assign(req.query, validatedQuery);
      }
      if (schema.params) {
        const validatedParams = await schema.params.parseAsync(req.params);
        Object.assign(req.params, validatedParams);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        next(new ValidationError('Erreur de validation des données transmises', formatted));
        return;
      }
      next(error);
    }
  };
}
