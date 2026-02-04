import { db } from '@/src/lib/db';
import { pools, props, picks, participants } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { headers } from 'next/headers';
import { PicksClient } from './picks-client';
import { getPoolSecret } from '@/src/lib/auth';
import { CopyLinkButton } from '@/app/components/copy-link-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { ArrowRight, AlertCircle, Lock, AlertTriangle } from 'lucide-react';

export default async function ParticipantPicks({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ secret?: string }>;
}) {
  const { code } = await params;
  const { secret: querySecret } = await searchParams;

  // Get secret from cookie (preferred) or query param (fallback for migration)
  const cookieSecret = await getPoolSecret(code);
  const secret = cookieSecret || querySecret;

  // Get host for building personal link
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const personalLink = secret ? `${protocol}://${host}/pool/${code}/picks?secret=${secret}` : null;

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

  // Fetch props for this pool
  const propsList = await db
    .select()
    .from(props)
    .where(eq(props.poolId, pool.id))
    .orderBy(props.order);

  // Fetch participant by secret
  let participant = null;
  let myPicks: { propId: string; selectedOptionIndex: number }[] = [];

  if (secret) {
    const participantResult = await db
      .select()
      .from(participants)
      .where(and(eq(participants.poolId, pool.id), eq(participants.secret, secret)))
      .limit(1);

    if (participantResult.length > 0) {
      participant = participantResult[0];

      // Fetch this participant's picks
      const picksResult = await db
        .select()
        .from(picks)
        .where(eq(picks.participantId, participant.id));

      myPicks = picksResult.map((p) => ({
        propId: p.propId,
        selectedOptionIndex: p.selectedOptionIndex,
      }));
    }
  }

  const statusVariant = pool.status === 'open' ? 'success' : pool.status === 'locked' ? 'warning' : 'info';

  return (
    <div className="min-h-screen p-4">
      <main className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{pool.name}</CardTitle>
                {participant && (
                  <p className="text-sm text-muted-foreground">
                    Playing as: {participant.name}
                  </p>
                )}
              </div>
              <Badge variant={statusVariant}>
                {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm text-muted-foreground">
                Your code: <span className="font-mono font-semibold text-foreground">{code}</span>
              </p>
              {personalLink && (
                <CopyLinkButton url={personalLink} variant="compact" />
              )}
            </div>

            <Button asChild>
              <Link href={`/pool/${code}/leaderboard`}>
                View Leaderboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {pool.status !== 'open' && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            {pool.status === 'locked' ? (
              <Lock className="h-4 w-4 text-amber-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            <AlertDescription className="text-amber-800">
              {pool.status === 'locked'
                ? 'This pool is locked. Picks can no longer be changed.'
                : 'This pool is completed. Check the leaderboard for results!'}
            </AlertDescription>
          </Alert>
        )}

        {!participant && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invalid or missing participant secret. Please use the link you received when joining.
            </AlertDescription>
          </Alert>
        )}

        {/* Props list */}
        {propsList.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-6">
              <p className="text-muted-foreground">
                No props have been added yet. Check back later!
              </p>
            </CardContent>
          </Card>
        ) : participant && secret ? (
          <PicksClient
            code={code}
            propsList={propsList.map((p) => ({
              id: p.id,
              questionText: p.questionText,
              options: p.options as string[],
              pointValue: p.pointValue,
              correctOptionIndex: p.correctOptionIndex,
            }))}
            initialPicks={myPicks}
            poolStatus={pool.status}
            secret={secret}
          />
        ) : null}

      </main>
    </div>
  );
}
