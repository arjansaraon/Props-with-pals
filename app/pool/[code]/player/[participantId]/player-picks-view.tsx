'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft, Check, X, Clock } from 'lucide-react';

interface PropWithPick {
  id: string;
  questionText: string;
  options: string[];
  pointValue: number;
  correctOptionIndex: number | null;
  selectedOptionIndex: number | null;
  pickPopularity?: {
    totalPicks: number;
    selectedCount: number;
  };
}

interface Stats {
  correct: number;
  wrong: number;
  pending: number;
  unanswered: number;
}

interface PlayerPicksViewProps {
  code: string;
  playerName: string;
  totalPoints: number;
  props: PropWithPick[];
  stats: Stats;
}

export function PlayerPicksView({
  code,
  playerName,
  totalPoints,
  props,
  stats,
}: PlayerPicksViewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">{playerName}'s Picks</CardTitle>
              <p className="text-sm font-mono text-muted-foreground mt-1">
                {totalPoints} total points
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
              <Check className="h-4 w-4" />
              {stats.correct} correct
            </span>
            {stats.wrong > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-destructive">
                <X className="h-4 w-4" />
                {stats.wrong} wrong
              </span>
            )}
            {stats.pending > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {stats.pending} pending
              </span>
            )}
            {stats.unanswered > 0 && (
              <span className="text-sm text-muted-foreground">
                {stats.unanswered} unanswered
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/pool/${code}/leaderboard`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Leaderboard
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href={`/pool/${code}/picks`}>
                View My Picks
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Props List */}
      {props.map((prop) => {
        const hasPick = prop.selectedOptionIndex !== null;
        const isResolved = prop.correctOptionIndex !== null;

        return (
          <Card key={prop.id} className="shadow-md">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{prop.questionText}</CardTitle>
                <span className="text-sm font-mono text-muted-foreground">
                  {prop.pointValue} pts
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {prop.options.map((option, index) => {
                  const isSelected = prop.selectedOptionIndex === index;
                  const isCorrectOption = isResolved && prop.correctOptionIndex === index;
                  const isWrongSelection = isResolved && isSelected && prop.correctOptionIndex !== index;

                  return (
                    <div
                      key={index}
                      className={`px-4 py-3 rounded-lg border-2 ${
                        isWrongSelection
                          ? 'border-destructive bg-red-50'
                          : isSelected && !isResolved
                            ? 'border-primary bg-accent'
                            : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={
                            isWrongSelection
                              ? 'text-destructive'
                              : 'text-foreground'
                          }
                        >
                          {option}
                        </span>
                        {isSelected && !isResolved && (
                          <div className="flex items-center gap-2">
                            {prop.pickPopularity && prop.pickPopularity.totalPicks > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {prop.pickPopularity.selectedCount} of {prop.pickPopularity.totalPicks} picked this
                              </span>
                            )}
                            <span className="text-primary text-sm">Their pick</span>
                          </div>
                        )}
                        {isCorrectOption && (
                          <Check className="h-4 w-4 text-muted-foreground" />
                        )}
                        {isWrongSelection && (
                          <div className="flex items-center gap-2">
                            {prop.pickPopularity && prop.pickPopularity.totalPicks > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {prop.pickPopularity.selectedCount} of {prop.pickPopularity.totalPicks}
                              </span>
                            )}
                            <span className="text-destructive text-sm flex items-center gap-1">
                              <X className="h-4 w-4" /> Wrong
                            </span>
                          </div>
                        )}
                        {isCorrectOption && isSelected && prop.pickPopularity && prop.pickPopularity.totalPicks > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {prop.pickPopularity.selectedCount} of {prop.pickPopularity.totalPicks} picked this
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!hasPick && (
                <p className="text-sm text-muted-foreground mt-3 italic">
                  No pick submitted
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
