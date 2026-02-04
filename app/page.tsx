'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveUserSession } from '@/src/lib/user-session';
import { Spinner } from '@/app/components/spinner';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  // Join pool state
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Create pool state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [buyInAmount, setBuyInAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function handleJoinPool(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsJoining(true);
    setJoinError('');

    try {
      // Validate the pool exists before navigating
      const response = await fetch(`/api/pools/${inviteCode.toUpperCase()}`);

      if (!response.ok) {
        setJoinError('Pool not found. Check the code and try again.');
        return;
      }

      // Navigate to the pool join page
      router.push(`/pool/${inviteCode.toUpperCase()}`);
    } catch {
      setJoinError('Failed to find pool. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setCreateError('');

    try {
      const response = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          captainName,
          buyInAmount: buyInAmount || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateError(data.message || 'Failed to create pool');
        return;
      }

      // Save user session to localStorage (cookie auth handles the secret)
      saveUserSession(data.inviteCode, { name: captainName, isCaptain: true });

      // Redirect to captain dashboard (cookie has the secret)
      router.push(`/pool/${data.inviteCode}/captain`);
    } catch {
      setCreateError('Failed to create pool. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <main className="w-full max-w-md space-y-6">
        {/* Join Pool - Primary Action */}
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Props With Pals</CardTitle>
            <CardDescription>Make prop bets with your friends</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinPool} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Enter Pool Code</Label>
                <Input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g., ABC123"
                  maxLength={6}
                  className="text-center text-xl font-mono tracking-wider uppercase h-12"
                />
              </div>

              {joinError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    {joinError}
                    <button
                      type="button"
                      onClick={() => setJoinError('')}
                      className="ml-2 hover:opacity-70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isJoining || !inviteCode.trim()}
                className="w-full h-12"
              >
                {isJoining && <Spinner size="sm" />}
                {isJoining ? 'Finding Pool...' : 'Join Pool'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Create Pool - Secondary Action */}
        <Card className="shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-accent transition-colors"
          >
            <span className="font-medium text-foreground">
              Create a New Pool
            </span>
            {showCreate ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {showCreate && (
            <CardContent className="pt-2 border-t">
              <form onSubmit={handleCreatePool} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Pool Name</Label>
                  <Input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Super Bowl 2026"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="captainName">Your Name (Captain)</Label>
                  <Input
                    type="text"
                    id="captainName"
                    value={captainName}
                    onChange={(e) => setCaptainName(e.target.value)}
                    placeholder="e.g., John"
                    required
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyInAmount">Buy-in Amount (Optional)</Label>
                  <Input
                    type="text"
                    id="buyInAmount"
                    value={buyInAmount}
                    onChange={(e) => setBuyInAmount(e.target.value)}
                    placeholder="e.g., $20"
                    maxLength={20}
                  />
                </div>

                {createError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      {createError}
                      <button
                        type="button"
                        onClick={() => setCreateError('')}
                        className="ml-2 hover:opacity-70"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isCreating}
                  className="w-full h-12"
                >
                  {isCreating && <Spinner size="sm" />}
                  {isCreating ? 'Creating...' : 'Create Pool'}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}
