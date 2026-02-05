'use client';

import { Spinner } from '@/app/components/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import type { Participant } from '../types';

interface PlayersTabProps {
  code: string;
  participants: Participant[];
  isLoading: boolean;
}

export function PlayersTab({ code, participants, isLoading }: PlayersTabProps) {

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Players ({participants.length})</CardTitle>
        <p className="text-sm text-muted-foreground">
          Participants are logged in on their own devices. They can access picks at /pool/{code}/picks
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : participants.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No participants have joined yet.</p>
        ) : (
          <div className="space-y-3">
            {participants.map((participant) => (
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
