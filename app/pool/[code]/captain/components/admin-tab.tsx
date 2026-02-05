'use client';

import { Spinner } from '@/app/components/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Plus, Trash2, Check, Lock, Trophy } from 'lucide-react';
import type { Prop } from '../types';

interface AdminActionsReturn {
  isLocking: boolean;
  isCompleting: boolean;
  resolvingPropId: string | null;
  handleLockPool: () => void;
  handleCompletePool: () => void;
  handleResolve: (propId: string, optionIndex: number) => void;
}

interface AddPropFormReturn {
  questionText: string;
  options: string[];
  pointValue: string;
  isAddingProp: boolean;
  setQuestionText: (value: string) => void;
  setPointValue: (value: string) => void;
  addOption: () => void;
  updateOption: (index: number, value: string) => void;
  removeOption: (index: number) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

interface AdminTabProps {
  poolStatus: string;
  propsList: Prop[];
  adminActions: AdminActionsReturn;
  addPropForm: AddPropFormReturn;
}

export function AdminTab({
  poolStatus,
  propsList,
  adminActions,
  addPropForm,
}: AdminTabProps) {
  const {
    isLocking,
    isCompleting,
    resolvingPropId,
    handleLockPool,
    handleCompletePool,
    handleResolve,
  } = adminActions;

  const {
    questionText,
    options,
    pointValue,
    isAddingProp,
    setQuestionText,
    setPointValue,
    addOption,
    updateOption,
    removeOption,
    handleSubmit: handleAddProp,
  } = addPropForm;
  return (
    <>
      {/* Pool Status Actions */}
      {poolStatus === 'open' && (
        <div className="mb-6">
          <Button
            onClick={handleLockPool}
            disabled={isLocking}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLocking && <Spinner size="sm" />}
            <Lock className="h-4 w-4" />
            {isLocking ? 'Locking...' : 'Lock Pool'}
          </Button>
        </div>
      )}

      {poolStatus === 'locked' && (
        <div className="mb-6">
          <Button
            onClick={handleCompletePool}
            disabled={isCompleting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isCompleting && <Spinner size="sm" />}
            <Trophy className="h-4 w-4" />
            {isCompleting ? 'Completing...' : 'Complete Pool'}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Mark all props as resolved before completing the pool to finalize scores.
          </p>
        </div>
      )}

      {/* Add Prop Form */}
      {poolStatus === 'open' && (
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle>Add New Prop</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProp} className="space-y-4">
              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Who will score the first touchdown?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeOption(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button type="button" variant="ghost" onClick={addOption} className="text-primary">
                    <Plus className="h-4 w-4" /> Add Option
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Point Value</Label>
                <Input
                  type="number"
                  value={pointValue}
                  onChange={(e) => setPointValue(e.target.value)}
                  min="1"
                  required
                  className="w-32"
                />
              </div>

              <Button type="submit" disabled={isAddingProp}>
                {isAddingProp && <Spinner size="sm" />}
                {isAddingProp ? 'Adding...' : 'Add Prop'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Props List */}
      {propsList.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Props ({propsList.length})</h2>
          {propsList.map((prop) => (
            <Card key={prop.id} className="shadow-lg">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-foreground">{prop.questionText}</h3>
                  <span className="text-sm text-muted-foreground">{prop.pointValue} pts</span>
                </div>

                <div className="space-y-2 mb-4">
                  {prop.options.map((option, index) => {
                    const isCorrect = prop.correctOptionIndex === index;
                    const isResolved = prop.correctOptionIndex !== null;

                    return (
                      <div
                        key={index}
                        className={`px-4 py-2 rounded-lg border ${
                          isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-border'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={isCorrect ? 'text-emerald-800' : 'text-foreground'}>
                            {option}
                          </span>
                          {isCorrect && (
                            <span className="text-emerald-600 text-sm flex items-center gap-1">
                              <Check className="h-4 w-4" /> Correct
                            </span>
                          )}
                          {poolStatus === 'locked' && !isResolved && (
                            <Button
                              size="sm"
                              onClick={() => handleResolve(prop.id, index)}
                              disabled={resolvingPropId === prop.id}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              {resolvingPropId === prop.id ? '...' : 'Mark Correct'}
                            </Button>
                          )}
                          {poolStatus === 'locked' && isResolved && !isCorrect && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(prop.id, index)}
                              disabled={resolvingPropId === prop.id}
                            >
                              {resolvingPropId === prop.id ? '...' : 'Change'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {prop.correctOptionIndex !== null && (
                  <p className="text-sm text-emerald-600 flex items-center gap-1">
                    <Check className="h-4 w-4" /> Resolved
                    {poolStatus === 'locked' && (
                      <span className="text-muted-foreground ml-2">(can be changed)</span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {propsList.length === 0 && (
        <Card className="shadow-lg">
          <CardContent className="py-6">
            <p className="text-muted-foreground text-center">No props yet. Add your first prop above!</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
