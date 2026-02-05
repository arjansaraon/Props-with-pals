'use client';

import { useState } from 'react';
import { useToast } from '@/app/hooks/use-toast';

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
  secret: string;
  initialPicks: InitialPick[];
  poolStatus: string;
  totalProps: number;
}

interface UsePicksReturn {
  myPicks: Map<string, number>;
  submitting: SubmittingState | null;
  pickErrorPropId: string | null;
  pickedCount: number;
  allPicked: boolean;
  progressPercent: number;
  handlePick: (propId: string, selectedOptionIndex: number) => Promise<void>;
  clearPickError: () => void;
}

export function usePicks({
  code,
  secret,
  initialPicks,
  poolStatus,
  totalProps,
}: UsePicksProps): UsePicksReturn {
  const { showToast } = useToast();
  const [myPicks, setMyPicks] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    initialPicks.forEach((p) => map.set(p.propId, p.selectedOptionIndex));
    return map;
  });
  const [submitting, setSubmitting] = useState<SubmittingState | null>(null);
  const [pickErrorPropId, setPickErrorPropId] = useState<string | null>(null);

  // Derived state
  const pickedCount = myPicks.size;
  const allPicked = totalProps > 0 && pickedCount === totalProps;
  const progressPercent = totalProps > 0 ? (pickedCount / totalProps) * 100 : 0;

  async function handlePick(propId: string, selectedOptionIndex: number) {
    if (poolStatus !== 'open') return;

    const previousPick = myPicks.get(propId);
    setMyPicks((prev) => new Map(prev).set(propId, selectedOptionIndex));
    setSubmitting({ propId, index: selectedOptionIndex });
    setPickErrorPropId(null);

    try {
      // Auth is handled by httpOnly cookie, no need to pass secret in URL
      const response = await fetch(`/api/pools/${code}/picks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propId, selectedOptionIndex }),
      });

      if (!response.ok) {
        setMyPicks((prev) => {
          const newMap = new Map(prev);
          if (previousPick !== undefined) {
            newMap.set(propId, previousPick);
          } else {
            newMap.delete(propId);
          }
          return newMap;
        });
        setPickErrorPropId(propId);
        return;
      }

      showToast('Pick saved!', 'success');
    } catch {
      setMyPicks((prev) => {
        const newMap = new Map(prev);
        if (previousPick !== undefined) {
          newMap.set(propId, previousPick);
        } else {
          newMap.delete(propId);
        }
        return newMap;
      });
      setPickErrorPropId(propId);
    } finally {
      setSubmitting(null);
    }
  }

  function clearPickError() {
    setPickErrorPropId(null);
  }

  return {
    myPicks,
    submitting,
    pickErrorPropId,
    pickedCount,
    allPicked,
    progressPercent,
    handlePick,
    clearPickError,
  };
}
