export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="state-spinner" />
      <p className="state-text">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <div className="state-icon state-icon-error">!</div>
      <h3 className="state-title">Something went wrong</h3>
      <p className="state-text">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary">
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="state">
      <div className="state-icon state-icon-empty" aria-hidden="true">O</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-text">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}
