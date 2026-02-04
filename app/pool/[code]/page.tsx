'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { saveUserSession } from '@/src/lib/user-session';
import { Spinner } from '@/app/components/spinner';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';

interface Pool {
  id: string;
  name: string;
  inviteCode: string;
  captainName: string;
  status: 'open' | 'locked' | 'completed';
  buyInAmount: string | null;
}

export default function JoinPool({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  const [pool, setPool] = useState<Pool | null>(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPool() {
      try {
        const response = await fetch(`/api/pools/${code}`);
        if (!response.ok) {
          setError('Pool not found');
          return;
        }
        const data = await response.json();
        setPool(data);
      } catch {
        setError('Failed to load pool');
      } finally {
        setIsLoading(false);
      }
    }
    loadPool();
  }, [code]);

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsJoining(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'NAME_TAKEN') {
          setError('That name is already taken. Please choose another.');
        } else if (data.code === 'POOL_LOCKED') {
          setError('This pool is no longer accepting new participants.');
        } else {
          setError(data.message || 'Failed to join pool');
        }
        return;
      }

      // Save user session to localStorage (cookie auth handles the secret)
      saveUserSession(code, { name, isCaptain: false });

      // Redirect to joined confirmation page with secret
      router.push(`/pool/${code}/joined?secret=${data.secret}&name=${encodeURIComponent(name)}`);
    } catch {
      setError('Failed to join pool. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-destructive mb-2">Pool Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The pool with code &quot;{code}&quot; does not exist.
            </p>
            <a href="/" className="text-primary hover:underline">
              Go back home
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pool.status !== 'open') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-foreground mb-2">
              {pool.name}
            </h1>
            <p className="text-muted-foreground mb-4">
              This pool is {pool.status} and no longer accepting new participants.
            </p>
            <a
              href={`/pool/${code}/leaderboard`}
              className="text-primary hover:underline"
            >
              View Leaderboard
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <main className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Join {pool.name}</CardTitle>
            <CardDescription>Hosted by {pool.captainName}</CardDescription>
            {pool.buyInAmount && (
              <p className="text-sm text-muted-foreground">
                Buy-in: {pool.buyInAmount}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  maxLength={50}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    {error}
                    <button
                      type="button"
                      onClick={() => setError('')}
                      className="ml-2 hover:opacity-70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isJoining}
                className="w-full h-12"
              >
                {isJoining && <Spinner size="sm" />}
                {isJoining ? 'Joining...' : 'Join Pool'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
