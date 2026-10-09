import { Router, Request, Response } from 'express';
import { getSupportedTokens } from '../services/tokens';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const tokens = getSupportedTokens();
    res.json({
      total: tokens.length,
      tokens,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list tokens', message: error.message });
  }
});

export default router;