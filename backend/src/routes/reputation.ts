import { Router, Request, Response } from 'express';
import { getReputationScore, getReputationRating } from '../services/soroban';
import { reputationQuerySchema } from '../middleware/validation';

const router = Router();

router.get('/score/:address', async (req: Request, res: Response) => {
  try {
    const parsed = reputationQuerySchema.safeParse({ member_address: req.params.address as string });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const score = await getReputationScore(req.params.address as string);
    if (!score) {
      return res.status(404).json({ error: 'No reputation record found' });
    }

    res.json(score);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get reputation score', message: error.message });
  }
});

router.get('/rating/:address', async (req: Request, res: Response) => {
  try {
    const parsed = reputationQuerySchema.safeParse({ member_address: req.params.address as string });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const rating = await getReputationRating(req.params.address as string);
    res.json({ address: req.params.address as string, rating });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get reputation rating', message: error.message });
  }
});

export default router;
