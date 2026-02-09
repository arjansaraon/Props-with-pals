'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/app/components/ui/collapsible';
import { Target, Split, AlertTriangle, ChevronDown } from 'lucide-react';
import type { PropPickStats, PoolPickSummary } from '@/src/lib/pick-stats';

interface PerPropStat {
  propId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number | null;
  category: string | null;
  stats: PropPickStats;
}

interface LeaderboardStatsProps {
  summary: PoolPickSummary;
  perPropStats: PerPropStat[];
}

function truncate(text: string, maxLen: number) {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

function groupByCategory(stats: PerPropStat[]): { category: string | null; props: PerPropStat[] }[] {
  const groups = new Map<string | null, PerPropStat[]>();
  for (const stat of stats) {
    const key = stat.category || null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(stat);
  }
  const result: { category: string | null; props: PerPropStat[] }[] = [];
  const uncategorized = groups.get(null);
  if (uncategorized) result.push({ category: null, props: uncategorized });
  for (const [key, value] of groups) {
    if (key !== null) result.push({ category: key, props: value });
  }
  return result;
}

export function LeaderboardStats({ summary, perPropStats }: LeaderboardStatsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasSummary = summary.mostAgreed || summary.mostDivisive || summary.biggestUpset;
  const grouped = groupByCategory(perPropStats);

  return (
    <div className="mt-6 space-y-4">
      {/* Summary Highlights */}
      {hasSummary && (
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.mostAgreed && (
              <div className="flex items-start gap-3">
                <Target className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Most agreed:</span>{' '}
                    <span className="text-muted-foreground">{truncate(summary.mostAgreed.questionText, 50)}</span>
                  </p>
                  <Badge variant="success" className="mt-1">
                    {summary.mostAgreed.percent}% {truncate(summary.mostAgreed.optionText, 20)}
                  </Badge>
                </div>
              </div>
            )}

            {summary.mostDivisive && (
              <div className="flex items-start gap-3">
                <Split className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Most divisive:</span>{' '}
                    <span className="text-muted-foreground">{truncate(summary.mostDivisive.questionText, 50)}</span>
                  </p>
                  <Badge variant="warning" className="mt-1">
                    Only {summary.mostDivisive.percent}% agreed
                  </Badge>
                </div>
              </div>
            )}

            {summary.biggestUpset && (
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Biggest upset:</span>{' '}
                    <span className="text-muted-foreground">{truncate(summary.biggestUpset.questionText, 50)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {summary.biggestUpset.popularPercent}% picked{' '}
                    <span className="text-destructive">{truncate(summary.biggestUpset.popularOption, 20)}</span>
                    {' · '}Actual: <span className="text-emerald-600">{truncate(summary.biggestUpset.correctOption, 20)}</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Per-Prop Pick Popularity */}
      {perPropStats.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="shadow-lg">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <span>Pick Popularity</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <div className="space-y-1">
                  {grouped.map((group) => (
                    <div key={group.category ?? '__uncategorized'}>
                      {group.category && (
                        <div className="flex items-center gap-2 mt-3 mb-2">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs font-medium text-muted-foreground px-2">{group.category}</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      {group.props.map((prop) => {
                        const { stats } = prop;
                        const popularOption = prop.options[stats.mostPopularIndex];
                        const isResolved = prop.correctOptionIndex !== null;

                        return (
                          <div
                            key={prop.propId}
                            className="flex items-center justify-between gap-2 py-2 px-1"
                          >
                            <span className="text-sm text-foreground truncate flex-1 min-w-0">
                              {prop.questionText}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {stats.totalPicks > 0 && (
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                  {stats.mostPopularPercent}% {truncate(popularOption, 15)}
                                </Badge>
                              )}
                              {isResolved && stats.correctCount !== null && stats.totalPicks > 0 && (
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  {stats.correctCount}/{stats.totalPicks} correct
                                </Badge>
                              )}
                              {stats.totalPicks === 0 && (
                                <span className="text-xs text-muted-foreground">No picks</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
