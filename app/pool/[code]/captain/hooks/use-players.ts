'use client';

import { useState, useEffect } from 'react';
import type { Player } from '../types';

interface UsePlayersProps {
  code: string;
  shouldLoad: boolean;
}

interface UsePlayersReturn {
  players: Player[];
  isLoading: boolean;
  isLoaded: boolean;
  reload: () => void;
}

export function usePlayers({ code, shouldLoad }: UsePlayersProps): UsePlayersReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (shouldLoad && !isLoaded) {
      loadPlayers();
    }
  }, [shouldLoad, isLoaded]);

  async function loadPlayers() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pools/${code}/players`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players);
        setIsLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function reload() {
    setIsLoaded(false);
  }

  return {
    players,
    isLoading,
    isLoaded,
    reload,
  };
}
