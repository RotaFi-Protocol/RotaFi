import type { AnchorTransferRecord } from '@/types';

const STORAGE_KEY = 'rotafi_anchor_transfers';
const MAX_RECORDS = 25;

function isRecord(value: unknown): value is AnchorTransferRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AnchorTransferRecord).id === 'string' &&
    typeof (value as AnchorTransferRecord).direction === 'string'
  );
}

/** Loads persisted SEP-24 transfer records, newest first. */
export function loadAnchorHistory(): AnchorTransferRecord[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function persist(records: AnchorTransferRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}

/** Inserts or updates a transfer record and returns the full history. */
export function upsertAnchorRecord(record: AnchorTransferRecord): AnchorTransferRecord[] {
  const existing = loadAnchorHistory();
  const index = existing.findIndex((r) => r.id === record.id);
  let next: AnchorTransferRecord[];
  if (index === -1) {
    next = [record, ...existing];
  } else {
    next = [...existing];
    next[index] = { ...next[index], ...record };
  }
  persist(next);
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

export function clearAnchorHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}