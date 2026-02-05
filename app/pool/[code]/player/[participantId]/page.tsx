import { db } from '@/src/lib/db';
import { pools, props, picks, players } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getPoolSecret } from '@/src/lib/auth';
import { PlayerPicksView } from './player-picks-view';

export default async function PlayerPicksPage({
  params,
}: {
  params: Promise<{ code: string; playerId: string }>;
}) {
  const { code, playerId } = await params;

  // Fetch pool
  const poolResult = await db
    .select()
    .from(pools)
    .where(eq(pools.inviteCode, code))
    .limit(1);

  if (poolResult.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Pool not found</p>
      </div>
    );
  }

  const pool = poolResult[0];

  // Only allow viewing picks when pool is locked or completed
  if (pool.status === 'open') {
    redirect(`/pool/${code}/leaderboard`);
  }

  // Fetch the participant being viewed
  const participantResult = await db
    .select()
    .from(players)
    .where(
      and(
        eq(players.id, playerId),
        eq(players.poolId, pool.id)
      )
    )
    .limit(1);

  if (participantResult.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Player not found</p>
      </div>
    );
  }

  const participant = participantResult[0];

  // Check if viewing yourself - redirect to editable picks page
  const mySecret = await getPoolSecret(code);
  if (mySecret && mySecret === participant.secret) {
    redirect(`/pool/${code}/picks`);
  }

  // Fetch all props for this pool
  const propsList = await db
    .select()
    .from(props)
    .where(eq(props.poolId, pool.id))
    .orderBy(props.order);

  // Fetch this participant's picks
  const picksResult = await db
    .select()
    .from(picks)
    .where(eq(picks.playerId, participant.id));

  // Create a map of propId -> pick
  const picksMap = new Map(picksResult.map(p => [p.propId, p]));

  // Build props with picks data
  const propsWithPicks = propsList.map(prop => {
    const pick = picksMap.get(prop.id);
    return {
      id: prop.id,
      questionText: prop.questionText,
      options: prop.options as string[],
      pointValue: prop.pointValue,
      correctOptionIndex: prop.correctOptionIndex,
      selectedOptionIndex: pick?.selectedOptionIndex ?? null,
    };
  });

  // Calculate stats
  const stats = propsWithPicks.reduce(
    (acc, prop) => {
      if (prop.selectedOptionIndex === null) {
        acc.unanswered++;
      } else if (prop.correctOptionIndex === null) {
        acc.pending++;
      } else if (prop.selectedOptionIndex === prop.correctOptionIndex) {
        acc.correct++;
      } else {
        acc.wrong++;
      }
      return acc;
    },
    { correct: 0, wrong: 0, pending: 0, unanswered: 0 }
  );

  return (
    <div className="min-h-screen p-4">
      <main className="max-w-2xl mx-auto">
        <PlayerPicksView
          code={code}
          playerName={participant.name}
          totalPoints={participant.totalPoints}
          props={propsWithPicks}
          stats={stats}
        />
      </main>
    </div>
  );
}
