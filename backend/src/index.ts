import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import circlesRouter from './routes/circles';
import contributionsRouter from './routes/contributions';
import reputationRouter from './routes/reputation';
import bidsRouter from './routes/bids';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(apiLimiter);

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    contracts: config.contracts,
  });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'RotaFi API',
    version: '0.1.0',
    docs: '/api/v1',
    health: '/healthz',
  });
});

app.use('/api/v1/circles', circlesRouter);
app.use('/api/v1/contributions', contributionsRouter);
app.use('/api/v1/reputation', reputationRouter);
app.use('/api/v1/bids', bidsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`RotaFi API running on port ${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/healthz`);
  });
}

export default app;
