import { db } from '@/src/lib/db';
import { pools, props, participants, picks } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { CaptainTabsClient } from './captain-tabs-client';
import { getPoolSecret } from '@/src/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default async function CaptainDashboard({
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

  // Verify captain secret
  if (!secret || pool.captainSecret !== secret) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-destructive mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              Invalid captain secret. Please use the link you received when creating the pool.
            </p>
            <Link href="/" className="text-primary hover:underline">
              Go back home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch props for this pool
  const propsList = await db
    .select()
    .from(props)
    .where(eq(props.poolId, pool.id))
    .orderBy(props.order);

  // Fetch captain's participant record and picks (captain secret = participant secret)
  let myPicks: { propId: string; selectedOptionIndex: number }[] = [];
  const participantResult = await db
    .select()
    .from(participants)
    .where(and(eq(participants.poolId, pool.id), eq(participants.secret, secret)))
    .limit(1);

  if (participantResult.length > 0) {
    const picksResult = await db
      .select()
      .from(picks)
      .where(eq(picks.participantId, participantResult[0].id));

    myPicks = picksResult.map((p) => ({
      propId: p.propId,
      selectedOptionIndex: p.selectedOptionIndex,
    }));
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
                <p className="text-sm text-muted-foreground">
                  Captain: {pool.captainName}
                </p>
              </div>
              <Badge variant={statusVariant}>
                {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">
                Invite Code
              </p>
              <p className="text-2xl font-mono font-bold text-foreground">
                {pool.inviteCode}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Share this code with friends to join
              </p>
            </div>

            {pool.buyInAmount && (
              <p className="text-sm text-muted-foreground mb-4">
                Buy-in: {pool.buyInAmount}
              </p>
            )}

            <Button variant="secondary" asChild>
              <Link href={`/pool/${code}/leaderboard`}>
                View Leaderboard
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Client component with tabs for admin and picks */}
        <CaptainTabsClient
          code={code}
          poolStatus={pool.status}
          propsList={propsList.map((p) => ({
            id: p.id,
            questionText: p.questionText,
            options: p.options as string[],
            pointValue: p.pointValue,
            correctOptionIndex: p.correctOptionIndex,
            status: p.status,
            order: p.order,
          }))}
          initialPicks={myPicks}
          secret={secret}
        />

        {/* Instructions */}
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle>Captain Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Share the invite code with friends to join</li>
              <li>Add props (questions) while the pool is open</li>
              <li>Lock the pool when everyone has joined and picks are in</li>
              <li>After the event, mark correct answers to calculate scores</li>
            </ol>
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Important:</strong> Save this URL! You need it to manage your pool.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
