import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2025') {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }
    if (prismaErr.code === 'P2002') {
      res.status(409).json({ error: 'Duplicate entry. A record with this value already exists.' });
      return;
    }
  }

  res.status(500).json({ error: 'Internal server error.' });
}
