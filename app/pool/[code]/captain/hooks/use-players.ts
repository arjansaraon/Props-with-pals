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
  error: string | null;
  reload: () => void;
}

export function usePlayers({ code, shouldLoad }: UsePlayersProps): UsePlayersReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shouldLoad && !isLoaded) {
      loadPlayers();
    }
  }, [shouldLoad, isLoaded]);

  async function loadPlayers() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/pools/${code}/players`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players);
        setIsLoaded(true);
      } else {
        setError('Unable to load players list. Please try switching tabs to reload.');
      }
    } catch {
      setError('Network error loading players. Please check your connection and try again.');
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
    error,
    reload,
  };
}
