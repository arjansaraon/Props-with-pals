'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Prop } from '@/app/types/domain';

interface UseReorderPropsProps {
  code: string;
  propsList: Prop[];
}

interface UseReorderPropsReturn {
  orderedProps: Prop[];
  handleDragEnd: (event: DragEndEvent) => void;
}

export function useReorderProps({ code, propsList }: UseReorderPropsProps): UseReorderPropsReturn {
  const router = useRouter();
  const [optimisticOrder, setOptimisticOrder] = useState<Prop[] | null>(null);

  const orderedProps = optimisticOrder ?? propsList;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const currentList = optimisticOrder ?? propsList;
      const oldIndex = currentList.findIndex((p) => p.id === active.id);
      const newIndex = currentList.findIndex((p) => p.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(currentList, oldIndex, newIndex);
      setOptimisticOrder(reordered);

      // Fire and forget the API call
      fetch(`/api/pools/${code}/props/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propIds: reordered.map((p) => p.id) }),
      })
        .then((res) => {
          if (!res.ok) {
            // Revert on error
            setOptimisticOrder(null);
          } else {
            // Clear optimistic state and refresh server data
            setOptimisticOrder(null);
            router.refresh();
          }
        })
        .catch(() => {
          setOptimisticOrder(null);
        });
    },
    [code, propsList, optimisticOrder, router]
  );

  return { orderedProps, handleDragEnd };
}
