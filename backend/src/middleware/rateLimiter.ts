import rateLimit from 'express-rate-limit';
import { config } from '../config';

const skipInTest = config.nodeEnv === 'test';

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipInTest,
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
  },
});

export const strictLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipInTest,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded for sensitive operations',
  },
});
