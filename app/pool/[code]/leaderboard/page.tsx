import { db } from '@/src/lib/db';
import { pools, players, props } from '@/src/lib/schema';
import { eq, desc, asc, and, isNotNull } from 'drizzle-orm';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Trophy } from 'lucide-react';
import { getPoolSecret, safeCompareSecrets } from '@/src/lib/auth';

export default async function Leaderboard({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

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

  // Check if current user is the captain
  const secret = await getPoolSecret(code);
  const isCaptain = secret ? safeCompareSecrets(pool.captainSecret, secret) : false;

  // Fetch participants ordered by points (include secret to determine captain)
  const participantList = await db
    .select({
      id: players.id,
      name: players.name,
      totalPoints: players.totalPoints,
      secret: players.secret,
    })
    .from(players)
    .where(eq(players.poolId, pool.id))
    .orderBy(desc(players.totalPoints), asc(players.name));

  // Check if any props have been resolved
  const resolvedPropsResult = await db
    .select({ id: props.id })
    .from(props)
    .where(and(eq(props.poolId, pool.id), isNotNull(props.correctOptionIndex)))
    .limit(1);

  const hasResolvedProps = resolvedPropsResult.length > 0;

  // Map participants with isCaptain flag (don't expose secret)
  const leaderboard = participantList.map((p) => ({
    id: p.id,
    name: p.name,
    totalPoints: p.totalPoints,
    isCaptain: p.secret === pool.captainSecret,
  }));

  const statusVariant = pool.status === 'open' ? 'success' : pool.status === 'locked' ? 'warning' : 'info';

  return (
    <div className="min-h-screen p-4">
      <main className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl">{pool.name} Leaderboard</CardTitle>
              <Badge variant={statusVariant}>
                {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
              </Badge>
            </div>
            <Link
              href={isCaptain ? `/pool/${code}/captain` : `/pool/${code}/picks`}
              className="text-primary hover:text-primary/80 text-sm font-medium"
            >
              {isCaptain ? '← Back to admin board' : '← Back to my picks'}
            </Link>
          </CardHeader>
        </Card>

        {/* Leaderboard */}
        <Card className="shadow-lg overflow-hidden">
          {leaderboard.length === 0 ? (
            <CardContent className="py-6">
              <p className="text-muted-foreground text-center">
                No participants yet
              </p>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-20">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((participant, index) => {
                  const rank = index + 1;
                  const isWinner = pool.status === 'completed' && rank === 1;
                  const isClickable = pool.status !== 'open';

                  const rowContent = (
                    <>
                      <TableCell>
                        <span
                          className={`text-sm font-medium ${
                            hasResolvedProps && rank === 1
                              ? 'text-amber-500'
                              : hasResolvedProps && rank === 2
                                ? 'text-slate-400'
                                : hasResolvedProps && rank === 3
                                  ? 'text-amber-600'
                                  : 'text-muted-foreground'
                          }`}
                        >
                          {hasResolvedProps && rank === 1 && '🥇 '}
                          {hasResolvedProps && rank === 2 && '🥈 '}
                          {hasResolvedProps && rank === 3 && '🥉 '}
                          {rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {participant.name}
                          </span>
                          {participant.isCaptain && (
                            <Badge variant="secondary" className="text-xs">Captain</Badge>
                          )}
                          {isWinner && (
                            <span className="text-amber-500">
                              Winner!
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-foreground">
                          {hasResolvedProps ? participant.totalPoints : '—'}
                        </span>
                      </TableCell>
                    </>
                  );

                  if (isClickable) {
                    return (
                      <TableRow
                        key={participant.id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${isWinner ? 'bg-amber-50 hover:bg-amber-100' : ''}`}
                      >
                        <TableCell colSpan={3} className="p-0">
                          <Link
                            href={`/pool/${code}/player/${participant.id}`}
                            className="flex w-full items-center"
                          >
                            <span className={`flex-none w-20 px-4 py-4 text-sm font-medium ${
                              hasResolvedProps && rank === 1
                                ? 'text-amber-500'
                                : hasResolvedProps && rank === 2
                                  ? 'text-slate-400'
                                  : hasResolvedProps && rank === 3
                                    ? 'text-amber-600'
                                    : 'text-muted-foreground'
                            }`}>
                              {hasResolvedProps && rank === 1 && '🥇 '}
                              {hasResolvedProps && rank === 2 && '🥈 '}
                              {hasResolvedProps && rank === 3 && '🥉 '}
                              {rank}
                            </span>
                            <span className="flex-1 px-4 py-4 flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {participant.name}
                              </span>
                              {participant.isCaptain && (
                                <Badge variant="secondary" className="text-xs">Captain</Badge>
                              )}
                              {isWinner && (
                                <span className="text-amber-500">
                                  Winner!
                                </span>
                              )}
                            </span>
                            <span className="flex-none px-4 py-4 text-right text-sm font-semibold text-foreground">
                              {hasResolvedProps ? participant.totalPoints : '—'}
                            </span>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow
                      key={participant.id}
                      className={isWinner ? 'bg-amber-50' : ''}
                    >
                      {rowContent}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Helper text for open pools */}
        {pool.status === 'open' && leaderboard.length > 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            View other players&apos; picks after the pool locks
          </p>
        )}

        {/* Helper text for unresolved props */}
        {!hasResolvedProps && leaderboard.length > 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Scores will appear once answers are revealed
          </p>
        )}

        {pool.status === 'completed' && leaderboard.length > 0 && hasResolvedProps && (
          <Alert className="mt-6 border-emerald-200 bg-emerald-50">
            <Trophy className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">
              🎉 Pool completed! Congratulations to{' '}
              <strong>{leaderboard[0].name}</strong> for winning with{' '}
              {leaderboard[0].totalPoints} points!
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}
