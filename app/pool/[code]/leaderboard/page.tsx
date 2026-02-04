import { db } from '@/src/lib/db';
import { pools, participants } from '@/src/lib/schema';
import { eq, desc, asc } from 'drizzle-orm';
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

  // Fetch participants ordered by points
  const leaderboard = await db
    .select({
      id: participants.id,
      name: participants.name,
      totalPoints: participants.totalPoints,
    })
    .from(participants)
    .where(eq(participants.poolId, pool.id))
    .orderBy(desc(participants.totalPoints), asc(participants.name));

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
              href={`/pool/${code}/picks`}
              className="text-primary hover:text-primary/80 text-sm font-medium"
            >
              ← Back to my picks
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

                  return (
                    <TableRow
                      key={participant.id}
                      className={isWinner ? 'bg-amber-50' : ''}
                    >
                      <TableCell>
                        <span
                          className={`text-sm font-medium ${
                            rank === 1
                              ? 'text-amber-500'
                              : rank === 2
                                ? 'text-slate-400'
                                : rank === 3
                                  ? 'text-amber-600'
                                  : 'text-muted-foreground'
                          }`}
                        >
                          {rank === 1 && '🥇 '}
                          {rank === 2 && '🥈 '}
                          {rank === 3 && '🥉 '}
                          {rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">
                          {participant.name}
                          {isWinner && (
                            <span className="ml-2 text-amber-500">
                              Winner!
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-foreground">
                          {participant.totalPoints}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {pool.status === 'completed' && leaderboard.length > 0 && (
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
