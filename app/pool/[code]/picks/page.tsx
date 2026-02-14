import { db } from "@/src/lib/db";
import { pools, props, picks, players } from "@/src/lib/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { PicksClient } from "./picks-client";
import { getPoolSecret } from "@/src/lib/auth";
import { Card, CardContent } from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { PoolHeader } from "@/app/components/pool-header";
import { AlertCircle, Lock, AlertTriangle } from "lucide-react";
import { RecoveryHandler } from "./recovery-handler";

export default async function PlayerPicks({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { code } = await params;
  const { token: queryToken } = await searchParams;

  // Cookie is the only auth mechanism — no query param fallback
  const cookieSecret = await getPoolSecret(code);
  const secret = cookieSecret || null;

  // Get host for building pool link (no secret - auth via cookie)
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const poolLink = `${protocol}://${host}/pool/${code}/picks`;

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
      .from(players)
      .where(
        and(eq(players.poolId, pool.id), eq(players.secret, secret)),
      )
      .limit(1);

    if (participantResult.length > 0) {
      participant = participantResult[0];

      // Fetch this participant's picks
      const picksResult = await db
        .select()
        .from(picks)
        .where(eq(picks.playerId, participant.id));

      myPicks = picksResult.map((p) => ({
        propId: p.propId,
        selectedOptionIndex: p.selectedOptionIndex,
      }));
    }
  }

  return (
    <div className="min-h-screen p-4">
      <main className="max-w-2xl mx-auto">
        {/* Header */}
        {participant && (
          <PoolHeader
            poolName={pool.name}
            poolCode={code}
            poolStatus={pool.status as 'open' | 'locked' | 'completed'}
            inviteCode={pool.inviteCode}
            captainName={pool.captainName}
            buyInAmount={pool.buyInAmount}
            createdAt={pool.createdAt}
            currentUserName={participant.name}
            myLinkUrl={poolLink}
            shareLinkUrl={`${protocol}://${host}/pool/${code}`}
            tooltipTitle="How to Play"
            tooltipInstructions={[
              'Pick your answers for each prop',
              'Your picks auto-save when selected',
              'You can change picks until the pool locks',
              'Check the leaderboard to see standings',
            ]}
          />
        )}

        {pool.status !== "open" && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            {pool.status === "locked" ? (
              <Lock className="h-4 w-4 text-amber-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            <AlertDescription className="text-amber-800">
              {pool.status === "locked"
                ? "This pool is locked. Picks can no longer be changed."
                : "This pool is completed. Check the leaderboard for results!"}
            </AlertDescription>
          </Alert>
        )}

        {!participant && queryToken && (
          <RecoveryHandler code={code} />
        )}

        {!participant && !queryToken && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invalid or missing participant secret. Please use the link you
              received when joining.
            </AlertDescription>
          </Alert>
        )}

        {/* Props list */}
        {propsList.length === 0 ? (
          <Card className="shadow-sm">
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
              category: p.category,
            }))}
            initialPicks={myPicks}
            poolStatus={pool.status}
          />
        ) : null}
      </main>
    </div>
  );
}
