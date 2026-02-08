'use client';

import { Spinner } from '@/app/components/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Progress } from '@/app/components/ui/progress';
import { AlertCircle, Check, X, Lock } from 'lucide-react';
import type { Prop, SubmittingState } from '@/app/types/domain';

interface PicksViewProps {
  poolStatus: string;
  propsList: Prop[];
  myPicks: Map<string, number>;
  submitting: SubmittingState | null;
  pickErrorPropId: string | null;
  pickedCount: number;
  allPicked: boolean;
  progressPercent: number;
  handlePick: (propId: string, optionIndex: number) => void;
  children?: React.ReactNode; // For optional submit button slot
}

export function PicksView({
  poolStatus,
  propsList,
  myPicks,
  submitting,
  pickErrorPropId,
  pickedCount,
  allPicked,
  progressPercent,
  handlePick,
  children,
}: PicksViewProps) {
  const totalProps = propsList.length;

  return (
    <div className="space-y-4">
      {/* Status Alerts */}
      {poolStatus !== 'open' && (
        <Alert className="border-amber-200 bg-amber-50">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {poolStatus === 'locked'
              ? 'This pool is locked. Picks can no longer be changed.'
              : 'This pool is completed. Check the leaderboard for results!'}
          </AlertDescription>
        </Alert>
      )}

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
          <Progress
            value={progressPercent}
            className={allPicked ? '[&>div]:bg-emerald-500' : '[&>div]:bg-primary'}
            aria-label={`Picks progress: ${pickedCount} of ${totalProps} completed`}
          />
        </div>
      )}

      {/* Props List */}
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
            <Card
              key={prop.id}
              className={`shadow-lg ${hasError ? 'ring-2 ring-destructive' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{prop.questionText}</CardTitle>
                  <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">{prop.pointValue} pts</span>
                </div>
              </CardHeader>
              <CardContent>
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
                                ? 'border-primary bg-primary/10'
                                : 'bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20'
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

      {/* Optional children slot for submit button */}
      {children}
    </div>
  );
}
