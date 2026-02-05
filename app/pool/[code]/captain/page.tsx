import { db } from '@/src/lib/db';
import { pools, props, players, picks } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { headers } from 'next/headers';
import { CaptainTabsClient } from './captain-tabs-client';
import { getPoolSecret } from '@/src/lib/auth';
import { CopyLinkButton } from '@/app/components/copy-link-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export default async function CaptainDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ secret?: string }>;
}) {
  const { code } = await params;
  const { secret: querySecret } = await searchParams;

  // Get host for building captain link
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

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
    .from(players)
    .where(and(eq(players.poolId, pool.id), eq(players.secret, secret)))
    .limit(1);

  if (participantResult.length > 0) {
    const picksResult = await db
      .select()
      .from(picks)
      .where(eq(picks.playerId, participantResult[0].id));

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
              <CardTitle className="text-2xl">{pool.name}</CardTitle>
              <Badge variant={statusVariant}>
                {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
              </Badge>
            </div>
            {/* Inline Details Row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-2">
              <span>
                Captain: <strong className="text-foreground">{pool.captainName}</strong>
              </span>
              {pool.buyInAmount && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>
                    Buy-in: <strong className="text-foreground">{pool.buyInAmount}</strong>
                  </span>
                </>
              )}
              <span className="text-muted-foreground/50">•</span>
              <span>Created: {new Date(pool.createdAt).toLocaleDateString()}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">
                  Invite Code
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs p-3">
                      <p className="font-medium mb-2">Captain Instructions</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Share the invite code with friends</li>
                        <li>Add props while the pool is open</li>
                        <li>Lock the pool when ready</li>
                        <li>Mark correct answers after the event</li>
                      </ol>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-2xl font-mono font-bold text-foreground">
                {pool.inviteCode}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Share this code with friends to join
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <CopyLinkButton url={`${protocol}://${host}/pool/${code}/captain?secret=${secret}`} />
              <Button variant="secondary" asChild>
                <Link href={`/pool/${code}/leaderboard`}>
                  View Leaderboard
                </Link>
              </Button>
            </div>
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

        {/* Save URL Reminder */}
        <Alert className="mt-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Important:</strong> Save this URL! You need it to manage your pool.
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
}
