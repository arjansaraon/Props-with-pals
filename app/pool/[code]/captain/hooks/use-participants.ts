'use client';

import { useState, useEffect } from 'react';
import type { Participant } from '../types';

interface UseParticipantsProps {
  code: string;
  shouldLoad: boolean;
}

interface UseParticipantsReturn {
  participants: Participant[];
  isLoading: boolean;
  isLoaded: boolean;
  reload: () => void;
}

export function useParticipants({ code, shouldLoad }: UseParticipantsProps): UseParticipantsReturn {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (shouldLoad && !isLoaded) {
      loadParticipants();
    }
  }, [shouldLoad, isLoaded]);

  async function loadParticipants() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pools/${code}/participants`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants);
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
    participants,
    isLoading,
    isLoaded,
    reload,
  };
}
