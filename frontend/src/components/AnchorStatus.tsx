import type { AnchorTransferState } from '@/types';

const STATUS_LABELS: Record<AnchorTransferState, string> = {
  idle: 'Ready',
  authenticating: 'Signing in with the anchor (SEP-10)…',
  starting: 'Contacting the anchor…',
  awaiting_user: 'Awaiting your action in the anchor window',
  pending: 'Processing your transfer…',
  completed: 'Transfer completed',
  failed: 'Transfer failed',
};

export default function AnchorStatus({ state }: { state: AnchorTransferState }) {
  const busy =
    state === 'authenticating' ||
    state === 'starting' ||
    state === 'awaiting_user' ||
    state === 'pending';

  const tone =
    state === 'completed' ? 'is-success' : state === 'failed' ? 'is-danger' : busy ? 'is-pending' : 'is-idle';

  return (
    <p className={`anchor-status ${tone}`} role="status" aria-live="polite" data-testid="anchor-status">
      {busy && <span className="anchor-pulse" aria-hidden="true" />}
      {STATUS_LABELS[state]}
    </p>
  );
}