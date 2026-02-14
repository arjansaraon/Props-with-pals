'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertCircle, Plus, Trash2, Check, Lock } from 'lucide-react';
import type { Prop } from '@/app/types/domain';

interface CaptainClientProps {
  code: string;
  poolStatus: string;
  propsList: Prop[];
}

export function CaptainClient({
  code,
  poolStatus,
  propsList,
}: CaptainClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');

  // Add Prop form state
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pointValue, setPointValue] = useState('10');
  const [isAddingProp, setIsAddingProp] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [resolvingPropId, setResolvingPropId] = useState<string | null>(null);

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

      // Clear form and refresh
      setQuestionText('');
      setOptions(['', '']);
      setPointValue('10');
      router.refresh();
    } catch {
      setError('Failed to add prop');
    } finally {
      setIsAddingProp(false);
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

      router.refresh();
    } catch {
      setError('Failed to lock pool');
    } finally {
      setIsLocking(false);
    }
  }

  async function handleResolve(propId: string, correctOptionIndex: number) {
    setResolvingPropId(propId);
    setError('');

    try {
      const response = await fetch(
        `/api/pools/${code}/props/${propId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correctOptionIndex }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to resolve prop');
        return;
      }

      router.refresh();
    } catch {
      setError('Failed to resolve prop');
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

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Lock Pool Button */}
      {poolStatus === 'open' && (
        <div className="mb-6">
          <Button
            onClick={handleLockPool}
            disabled={isLocking}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Lock className="h-4 w-4" />
            {isLocking ? 'Locking...' : 'Lock Pool'}
          </Button>
        </div>
      )}

      {/* Add Prop Form (only when pool is open) */}
      {poolStatus === 'open' && (
        <Card className="shadow-md mb-6">
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
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={addOption}
                    className="text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Add Option
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
                {isAddingProp ? 'Adding...' : 'Add Prop'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Props List */}
      {propsList.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Props ({propsList.length})
          </h2>
          {propsList.map((prop) => (
            <Card key={prop.id} className="shadow-md">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-foreground">
                    {prop.questionText}
                  </h3>
                  <span className="text-sm font-mono text-muted-foreground">
                    {prop.pointValue} pts
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {prop.options.map((option, index) => {
                    const isCorrect = prop.correctOptionIndex === index;
                    const isResolved = prop.correctOptionIndex !== null;

                    return (
                      <div
                        key={index}
                        className={`px-4 py-2 rounded-lg border ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className={
                              isCorrect
                                ? 'text-emerald-800'
                                : 'text-foreground'
                            }
                          >
                            {option}
                          </span>
                          {isCorrect && (
                            <span className="text-emerald-600 text-sm flex items-center gap-1">
                              <Check className="h-4 w-4" /> Correct
                            </span>
                          )}
                          {/* Resolve button (only for locked pool, unresolved props) */}
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

      {propsList.length === 0 && poolStatus === 'open' && (
        <Card className="shadow-sm">
          <CardContent className="py-6">
            <p className="text-muted-foreground text-center">
              No props yet. Add your first prop above!
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
