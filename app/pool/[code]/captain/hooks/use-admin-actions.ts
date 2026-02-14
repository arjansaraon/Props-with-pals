'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/hooks/use-toast';
import { apiMutation } from './api-mutation';

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
    const result = await apiMutation({
      url: `/api/pools/${code}`,
      method: 'PATCH',
      body: { status: 'locked' },
      errorFallback: 'Failed to lock pool. Please try again.',
    });
    if (result.ok) {
      showToast('Pool is now locked', 'success');
      router.refresh();
    } else {
      onError(result.message);
    }
    setIsLocking(false);
  }

  async function handleCompletePool() {
    setIsCompleting(true);
    onError('');
    const result = await apiMutation({
      url: `/api/pools/${code}`,
      method: 'PATCH',
      body: { status: 'completed' },
      errorFallback: 'Failed to complete pool. Please try again.',
    });
    if (result.ok) {
      showToast('Pool completed! Check the leaderboard for final results.', 'success');
      router.refresh();
    } else {
      onError(result.message);
    }
    setIsCompleting(false);
  }

  async function handleResolve(propId: string, correctOptionIndex: number) {
    setResolvingPropId(propId);
    onError('');
    const result = await apiMutation({
      url: `/api/pools/${code}/props/${propId}/resolve`,
      method: 'POST',
      body: { correctOptionIndex },
      errorFallback: 'Failed to resolve prop. Please try again.',
    });
    if (result.ok) {
      showToast('Prop resolved! Points have been awarded.', 'success');
      router.refresh();
    } else {
      onError(result.message);
    }
    setResolvingPropId(null);
  }

  async function handleDeleteProp(propId: string) {
    setDeletingPropId(propId);
    onError('');
    const result = await apiMutation({
      url: `/api/pools/${code}/props/${propId}`,
      method: 'DELETE',
      errorFallback: 'Failed to delete prop. Please try again.',
    });
    if (result.ok) {
      showToast('Prop deleted', 'success');
      router.refresh();
    } else {
      onError(result.message);
    }
    setDeletingPropId(null);
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
