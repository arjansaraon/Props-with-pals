import { db } from '@/src/lib/db';
import { pools, participants } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { CopyLinkButton } from '@/app/components/copy-link-button';
import { headers } from 'next/headers';
import { Card, CardContent } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default async function JoinedConfirmation({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ secret?: string; name?: string }>;
}) {
  const { code } = await params;
  const { secret, name } = await searchParams;

  // Get the host for building the full URL
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  // Fetch pool info
  const poolResult = await db
    .select()
    .from(pools)
    .where(eq(pools.inviteCode, code))
    .limit(1);

  if (poolResult.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-destructive mb-2">Pool Not Found</h1>
            <a href="/" className="text-primary hover:underline">
              Go back home
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pool = poolResult[0];

  // Validate participant exists with this secret
  let participantName = name;
  if (secret) {
    const participantResult = await db
      .select()
      .from(participants)
      .where(and(eq(participants.poolId, pool.id), eq(participants.secret, secret)))
      .limit(1);

    if (participantResult.length > 0) {
      participantName = participantResult[0].name;
    }
  }

  // Build the personal picks URL
  const picksUrl = `${protocol}://${host}/pool/${code}/picks?secret=${secret}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <main className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            {/* Success header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                You&apos;re in!
              </h1>
              <p className="text-muted-foreground">
                Welcome to <span className="font-semibold">{pool.name}</span>
              </p>
              {participantName && (
                <p className="text-sm text-muted-foreground mt-1">
                  Playing as: {participantName}
                </p>
              )}
            </div>

            {/* Save link warning */}
            <Alert className="mb-6 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <p className="text-sm font-medium text-amber-800">
                  Save this link to return later
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  This is your personal link. Bookmark it or copy it somewhere safe.
                </p>
              </AlertDescription>
            </Alert>

            {/* Personal link display */}
            <div className="mb-6">
              <div className="bg-muted rounded-lg p-3 mb-3">
                <p className="text-xs text-muted-foreground mb-1">Your personal link:</p>
                <p className="text-sm font-mono text-foreground break-all">
                  {picksUrl}
                </p>
              </div>
              <CopyLinkButton url={picksUrl} className="w-full justify-center" />
            </div>

            {/* Go to picks button */}
            <Button asChild className="w-full h-12 bg-emerald-600 hover:bg-emerald-700">
              <Link href={`/pool/${code}/picks?secret=${secret}`}>
                Go to My Picks →
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
