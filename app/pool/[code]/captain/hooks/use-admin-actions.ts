'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/hooks/use-toast';

interface UseAdminActionsProps {
  code: string;
  onError: (message: string) => void;
}

interface UseAdminActionsReturn {
  isLocking: boolean;
  isCompleting: boolean;
  resolvingPropId: string | null;
  deletingPropId: string | null;
  handleLockPool: () => Promise<void>;
  handleCompletePool: () => Promise<void>;
  handleResolve: (propId: string, correctOptionIndex: number) => Promise<void>;
  handleDeleteProp: (propId: string) => Promise<void>;
}

export function useAdminActions({ code, onError }: UseAdminActionsProps): UseAdminActionsReturn {
  const router = useRouter();
  const { showToast } = useToast();

  const [isLocking, setIsLocking] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [resolvingPropId, setResolvingPropId] = useState<string | null>(null);
  const [deletingPropId, setDeletingPropId] = useState<string | null>(null);

  async function handleLockPool() {
    setIsLocking(true);
    onError('');

    try {
      const response = await fetch(`/api/pools/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' }),
      });

      if (!response.ok) {
        const data = await response.json();
        onError(data.message || 'Failed to lock pool');
        return;
      }

      showToast('Pool is now locked', 'success');
      router.refresh();
    } catch {
      onError('Failed to lock pool. Please try again.');
    } finally {
      setIsLocking(false);
    }
  }

  async function handleCompletePool() {
    setIsCompleting(true);
    onError('');

    try {
      const response = await fetch(`/api/pools/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!response.ok) {
        const data = await response.json();
        onError(data.message || 'Failed to complete pool');
        return;
      }

      showToast('Pool completed! Check the leaderboard for final results.', 'success');
      router.refresh();
    } catch {
      onError('Failed to complete pool. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleResolve(propId: string, correctOptionIndex: number) {
    setResolvingPropId(propId);
    onError('');

    try {
      const response = await fetch(`/api/pools/${code}/props/${propId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctOptionIndex }),
      });

      if (!response.ok) {
        const data = await response.json();
        onError(data.message || 'Failed to resolve prop');
        return;
      }

      showToast('Prop resolved! Points have been awarded.', 'success');
      router.refresh();
    } catch {
      onError('Failed to resolve prop. Please try again.');
    } finally {
      setResolvingPropId(null);
    }
  }

  async function handleDeleteProp(propId: string) {
    setDeletingPropId(propId);
    onError('');

    try {
      const response = await fetch(`/api/pools/${code}/props/${propId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        onError(data.message || 'Failed to delete prop');
        return;
      }

      showToast('Prop deleted', 'success');
      router.refresh();
    } catch {
      onError('Failed to delete prop. Please try again.');
    } finally {
      setDeletingPropId(null);
    }
  }

  return {
    isLocking,
    isCompleting,
    resolvingPropId,
    deletingPropId,
    handleLockPool,
    handleCompletePool,
    handleResolve,
    handleDeleteProp,
  };
}
