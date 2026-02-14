'use client';

import { useState } from 'react';

interface InitialPick {
  propId: string;
  selectedOptionIndex: number;
}

interface SubmittingState {
  propId: string;
  index: number;
}

interface UsePicksProps {
  code: string;
  initialPicks: InitialPick[];
  poolStatus: string;
  totalProps: number;
}

interface PickError {
  propId: string;
  message: string;
}

interface UsePicksReturn {
  myPicks: Map<string, number>;
  submitting: SubmittingState | null;
  pickError: PickError | null;
  pickedCount: number;
  allPicked: boolean;
  progressPercent: number;
  handlePick: (propId: string, selectedOptionIndex: number) => Promise<void>;
  clearPickError: () => void;
}

export function usePicks({
  code,
  initialPicks,
  poolStatus,
  totalProps,
}: UsePicksProps): UsePicksReturn {
  const [myPicks, setMyPicks] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    initialPicks.forEach((p) => map.set(p.propId, p.selectedOptionIndex));
    return map;
  });
  const [submitting, setSubmitting] = useState<SubmittingState | null>(null);
  const [pickError, setPickError] = useState<PickError | null>(null);

  // Derived state
  const pickedCount = myPicks.size;
  const allPicked = totalProps > 0 && pickedCount === totalProps;
  const progressPercent = totalProps > 0 ? (pickedCount / totalProps) * 100 : 0;

  async function handlePick(propId: string, selectedOptionIndex: number) {
    if (poolStatus === 'completed') return;

    const previousPick = myPicks.get(propId);
    setMyPicks((prev) => new Map(prev).set(propId, selectedOptionIndex));
    setSubmitting({ propId, index: selectedOptionIndex });
    setPickError(null);

    function rollback(message: string) {
      setMyPicks((prev) => {
        const newMap = new Map(prev);
        if (previousPick !== undefined) {
          newMap.set(propId, previousPick);
        } else {
          newMap.delete(propId);
        }
        return newMap;
      });
      setPickError({ propId, message });
    }

    try {
      // Auth is handled by httpOnly cookie, no need to pass secret in URL
      const response = await fetch(`/api/pools/${code}/picks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propId, selectedOptionIndex }),
      });

      if (!response.ok) {
        let message = 'Failed to save pick. Please try again.';
        try {
          const data = await response.json();
          if (data.code === 'UNAUTHORIZED') message = 'Session expired. Please refresh the page.';
          else if (data.code === 'POOL_COMPLETED') message = 'Pool is completed. Picks can no longer be changed.';
          else if (data.message) message = data.message;
        } catch { /* use default message */ }
        rollback(message);
        return;
      }
    } catch {
      rollback('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(null);
    }
  }

  function clearPickError() {
    setPickError(null);
  }

  return {
    myPicks,
    submitting,
    pickError,
    pickedCount,
    allPicked,
    progressPercent,
    handlePick,
    clearPickError,
  };
}
