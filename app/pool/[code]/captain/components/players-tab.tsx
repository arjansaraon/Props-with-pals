'use client';

import { Spinner } from '@/app/components/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { CopyLinkButton } from '@/app/components/copy-link-button';
import type { Player } from '../types';

interface PlayersTabProps {
  code: string;
  players: Player[];
  isLoading: boolean;
}

export function PlayersTab({ code, players, isLoading }: PlayersTabProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Players ({players.length})</CardTitle>
        <p className="text-sm text-muted-foreground">
          Players are logged in on their own devices. They can access picks at /pool/{code}/picks
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : players.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No players have joined yet.</p>
        ) : (
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{player.name}</span>
                  {player.isCaptain && <Badge variant="secondary">Captain</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">{player.totalPoints} pts</p>
                  {player.recoveryUrl && (
                    <CopyLinkButton url={player.recoveryUrl} variant="compact" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
