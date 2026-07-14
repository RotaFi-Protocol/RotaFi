import { Router, Request, Response } from 'express';
import { getCircleCount, getCircle, buildCreateCircleTx, buildJoinVaultTx } from '../services/soroban';
import { createCircleSchema, joinCircleSchema } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

interface CircleSummary {
  id: number;
  member_cap: number;
  payout_method: number;
  contribution_amount: string;
  active: boolean;
}

const circleCache = new Map<number, CircleSummary>();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const count = await getCircleCount();
    const circles: CircleSummary[] = Array.from(circleCache.values());

    res.json({
      total: Math.max(count, circles.length),
      circles,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list circles', message: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid circle ID' });
    }

    const circle = (await getCircle(id)) || circleCache.get(id);
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    res.json(circle);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get circle', message: error.message });
  }
});

router.post('/', strictLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = createCircleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const params = parsed.data;
    const circleId = circleCache.size + 1;

    const summary: CircleSummary = {
      id: circleId,
      member_cap: params.member_cap,
      payout_method: params.payout_method,
      contribution_amount: params.contribution_amount,
      active: false,
    };
    circleCache.set(circleId, summary);

    const tx = buildCreateCircleTx(params);

    res.status(201).json({
      id: circleId,
      message: 'Circle creation transaction prepared. Submit signed transaction to deploy.',
      circle: summary,
      transaction: tx,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create circle', message: error.message });
  }
});

router.post('/:id/join', strictLimiter, async (req: Request, res: Response) => {
  try {
    const circleId = parseInt(req.params.id as string, 10);
    if (isNaN(circleId) || circleId < 1) {
      return res.status(400).json({ error: 'Invalid circle ID' });
    }

    const parsed = joinCircleSchema.safeParse({ ...req.body, circle_id: circleId });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { member_address, token_address } = parsed.data;
    const tx = buildJoinVaultTx(member_address, token_address);

    res.json({
      message: 'Join circle transaction prepared. Client must sign and submit.',
      transaction: tx,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to join circle', message: error.message });
  }
});

export default router;
