import { db } from '@/src/lib/db';
import { pools, props, players, picks } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { headers } from 'next/headers';
import { CaptainTabsClient } from './captain-tabs-client';
import { getPoolSecret, safeCompareSecrets } from '@/src/lib/auth';
import { Card, CardContent } from '@/app/components/ui/card';
import { PoolHeader } from '@/app/components/pool-header';
import { RecoveryHandler } from '../picks/recovery-handler';

export default async function CaptainDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { code } = await params;
  const { token: queryToken } = await searchParams;

  // Get host for building captain link
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  // Cookie is the only auth mechanism
  const cookieSecret = await getPoolSecret(code);

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

  // If no cookie but token present, show RecoveryHandler to set cookie and redirect
  if (!cookieSecret && queryToken) {
    return (
      <div className="min-h-screen p-4">
        <main className="max-w-2xl mx-auto">
          <RecoveryHandler code={code} redirectPath={`/pool/${code}/captain`} />
        </main>
      </div>
    );
  }

  // Verify captain secret
  if (!cookieSecret || !safeCompareSecrets(cookieSecret, pool.captainSecret)) {
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
    .where(and(eq(players.poolId, pool.id), eq(players.secret, cookieSecret)))
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

  return (
    <div className="min-h-screen p-4">
      <main className="max-w-2xl mx-auto">
        {/* Header */}
        <PoolHeader
          poolName={pool.name}
          poolCode={code}
          poolStatus={pool.status as 'open' | 'locked' | 'completed'}
          inviteCode={pool.inviteCode}
          captainName={pool.captainName}
          buyInAmount={pool.buyInAmount}
          createdAt={pool.createdAt}
          currentUserName={pool.captainName}
          myLinkUrl={`${protocol}://${host}/pool/${code}/captain`}
          shareLinkUrl={`${protocol}://${host}/pool/${code}`}
          tooltipTitle="Share instructions"
          tooltipInstructions={[
            'Share the invite code or pool link with friends',
            'They can join using the code on the homepage',
            'Once joined, they\'ll get their own private link',
          ]}
          isCaptain
        />

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
            category: p.category,
          }))}
          initialPicks={myPicks}
        />
      </main>
    </div>
  );
}
