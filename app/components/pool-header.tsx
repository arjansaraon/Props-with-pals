'use client';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { CopyLinkButton } from '@/app/components/copy-link-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { PoolStatusAction } from '@/app/components/pool-status-action';
import { HelpCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PoolHeaderProps {
  // Pool info
  poolName: string;
  poolCode: string;
  poolStatus: 'open' | 'locked' | 'completed';
  inviteCode: string;
  captainName: string;
  buyInAmount?: string | null;
  createdAt: string;

  // Current user info
  currentUserName: string;

  // URLs
  myLinkUrl: string;
  shareLinkUrl: string;

  // Tooltip
  tooltipTitle: string;
  tooltipInstructions: string[];

  // Captain-only: show Lock/Complete buttons
  isCaptain?: boolean;
}

export function PoolHeader({
  poolName,
  poolCode,
  poolStatus,
  inviteCode,
  captainName,
  buyInAmount,
  createdAt,
  currentUserName,
  myLinkUrl,
  shareLinkUrl,
  tooltipTitle,
  tooltipInstructions,
  isCaptain = false,
}: PoolHeaderProps) {
  const statusVariant =
    poolStatus === 'open'
      ? 'success'
      : poolStatus === 'locked'
        ? 'warning'
        : 'info';

  return (
    <Card className="shadow-lg mb-6">
      <CardHeader>
        {/* Row 1: Pool name + status (+ action buttons for captain) */}
        <div className="flex justify-between items-start">
          <CardTitle className="text-2xl">{poolName}</CardTitle>
          {isCaptain ? (
            <PoolStatusAction code={poolCode} initialStatus={poolStatus} />
          ) : (
            <Badge variant={statusVariant}>
              {poolStatus.charAt(0).toUpperCase() + poolStatus.slice(1)}
            </Badge>
          )}
        </div>

        {/* Row 2: Pool details */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-2">
          <span>
            Captain: <strong className="text-foreground">{captainName}</strong>
          </span>
          {buyInAmount && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span>
                Buy-in: <strong className="text-foreground">{buyInAmount}</strong>
              </span>
            </>
          )}
          <span className="text-muted-foreground/50">•</span>
          <span>Created: {new Date(createdAt).toLocaleDateString()}</span>
        </div>

        {/* Row 3: Current user */}
        <p className="text-sm text-muted-foreground mt-1">
          Playing as: <strong className="text-foreground">{currentUserName}</strong>
        </p>
      </CardHeader>

      <CardContent>
        {/* Invite code display */}
        <div className="bg-muted rounded-lg p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-1">Invite Code</p>
          <p className="text-2xl font-mono font-bold text-foreground">
            {inviteCode}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Share this code with friends to join
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <CopyLinkButton url={myLinkUrl} label="My link" />
          <CopyLinkButton url={shareLinkUrl} label="Share pool" variant="outline" />

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground p-2 transition-colors">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3">
                <p className="font-medium mb-2">{tooltipTitle}</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {tooltipInstructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ol>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="secondary" asChild className="gap-2 ml-auto">
            <Link href={`/pool/${poolCode}/leaderboard`}>
              View Leaderboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
