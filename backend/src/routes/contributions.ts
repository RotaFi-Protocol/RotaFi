import { Router, Request, Response } from 'express';
import { getMemberInfo, hasPaid, allPaid, getVaultState, buildContributeTx, buildReleasePayoutTx } from '../services/soroban';
import { contributeSchema, releasePayoutSchema } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/vault', async (_req: Request, res: Response) => {
  try {
    const vault = await getVaultState();
    res.json(vault);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get vault state', message: error.message });
  }
});

router.get('/vault/member/:address', async (req: Request, res: Response) => {
  try {
    const info = await getMemberInfo(req.params.address as string);
    if (!info) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get member info', message: error.message });
  }
});

router.get('/vault/has-paid/:round/:address', async (req: Request, res: Response) => {
  try {
    const round = parseInt(req.params.round as string, 10);
    if (isNaN(round)) {
      return res.status(400).json({ error: 'Invalid round number' });
    }
    const paid = await hasPaid(round, req.params.address as string);
    res.json({ round, member: req.params.address, has_paid: paid });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to check payment', message: error.message });
  }
});

router.get('/vault/all-paid', async (_req: Request, res: Response) => {
  try {
    const paid = await allPaid();
    res.json({ all_paid: paid });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to check payment status', message: error.message });
  }
});

router.post('/contribute', strictLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = contributeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { member_address, token_address } = parsed.data;
    const tx = buildContributeTx(member_address, token_address);

    res.json({
      message: 'Contribution transaction prepared. Client must sign and submit.',
      transaction: tx,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to submit contribution', message: error.message });
  }
});

router.post('/payout', strictLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = releasePayoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { winner_address, token_address } = parsed.data;
    const tx = buildReleasePayoutTx(winner_address, token_address);

    res.json({
      message: 'Payout transaction prepared. Client must sign and submit.',
      transaction: tx,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to release payout', message: error.message });
  }
});

export default router;
