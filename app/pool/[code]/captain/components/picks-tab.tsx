'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/app/hooks/use-toast';
import { PicksView } from '@/app/components/picks-view';
import { Button } from '@/app/components/ui/button';
import type { Prop, SubmittingState } from '../types';

interface PicksReturn {
  myPicks: Map<string, number>;
  submitting: SubmittingState | null;
  pickError: { propId: string; message: string } | null;
  pickedCount: number;
  allPicked: boolean;
  progressPercent: number;
  handlePick: (propId: string, optionIndex: number) => void;
}

interface PicksTabProps {
  code: string;
  poolStatus: string;
  propsList: Prop[];
  picks: PicksReturn;
}

export function PicksTab({ code, poolStatus, propsList, picks }: PicksTabProps) {
  const router = useRouter();
  const { showToast } = useToast();

  function handleSubmit() {
    showToast('All picks submitted!', 'success');
    router.push(`/pool/${code}/leaderboard`);
  }

  return (
    <PicksView
      poolStatus={poolStatus}
      propsList={propsList}
      myPicks={picks.myPicks}
      submitting={picks.submitting}
      pickError={picks.pickError}
      pickedCount={picks.pickedCount}
      allPicked={picks.allPicked}
      progressPercent={picks.progressPercent}
      handlePick={picks.handlePick}
    >
      {poolStatus === 'open' && picks.allPicked && (
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
          >
            Submit Picks
          </Button>
        </div>
      )}
    </PicksView>
  );
}
