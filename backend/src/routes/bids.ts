import { Router, Request, Response } from 'express';
import { config } from '../config';
import { getBidState, getBid, getAllBids, buildSubmitBidTx } from '../services/soroban';
import { submitBidSchema } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/state', async (_req: Request, res: Response) => {
  try {
    const state = await getBidState();
    res.json({ state });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get bid state', message: error.message });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const bids = await getAllBids();
    res.json({ bids: Array.isArray(bids) ? bids : [] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get bids', message: error.message });
  }
});

router.get('/:address', async (req: Request, res: Response) => {
  try {
    const bid = await getBid(req.params.address as string);
    if (!bid) {
      return res.status(404).json({ error: 'No bid found for this member' });
    }
    res.json(bid);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get bid', message: error.message });
  }
});

router.post('/submit', strictLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = submitBidSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { member_address, discount_bps, round } = parsed.data;
    const tx = buildSubmitBidTx(member_address, discount_bps, round);

    res.json({
      message: 'Bid submission transaction prepared. Client must sign and submit.',
      transaction: tx,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to submit bid', message: error.message });
  }
});

export default router;
