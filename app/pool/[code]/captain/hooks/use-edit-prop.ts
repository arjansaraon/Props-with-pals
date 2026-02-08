'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/hooks/use-toast';
import type { Prop } from '../types';

interface UseEditPropProps {
  code: string;
  onError: (message: string) => void;
}

interface EditFormState {
  questionText: string;
  options: string[];
  pointValue: string;
  category: string;
}

interface UseEditPropReturn {
  editingPropId: string | null;
  editForm: EditFormState;
  isSaving: boolean;
  hasPicksWarning: boolean;
  startEditing: (prop: Prop) => Promise<void>;
  cancelEditing: () => void;
  setQuestionText: (value: string) => void;
  setPointValue: (value: string) => void;
  setCategory: (value: string) => void;
  addOption: () => void;
  updateOption: (index: number, value: string) => void;
  removeOption: (index: number) => void;
  saveChanges: () => Promise<void>;
}

export function useEditProp({ code, onError }: UseEditPropProps): UseEditPropReturn {
  const router = useRouter();
  const { showToast } = useToast();

  const [editingPropId, setEditingPropId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    questionText: '',
    options: ['', ''],
    pointValue: '10',
    category: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasPicksWarning, setHasPicksWarning] = useState(false);

  async function startEditing(prop: Prop) {
    // Check if this prop has any picks
    try {
      const response = await fetch(`/api/pools/${code}/props/${prop.id}/picks-count`);
      if (response.ok) {
        const data = await response.json();
        setHasPicksWarning(data.count > 0);
      } else {
        // If endpoint doesn't exist, assume no warning needed
        setHasPicksWarning(false);
      }
    } catch {
      setHasPicksWarning(false);
    }

    setEditingPropId(prop.id);
    setEditForm({
      questionText: prop.questionText,
      options: [...prop.options],
      pointValue: String(prop.pointValue),
      category: prop.category || '',
    });
  }

  function cancelEditing() {
    setEditingPropId(null);
    setHasPicksWarning(false);
    setEditForm({
      questionText: '',
      options: ['', ''],
      pointValue: '10',
      category: '',
    });
  }

  function setQuestionText(value: string) {
    setEditForm((prev) => ({ ...prev, questionText: value }));
  }

  function setPointValue(value: string) {
    setEditForm((prev) => ({ ...prev, pointValue: value }));
  }

  function setCategory(value: string) {
    setEditForm((prev) => ({ ...prev, category: value }));
  }

  function addOption() {
    if (editForm.options.length < 10) {
      setEditForm((prev) => ({ ...prev, options: [...prev.options, ''] }));
    }
  }

  function updateOption(index: number, value: string) {
    setEditForm((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  }

  function removeOption(index: number) {
    if (editForm.options.length > 2) {
      setEditForm((prev) => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  }

  async function saveChanges() {
    if (!editingPropId) return;

    setIsSaving(true);
    onError('');

    try {
      const response = await fetch(`/api/pools/${code}/props/${editingPropId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: editForm.questionText,
          options: editForm.options.filter((o) => o.trim() !== ''),
          pointValue: parseInt(editForm.pointValue, 10),
          category: editForm.category.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        onError(data.message || 'Failed to update prop');
        return;
      }

      showToast('Prop updated successfully', 'success');
      cancelEditing();
      router.refresh();
    } catch {
      onError('Failed to update prop. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    editingPropId,
    editForm,
    isSaving,
    hasPicksWarning,
    startEditing,
    cancelEditing,
    setQuestionText,
    setPointValue,
    setCategory,
    addOption,
    updateOption,
    removeOption,
    saveChanges,
  };
}
