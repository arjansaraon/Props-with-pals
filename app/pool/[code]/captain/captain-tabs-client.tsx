'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/app/components/spinner';
import { useToast } from '@/app/hooks/use-toast';
import { CopyLinkButton } from '@/app/components/copy-link-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { AlertCircle, Plus, Trash2, Check, X, Lock, Unlock } from 'lucide-react';

interface Prop {
  id: string;
  questionText: string;
  options: string[];
  pointValue: number;
  correctOptionIndex: number | null;
  status: string;
  order: number;
}

interface CaptainTabsClientProps {
  code: string;
  poolStatus: string;
  propsList: Prop[];
  initialPicks: { propId: string; selectedOptionIndex: number }[];
  secret: string;
}

interface Participant {
  id: string;
  name: string;
  secret: string;
  totalPoints: number;
  joinedAt: string;
  isCaptain: boolean;
}

export function CaptainTabsClient({
  code,
  poolStatus,
  propsList,
  initialPicks,
  secret,
}: CaptainTabsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('admin');
  const [error, setError] = useState('');

  // Admin state
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pointValue, setPointValue] = useState('10');
  const [isAddingProp, setIsAddingProp] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [resolvingPropId, setResolvingPropId] = useState<string | null>(null);

  // Picks state
  const [myPicks, setMyPicks] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    initialPicks.forEach((p) => map.set(p.propId, p.selectedOptionIndex));
    return map;
  });
  const [submitting, setSubmitting] = useState<{ propId: string; index: number } | null>(null);
  const [pickErrorPropId, setPickErrorPropId] = useState<string | null>(null);

  // Players state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);

  // Progress tracking for picks
  const totalProps = propsList.length;
  const pickedCount = myPicks.size;
  const allPicked = totalProps > 0 && pickedCount === totalProps;
  const progressPercent = totalProps > 0 ? (pickedCount / totalProps) * 100 : 0;

  // Get host for building participant links
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';

  // Load participants when Players tab is selected
  useEffect(() => {
    if (activeTab === 'players' && !participantsLoaded) {
      loadParticipants();
    }
  }, [activeTab, participantsLoaded]);

  async function loadParticipants() {
    setIsLoadingParticipants(true);
    try {
      const response = await fetch(`/api/pools/${code}/participants`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants);
        setParticipantsLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setIsLoadingParticipants(false);
    }
  }

  // Admin handlers
  async function handleAddProp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsAddingProp(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}/props`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          options: options.filter((o) => o.trim() !== ''),
          pointValue: parseInt(pointValue, 10),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to add prop');
        return;
      }

      setQuestionText('');
      setOptions(['', '']);
      setPointValue('10');
      showToast('Prop added successfully', 'success');
      router.refresh();
    } catch {
      setError('Failed to add prop. Please try again.');
    } finally {
      setIsAddingProp(false);
    }
  }

  async function handleOpenPool() {
    setIsOpening(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to open pool');
        return;
      }

      showToast('Pool is now open for participants!', 'success');
      router.refresh();
    } catch {
      setError('Failed to open pool. Please try again.');
    } finally {
      setIsOpening(false);
    }
  }

  async function handleLockPool() {
    setIsLocking(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to lock pool');
        return;
      }

      showToast('Pool is now locked', 'success');
      router.refresh();
    } catch {
      setError('Failed to lock pool. Please try again.');
    } finally {
      setIsLocking(false);
    }
  }

  async function handleResolve(propId: string, correctOptionIndex: number) {
    setResolvingPropId(propId);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}/props/${propId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctOptionIndex }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to resolve prop');
        return;
      }

      showToast('Prop resolved! Points have been awarded.', 'success');
      router.refresh();
    } catch {
      setError('Failed to resolve prop. Please try again.');
    } finally {
      setResolvingPropId(null);
    }
  }

  function addOption() {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  }

  function updateOption(index: number, value: string) {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  }

  // Picks handler
  async function handlePick(propId: string, selectedOptionIndex: number) {
    if (poolStatus !== 'open') return;

    const previousPick = myPicks.get(propId);
    setMyPicks((prev) => new Map(prev).set(propId, selectedOptionIndex));
    setSubmitting({ propId, index: selectedOptionIndex });
    setPickErrorPropId(null);

    try {
      const response = await fetch(`/api/pools/${code}/picks?secret=${encodeURIComponent(secret)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propId, selectedOptionIndex }),
      });

      if (!response.ok) {
        setMyPicks((prev) => {
          const newMap = new Map(prev);
          if (previousPick !== undefined) {
            newMap.set(propId, previousPick);
          } else {
            newMap.delete(propId);
          }
          return newMap;
        });
        setPickErrorPropId(propId);
        return;
      }

      showToast('Pick saved!', 'success');
    } catch {
      setMyPicks((prev) => {
        const newMap = new Map(prev);
        if (previousPick !== undefined) {
          newMap.set(propId, previousPick);
        } else {
          newMap.delete(propId);
        }
        return newMap;
      });
      setPickErrorPropId(propId);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="picks">My Picks</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
        </TabsList>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Admin Tab */}
        <TabsContent value="admin">
          {/* Pool Status Actions */}
          {poolStatus === 'draft' && (
            <div className="mb-6">
              <Button
                onClick={handleOpenPool}
                disabled={isOpening || propsList.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isOpening && <Spinner size="sm" />}
                <Unlock className="h-4 w-4" />
                {isOpening ? 'Opening...' : 'Open Pool for Participants'}
              </Button>
              {propsList.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">Add at least one prop before opening</p>
              )}
            </div>
          )}

          {poolStatus === 'open' && (
            <div className="mb-6">
              <Button
                onClick={handleLockPool}
                disabled={isLocking}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isLocking && <Spinner size="sm" />}
                <Lock className="h-4 w-4" />
                {isLocking ? 'Locking...' : 'Lock Pool'}
              </Button>
            </div>
          )}

          {/* Add Prop Form */}
          {(poolStatus === 'draft' || poolStatus === 'open') && (
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <CardTitle>Add New Prop</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddProp} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Input
                      type="text"
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="Who will score the first touchdown?"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Options</Label>
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          required
                        />
                        {options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeOption(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {options.length < 10 && (
                      <Button type="button" variant="ghost" onClick={addOption} className="text-primary">
                        <Plus className="h-4 w-4" /> Add Option
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Point Value</Label>
                    <Input
                      type="number"
                      value={pointValue}
                      onChange={(e) => setPointValue(e.target.value)}
                      min="1"
                      required
                      className="w-32"
                    />
                  </div>

                  <Button type="submit" disabled={isAddingProp}>
                    {isAddingProp && <Spinner size="sm" />}
                    {isAddingProp ? 'Adding...' : 'Add Prop'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Props List */}
          {propsList.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Props ({propsList.length})</h2>
              {propsList.map((prop) => (
                <Card key={prop.id} className="shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-foreground">{prop.questionText}</h3>
                      <span className="text-sm text-muted-foreground">{prop.pointValue} pts</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {prop.options.map((option, index) => {
                        const isCorrect = prop.correctOptionIndex === index;
                        const isResolved = prop.correctOptionIndex !== null;

                        return (
                          <div
                            key={index}
                            className={`px-4 py-2 rounded-lg border ${
                              isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-border'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className={isCorrect ? 'text-emerald-800' : 'text-foreground'}>
                                {option}
                              </span>
                              {isCorrect && (
                                <span className="text-emerald-600 text-sm flex items-center gap-1">
                                  <Check className="h-4 w-4" /> Correct
                                </span>
                              )}
                              {poolStatus === 'locked' && !isResolved && (
                                <Button
                                  size="sm"
                                  onClick={() => handleResolve(prop.id, index)}
                                  disabled={resolvingPropId === prop.id}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  {resolvingPropId === prop.id ? '...' : 'Mark Correct'}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {prop.correctOptionIndex !== null && (
                      <p className="text-sm text-emerald-600 flex items-center gap-1">
                        <Check className="h-4 w-4" /> Resolved
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {propsList.length === 0 && (
            <Card className="shadow-lg">
              <CardContent className="py-6">
                <p className="text-muted-foreground text-center">No props yet. Add your first prop above!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Picks Tab */}
        <TabsContent value="picks">
          <div className="space-y-4">
            {poolStatus !== 'open' && poolStatus !== 'draft' && (
              <Alert className="border-amber-200 bg-amber-50">
                <Lock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {poolStatus === 'locked'
                    ? 'This pool is locked. Picks can no longer be changed.'
                    : 'This pool is completed. Check the leaderboard for results!'}
                </AlertDescription>
              </Alert>
            )}

            {poolStatus === 'draft' && (
              <Alert className="border-sky-200 bg-sky-50">
                <AlertCircle className="h-4 w-4 text-sky-600" />
                <AlertDescription className="text-sky-800">
                  Open the pool to start making picks.
                </AlertDescription>
              </Alert>
            )}

            {propsList.length === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="py-6">
                  <p className="text-muted-foreground text-center">No props have been added yet.</p>
                </CardContent>
              </Card>
            ) : (
              propsList.map((prop) => {
                const myPick = myPicks.get(prop.id);
                const isResolved = prop.correctOptionIndex !== null;
                const hasError = pickErrorPropId === prop.id;

                return (
                  <Card key={prop.id} className={`shadow-lg ${hasError ? 'ring-2 ring-destructive' : ''}`}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-medium text-foreground">{prop.questionText}</h3>
                        <span className="text-sm text-muted-foreground">{prop.pointValue} pts</span>
                      </div>

                      {hasError && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>Failed to save pick. Please try again.</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        {prop.options.map((option, index) => {
                          const isSelected = myPick === index;
                          const isCorrect = isResolved && prop.correctOptionIndex === index;
                          const isWrong = isResolved && isSelected && prop.correctOptionIndex !== index;
                          const isSaving = submitting?.propId === prop.id && submitting?.index === index;

                          return (
                            <button
                              key={index}
                              onClick={() => handlePick(prop.id, index)}
                              disabled={poolStatus !== 'open' || submitting !== null}
                              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : isWrong
                                    ? 'border-destructive bg-red-50'
                                    : isSelected
                                      ? 'border-primary bg-accent'
                                      : 'border-border hover:border-muted-foreground'
                              } ${poolStatus !== 'open' ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={
                                    isCorrect
                                      ? 'text-emerald-800'
                                      : isWrong
                                        ? 'text-destructive'
                                        : 'text-foreground'
                                  }
                                >
                                  {option}
                                </span>
                                {isSaving && <Spinner size="sm" />}
                                {!isSaving && isSelected && !isResolved && (
                                  <span className="text-primary text-sm">Your pick</span>
                                )}
                                {isCorrect && (
                                  <span className="text-emerald-600 text-sm flex items-center gap-1">
                                    <Check className="h-4 w-4" /> Correct
                                  </span>
                                )}
                                {isWrong && (
                                  <span className="text-destructive text-sm flex items-center gap-1">
                                    <X className="h-4 w-4" /> Wrong
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}

            {/* Progress */}
            {poolStatus === 'open' && totalProps > 0 && (
              <Card className={`shadow-lg ${allPicked ? 'border-emerald-500' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className={`font-medium ${allPicked ? 'text-emerald-600' : 'text-foreground'}`}>
                        {allPicked ? '✓ All picks submitted!' : 'Submit Picks'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {pickedCount} of {totalProps} props answered
                      </p>
                    </div>
                    {allPicked && <Check className="h-6 w-6 text-emerald-600" />}
                  </div>
                  {!allPicked && (
                    <Progress value={progressPercent} className="[&>div]:bg-primary" />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Players Tab */}
        <TabsContent value="players">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Players ({participants.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Copy a player&apos;s link to share with them if they need to access their picks.
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingParticipants ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" className="text-primary" />
                </div>
              ) : participants.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No participants have joined yet.</p>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant) => {
                    const participantLink = `${protocol}//${host}/pool/${code}/picks?secret=${participant.secret}`;

                    return (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-foreground">{participant.name}</span>
                          {participant.isCaptain && (
                            <Badge variant="default" className="ml-2">Captain</Badge>
                          )}
                          <p className="text-sm text-muted-foreground">{participant.totalPoints} pts</p>
                        </div>
                        <CopyLinkButton url={participantLink} variant="compact" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
