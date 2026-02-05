'use client';

import { PicksView } from '@/app/components/picks-view';
import type { Prop, SubmittingState } from '../types';

interface PicksReturn {
  myPicks: Map<string, number>;
  submitting: SubmittingState | null;
  pickErrorPropId: string | null;
  pickedCount: number;
  allPicked: boolean;
  progressPercent: number;
  handlePick: (propId: string, optionIndex: number) => void;
}

interface PicksTabProps {
  poolStatus: string;
  propsList: Prop[];
  picks: PicksReturn;
}

export function PicksTab({ poolStatus, propsList, picks }: PicksTabProps) {
  return (
    <PicksView
      poolStatus={poolStatus}
      propsList={propsList}
      myPicks={picks.myPicks}
      submitting={picks.submitting}
      pickErrorPropId={picks.pickErrorPropId}
      pickedCount={picks.pickedCount}
      allPicked={picks.allPicked}
      progressPercent={picks.progressPercent}
      handlePick={picks.handlePick}
    />
  );
}
