import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'test' ? 'error' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        }),
      ),
    }),
  ],
});

export function createCorrelationId(circleId: number, round: number): string {
  return `circle-${circleId}-round-${round}`;
}

export function withCorrelation(
  correlationId: string,
  fn: (log: winston.Logger) => void,
): void {
  const child = logger.child({ correlationId });
  fn(child);
}

export default logger;
