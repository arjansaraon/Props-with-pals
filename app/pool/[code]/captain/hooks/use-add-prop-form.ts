'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/hooks/use-toast';

interface UseAddPropFormProps {
  code: string;
  onError: (message: string) => void;
}

interface UseAddPropFormReturn {
  questionText: string;
  options: string[];
  pointValue: string;
  category: string;
  isAddingProp: boolean;
  isFormOpen: boolean;
  setQuestionText: (value: string) => void;
  setPointValue: (value: string) => void;
  setCategory: (value: string) => void;
  setIsFormOpen: (value: boolean) => void;
  addOption: () => void;
  updateOption: (index: number, value: string) => void;
  removeOption: (index: number) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useAddPropForm({ code, onError }: UseAddPropFormProps): UseAddPropFormReturn {
  const router = useRouter();
  const { showToast } = useToast();

  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pointValue, setPointValue] = useState('10');
  const [category, setCategory] = useState('');
  const [isAddingProp, setIsAddingProp] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  function addOption() {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  }

  function updateOption(index: number, value: string) {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsAddingProp(true);
    onError('');

    try {
      const response = await fetch(`/api/pools/${code}/props`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          options: options.filter((o) => o.trim() !== ''),
          pointValue: parseInt(pointValue, 10),
          category: category.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        onError(data.message || 'Failed to add prop');
        return;
      }

      setQuestionText('');
      setOptions(['', '']);
      setPointValue('10');
      setCategory('');
      setIsFormOpen(false);
      showToast('Prop added successfully', 'success');
      router.refresh();
    } catch {
      onError('Failed to add prop. Please try again.');
    } finally {
      setIsAddingProp(false);
    }
  }

  return {
    questionText,
    options,
    pointValue,
    category,
    isAddingProp,
    isFormOpen,
    setQuestionText,
    setPointValue,
    setCategory,
    setIsFormOpen,
    addOption,
    updateOption,
    removeOption,
    handleSubmit,
  };
}
