'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Prop {
  id: string;
  questionText: string;
  options: string[];
  pointValue: number;
  correctOptionIndex: number | null;
  status: string;
  order: number;
}

interface CaptainClientProps {
  code: string;
  secret: string;
  poolStatus: string;
  propsList: Prop[];
}

export function CaptainClient({
  code,
  secret,
  poolStatus,
  propsList,
}: CaptainClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');

  // Add Prop form state
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pointValue, setPointValue] = useState('10');
  const [isAddingProp, setIsAddingProp] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [resolvingPropId, setResolvingPropId] = useState<string | null>(null);

  async function handleAddProp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsAddingProp(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}/props?secret=${secret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          options: options.filter((o) => o.trim() !== ''),
          pointValue: parseInt(pointValue, 10),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to add prop');
        return;
      }

      // Clear form and refresh
      setQuestionText('');
      setOptions(['', '']);
      setPointValue('10');
      router.refresh();
    } catch (err) {
      setError('Failed to add prop');
    } finally {
      setIsAddingProp(false);
    }
  }

  async function handleLockPool() {
    setIsLocking(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}?secret=${secret}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to lock pool');
        return;
      }

      router.refresh();
    } catch (err) {
      setError('Failed to lock pool');
    } finally {
      setIsLocking(false);
    }
  }

  async function handleResolve(propId: string, correctOptionIndex: number) {
    setResolvingPropId(propId);
    setError('');

    try {
      const response = await fetch(
        `/api/pools/${code}/props/${propId}/resolve?secret=${secret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correctOptionIndex }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to resolve prop');
        return;
      }

      router.refresh();
    } catch (err) {
      setError('Failed to resolve prop');
    } finally {
      setResolvingPropId(null);
    }
  }

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

  return (
    <>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Lock Pool Button */}
      {poolStatus === 'open' && (
        <div className="mb-6">
          <button
            onClick={handleLockPool}
            disabled={isLocking}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {isLocking ? 'Locking...' : 'Lock Pool'}
          </button>
        </div>
      )}

      {/* Add Prop Form (only when pool is open) */}
      {poolStatus === 'open' && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Add New Prop
          </h2>
          <form onSubmit={handleAddProp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Question
              </label>
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Who will score the first touchdown?"
                required
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Options
              </label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required
                    className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + Add Option
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Point Value
              </label>
              <input
                type="number"
                value={pointValue}
                onChange={(e) => setPointValue(e.target.value)}
                min="1"
                required
                className="w-32 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isAddingProp}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {isAddingProp ? 'Adding...' : 'Add Prop'}
            </button>
          </form>
        </div>
      )}

      {/* Props List */}
      {propsList.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Props ({propsList.length})
          </h2>
          {propsList.map((prop) => (
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

              <div className="space-y-2 mb-4">
                {prop.options.map((option, index) => {
                  const isCorrect = prop.correctOptionIndex === index;
                  const isResolved = prop.correctOptionIndex !== null;

                  return (
                    <div
                      key={index}
                      className={`px-4 py-2 rounded-lg border ${
                        isCorrect
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={
                            isCorrect
                              ? 'text-green-800 dark:text-green-400'
                              : 'text-zinc-900 dark:text-white'
                          }
                        >
                          {option}
                        </span>
                        {isCorrect && (
                          <span className="text-green-600 dark:text-green-400 text-sm">
                            ✓ Correct
                          </span>
                        )}
                        {/* Resolve button (only for locked pool, unresolved props) */}
                        {poolStatus === 'locked' && !isResolved && (
                          <button
                            onClick={() => handleResolve(prop.id, index)}
                            disabled={resolvingPropId === prop.id}
                            className="text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded"
                          >
                            {resolvingPropId === prop.id ? '...' : 'Mark Correct'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {prop.correctOptionIndex !== null && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  ✓ Resolved
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {propsList.length === 0 && poolStatus === 'open' && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
          <p className="text-zinc-600 dark:text-zinc-400 text-center">
            No props yet. Add your first prop above!
          </p>
        </div>
      )}
    </>
  );
}
