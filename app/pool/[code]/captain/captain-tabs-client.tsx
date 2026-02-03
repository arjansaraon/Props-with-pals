'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TabToggle } from '@/app/components/tab-toggle';
import { Spinner } from '@/app/components/spinner';
import { useToast } from '@/app/components/toast';

interface Prop {
  id: string;
  questionText: string;
  options: string[];
  pointValue: number;
  correctOptionIndex: number | null;
  status: string;
  order: number;
}

interface CaptainTabsClientProps {
  code: string;
  poolStatus: string;
  propsList: Prop[];
  initialPicks: { propId: string; selectedOptionIndex: number }[];
}

const TABS = [
  { id: 'admin', label: 'Admin' },
  { id: 'picks', label: 'My Picks' },
];

export function CaptainTabsClient({
  code,
  poolStatus,
  propsList,
  initialPicks,
}: CaptainTabsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('admin');
  const [error, setError] = useState('');

  // Admin state
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pointValue, setPointValue] = useState('10');
  const [isAddingProp, setIsAddingProp] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [resolvingPropId, setResolvingPropId] = useState<string | null>(null);

  // Picks state
  const [myPicks, setMyPicks] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    initialPicks.forEach((p) => map.set(p.propId, p.selectedOptionIndex));
    return map;
  });
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Admin handlers
  async function handleAddProp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsAddingProp(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}/props`, {
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

      setQuestionText('');
      setOptions(['', '']);
      setPointValue('10');
      showToast('Prop added successfully', 'success');
      router.refresh();
    } catch {
      setError('Failed to add prop. Please try again.');
    } finally {
      setIsAddingProp(false);
    }
  }

  async function handleOpenPool() {
    setIsOpening(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to open pool');
        return;
      }

      showToast('Pool is now open for participants!', 'success');
      router.refresh();
    } catch {
      setError('Failed to open pool. Please try again.');
    } finally {
      setIsOpening(false);
    }
  }

  async function handleLockPool() {
    setIsLocking(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to lock pool');
        return;
      }

      showToast('Pool is now locked', 'success');
      router.refresh();
    } catch {
      setError('Failed to lock pool. Please try again.');
    } finally {
      setIsLocking(false);
    }
  }

  async function handleResolve(propId: string, correctOptionIndex: number) {
    setResolvingPropId(propId);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}/props/${propId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctOptionIndex }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to resolve prop');
        return;
      }

      showToast('Prop resolved! Points have been awarded.', 'success');
      router.refresh();
    } catch {
      setError('Failed to resolve prop. Please try again.');
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

  // Picks handler
  async function handlePick(propId: string, selectedOptionIndex: number) {
    if (poolStatus !== 'open') return;

    setSubmitting(propId);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}/picks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propId, selectedOptionIndex }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to submit pick');
        return;
      }

      setMyPicks((prev) => new Map(prev).set(propId, selectedOptionIndex));
      showToast('Pick saved!', 'success');
    } catch {
      setError('Failed to submit pick. Please try again.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      {/* Tab Toggle */}
      <div className="mb-6">
        <TabToggle tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Admin View */}
      {activeTab === 'admin' && (
        <>
          {/* Pool Status Actions */}
          {poolStatus === 'draft' && (
            <div className="mb-6">
              <button
                onClick={handleOpenPool}
                disabled={isOpening || propsList.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                {isOpening && <Spinner size="sm" />}
                {isOpening ? 'Opening...' : 'Open Pool for Participants'}
              </button>
              {propsList.length === 0 && (
                <p className="text-sm text-zinc-500 mt-2">Add at least one prop before opening</p>
              )}
            </div>
          )}

          {poolStatus === 'open' && (
            <div className="mb-6">
              <button
                onClick={handleLockPool}
                disabled={isLocking}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                {isLocking && <Spinner size="sm" />}
                {isLocking ? 'Locking...' : 'Lock Pool'}
              </button>
            </div>
          )}

          {/* Add Prop Form (draft or open) */}
          {(poolStatus === 'draft' || poolStatus === 'open') && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 mb-6">
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
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
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
                          className="px-3 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
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
                    className="w-full sm:w-32 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAddingProp}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {isAddingProp && <Spinner size="sm" />}
                  {isAddingProp ? 'Adding...' : 'Add Prop'}
                </button>
              </form>
            </div>
          )}

          {/* Props List (Admin View) */}
          {propsList.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Props ({propsList.length})
              </h2>
              {propsList.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6"
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
                            {poolStatus === 'locked' && !isResolved && (
                              <button
                                onClick={() => handleResolve(prop.id, index)}
                                disabled={resolvingPropId === prop.id}
                                className="text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded"
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
                    <p className="text-sm text-green-600 dark:text-green-400">✓ Resolved</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {propsList.length === 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6">
              <p className="text-zinc-600 dark:text-zinc-400 text-center">
                No props yet. Add your first prop above!
              </p>
            </div>
          )}
        </>
      )}

      {/* My Picks View */}
      {activeTab === 'picks' && (
        <div className="space-y-4">
          {poolStatus !== 'open' && poolStatus !== 'draft' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 p-4 rounded-lg">
              {poolStatus === 'locked'
                ? 'This pool is locked. Picks can no longer be changed.'
                : 'This pool is completed. Check the leaderboard for results!'}
            </div>
          )}

          {poolStatus === 'draft' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 p-4 rounded-lg">
              Open the pool to start making picks.
            </div>
          )}

          {propsList.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
              <p className="text-zinc-600 dark:text-zinc-400 text-center">
                No props have been added yet.
              </p>
            </div>
          ) : (
            propsList.map((prop) => {
              const myPick = myPicks.get(prop.id);
              const isResolved = prop.correctOptionIndex !== null;

              return (
                <div
                  key={prop.id}
                  className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6"
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
                          } ${poolStatus !== 'open' ? 'cursor-default' : 'cursor-pointer'}`}
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
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mt-2">
                      <Spinner size="sm" />
                      <span>Saving...</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
