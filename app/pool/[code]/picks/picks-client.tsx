'use client';

import { useRouter } from 'next/navigation';
import { usePicks } from '@/app/hooks/use-picks';
import { useToast } from '@/app/hooks/use-toast';
import { PicksView } from '@/app/components/picks-view';
import { Button } from '@/app/components/ui/button';
import type { Prop } from '@/app/types/domain';

interface PicksClientProps {
  code: string;
  propsList: Prop[];
  initialPicks: { propId: string; selectedOptionIndex: number }[];
  poolStatus: string;
}

export function PicksClient({
  code,
  propsList,
  initialPicks,
  poolStatus,
}: PicksClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // Use the shared picks hook for all state management
  const picks = usePicks({
    code,
    initialPicks,
    poolStatus,
    totalProps: propsList.length,
  });

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
      pickErrorPropId={picks.pickErrorPropId}
      pickedCount={picks.pickedCount}
      allPicked={picks.allPicked}
      progressPercent={picks.progressPercent}
      handlePick={picks.handlePick}
    >
      {/* Submit CTA - only shows when all picks are completed */}
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
