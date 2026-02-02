'use client';

import { useState } from 'react';

interface Prop {
  id: string;
  questionText: string;
  options: string[];
  pointValue: number;
  correctOptionIndex: number | null;
}

interface PicksClientProps {
  code: string;
  secret: string;
  propsList: Prop[];
  initialPicks: { propId: string; selectedOptionIndex: number }[];
  poolStatus: string;
}

export function PicksClient({
  code,
  secret,
  propsList,
  initialPicks,
  poolStatus,
}: PicksClientProps) {
  const [myPicks, setMyPicks] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    initialPicks.forEach((p) => map.set(p.propId, p.selectedOptionIndex));
    return map;
  });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handlePick(propId: string, selectedOptionIndex: number) {
    if (poolStatus !== 'open') return;

    setSubmitting(propId);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}/picks?secret=${secret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propId, selectedOptionIndex }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to submit pick');
        return;
      }

      // Update local state
      setMyPicks((prev) => new Map(prev).set(propId, selectedOptionIndex));
    } catch (err) {
      setError('Failed to submit pick');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {propsList.map((prop) => {
        const myPick = myPicks.get(prop.id);
        const isResolved = prop.correctOptionIndex !== null;

        return (
          <div
            key={prop.id}
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                {prop.questionText}
              </h3>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {prop.pointValue} pts
              </span>
            </div>

            <div className="space-y-2">
              {prop.options.map((option, index) => {
                const isSelected = myPick === index;
                const isCorrect = isResolved && prop.correctOptionIndex === index;
                const isWrong = isResolved && isSelected && prop.correctOptionIndex !== index;

                return (
                  <button
                    key={index}
                    onClick={() => handlePick(prop.id, index)}
                    disabled={poolStatus !== 'open' || submitting === prop.id}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      isCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : isWrong
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                    } ${
                      poolStatus !== 'open'
                        ? 'cursor-default'
                        : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`${
                          isCorrect
                            ? 'text-green-800 dark:text-green-400'
                            : isWrong
                              ? 'text-red-800 dark:text-red-400'
                              : 'text-zinc-900 dark:text-white'
                        }`}
                      >
                        {option}
                      </span>
                      {isSelected && !isResolved && (
                        <span className="text-blue-600 dark:text-blue-400 text-sm">
                          Your pick
                        </span>
                      )}
                      {isCorrect && (
                        <span className="text-green-600 dark:text-green-400 text-sm">
                          ✓ Correct
                        </span>
                      )}
                      {isWrong && (
                        <span className="text-red-600 dark:text-red-400 text-sm">
                          ✗ Wrong
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {submitting === prop.id && (
              <p className="text-sm text-zinc-500 mt-2">Saving...</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
