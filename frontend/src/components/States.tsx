import type { ReactNode } from 'react';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={styles.container}>
      <div style={styles.spinner} />
      <p style={styles.text}>{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>!</div>
      <h3 style={styles.title}>Something went wrong</h3>
      <p style={styles.text}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={styles.button}>
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
    <div style={styles.container}>
      <div style={styles.emptyIcon}>O</div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.text}>{description}</p>
      {action && (
        <button onClick={action.onClick} style={styles.button}>
          {action.label}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1rem',
    textAlign: 'center',
    minHeight: '200px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#7C3AED',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#111827',
  },
  text: {
    margin: 0,
    color: '#6B7280',
    fontSize: '0.875rem',
  },
  button: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#7C3AED',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
};
