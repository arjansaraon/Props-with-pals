'use client';

import { Spinner } from '@/app/components/spinner';
import { Card, CardContent } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Progress } from '@/app/components/ui/progress';
import { Check, X, Lock, AlertCircle } from 'lucide-react';
import type { Prop, SubmittingState } from '../types';

interface PicksReturn {
  myPicks: Map<string, number>;
  submitting: SubmittingState | null;
  pickErrorPropId: string | null;
  pickedCount: number;
  allPicked: boolean;
  progressPercent: number;
  handlePick: (propId: string, optionIndex: number) => void;
}

interface PicksTabProps {
  poolStatus: string;
  propsList: Prop[];
  picks: PicksReturn;
}

export function PicksTab({
  poolStatus,
  propsList,
  picks,
}: PicksTabProps) {
  const {
    myPicks,
    submitting,
    pickErrorPropId,
    pickedCount,
    allPicked,
    progressPercent,
    handlePick,
  } = picks;

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
  );
}
