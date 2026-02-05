'use client';

import { useState } from 'react';
import { usePicks } from '@/app/hooks/use-picks';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import type { CaptainTabsClientProps } from './types';
import { usePlayers, useAddPropForm, useAdminActions, useEditProp } from './hooks';
import { AdminTab, PicksTab, PlayersTab } from './components';

export function CaptainTabsClient({
  code,
  poolStatus,
  propsList,
  initialPicks,
  secret,
}: CaptainTabsClientProps) {
  const [activeTab, setActiveTab] = useState('admin');
  const [error, setError] = useState('');

  // Admin actions (via hook)
  const adminActions = useAdminActions({ code, onError: setError });

  // Add prop form (via hook)
  const addPropForm = useAddPropForm({ code, onError: setError });

  // Edit prop (via hook)
  const editProp = useEditProp({ code, onError: setError });

  // Picks state (via hook)
  const picks = usePicks({
    code,
    secret,
    initialPicks,
    poolStatus,
    totalProps: propsList.length,
  });

  // Players state (via hook)
  const { players, isLoading: isLoadingPlayers } = usePlayers({
    code,
    shouldLoad: activeTab === 'players',
  });

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

        <TabsContent value="admin">
          <AdminTab
            poolStatus={poolStatus}
            propsList={propsList}
            adminActions={adminActions}
            addPropForm={addPropForm}
            editProp={editProp}
          />
        </TabsContent>

        <TabsContent value="picks">
          <PicksTab
            poolStatus={poolStatus}
            propsList={propsList}
            picks={picks}
          />
        </TabsContent>

        <TabsContent value="players">
          <PlayersTab
            code={code}
            players={players}
            isLoading={isLoadingPlayers}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
