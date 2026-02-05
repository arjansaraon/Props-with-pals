'use client';

import { useRouter } from 'next/navigation';
import { Spinner } from '@/app/components/spinner';
import { usePicks } from '@/app/hooks/use-picks';
import { useToast } from '@/app/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Progress } from '@/app/components/ui/progress';
import { AlertCircle, Check, X } from 'lucide-react';

interface Prop {
  id: string;
  questionText: string;
  options: string[];
  pointValue: number;
  correctOptionIndex: number | null;
}

interface PicksClientProps {
  code: string;
  propsList: Prop[];
  initialPicks: { propId: string; selectedOptionIndex: number }[];
  poolStatus: string;
  secret: string;
}

export function PicksClient({
  code,
  propsList,
  initialPicks,
  poolStatus,
  secret,
}: PicksClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // Use the shared picks hook for all state management
  const {
    myPicks,
    submitting,
    pickErrorPropId: errorPropId,
    pickedCount,
    allPicked,
    progressPercent,
    handlePick,
  } = usePicks({
    code,
    secret,
    initialPicks,
    poolStatus,
    totalProps: propsList.length,
  });

  const totalProps = propsList.length;

  function handleSubmit() {
    showToast('All picks submitted!', 'success');
    router.push(`/pool/${code}/leaderboard`);
  }

  return (
    <div className="space-y-4">
      {/* Sticky Progress Tracker */}
      {poolStatus === 'open' && totalProps > 0 && (
        <div className="sticky top-0 z-10 bg-background py-3 -mx-4 px-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${allPicked ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {allPicked ? '✓ All picks completed' : `${pickedCount} of ${totalProps} answered`}
            </span>
            {allPicked && (
              <span className="text-emerald-600 text-sm font-medium">Ready to submit</span>
            )}
          </div>
          <Progress value={progressPercent} className={allPicked ? '[&>div]:bg-emerald-500' : '[&>div]:bg-primary'} />
        </div>
      )}

      {/* Props List */}
      {propsList.map((prop) => {
        const myPick = myPicks.get(prop.id);
        const isResolved = prop.correctOptionIndex !== null;
        const hasError = errorPropId === prop.id;

        return (
          <Card
            key={prop.id}
            className={`shadow-lg ${hasError ? 'ring-2 ring-destructive' : ''}`}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{prop.questionText}</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {prop.pointValue} pts
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {hasError && (
                <Alert variant="destructive" className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to save pick. Please try again.
                  </AlertDescription>
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
                      } ${
                        poolStatus !== 'open'
                          ? 'cursor-default'
                          : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`${
                            isCorrect
                              ? 'text-emerald-800'
                              : isWrong
                                ? 'text-destructive'
                                : 'text-foreground'
                          }`}
                        >
                          {option}
                        </span>
                        {isSaving && (
                          <Spinner size="sm" />
                        )}
                        {!isSaving && isSelected && !isResolved && (
                          <span className="text-primary text-sm">
                            Your pick
                          </span>
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
      })}

      {/* Submit CTA - only shows when all picks are completed */}
      {poolStatus === 'open' && allPicked && (
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
          >
            Submit Picks
          </Button>
        </div>
      )}
    </div>
  );
}
