'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CircleLifecycle } from '@/types';
import {
  contribute as contributeAction,
  createLifecycle,
  joinCircle as joinAction,
  loadLifecycle,
  releasePayout as payoutAction,
  saveLifecycle,
  type LifecycleSeed,
} from '@/lib/lifecycle';

export function useCircleLifecycle(seed: LifecycleSeed) {
  const [lifecycle, setLifecycle] = useState<CircleLifecycle>(() =>
    createLifecycle(seed),
  );

  useEffect(() => {
    const stored = loadLifecycle(seed.circleId);
    if (stored) {
      setLifecycle(stored);
    } else {
      const fresh = createLifecycle(seed);
      saveLifecycle(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.circleId]);

  const persist = useCallback((next: CircleLifecycle) => {
    setLifecycle(next);
    saveLifecycle(next);
    return next;
  }, []);

  const join = useCallback(() => {
    setLifecycle((current) => {
      const next = joinAction(current);
      saveLifecycle(next);
      return next;
    });
  }, []);

  const contribute = useCallback(() => {
    setLifecycle((current) => {
      const next = contributeAction(current);
      saveLifecycle(next);
      return next;
    });
  }, []);

  const payout = useCallback(
    (self: string) => {
      setLifecycle((current) => {
        const next = payoutAction(current, self);
        saveLifecycle(next);
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    persist(createLifecycle(seed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist, seed.circleId]);

  return { lifecycle, join, contribute, payout, reset };
}
