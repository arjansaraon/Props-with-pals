'use client';

import { useState } from 'react';
import { Spinner } from '@/app/components/spinner';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Plus, Trash2, Check, Pencil, AlertTriangle } from 'lucide-react';
import type { Prop } from '@/app/types/domain';

interface EditFormState {
  questionText: string;
  options: string[];
  pointValue: string;
}

interface PropCardProps {
  prop: Prop;
  poolStatus: string;
  isEditing: boolean;
  editForm: EditFormState;
  isSaving: boolean;
  hasPicksWarning: boolean;
  resolvingPropId: string | null;
  onStartEditing: (prop: Prop) => Promise<void>;
  onCancelEditing: () => void;
  onSaveChanges: () => Promise<void>;
  onResolve: (propId: string, optionIndex: number) => void;
  onQuestionChange: (value: string) => void;
  onPointValueChange: (value: string) => void;
  onAddOption: () => void;
  onUpdateOption: (index: number, value: string) => void;
  onRemoveOption: (index: number) => void;
}

export function PropCard({
  prop,
  poolStatus,
  isEditing,
  editForm,
  isSaving,
  hasPicksWarning,
  resolvingPropId,
  onStartEditing,
  onCancelEditing,
  onSaveChanges,
  onResolve,
  onQuestionChange,
  onPointValueChange,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: PropCardProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    optionIndex: number;
    optionText: string;
    isChange: boolean;
  }>({ isOpen: false, optionIndex: -1, optionText: '', isChange: false });

  const handleConfirmResolve = () => {
    onResolve(prop.id, confirmDialog.optionIndex);
    setConfirmDialog({ isOpen: false, optionIndex: -1, optionText: '', isChange: false });
  };

  if (isEditing) {
    return (
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {hasPicksWarning && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Players have already made picks for this prop. Editing may affect their selections.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                type="text"
                value={editForm.questionText}
                onChange={(e) => onQuestionChange(e.target.value)}
                placeholder="Who will score the first touchdown?"
              />
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              {editForm.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    value={option}
                    onChange={(e) => onUpdateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    aria-label={`Option ${index + 1}`}
                  />
                  {editForm.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onRemoveOption(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {editForm.options.length < 10 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onAddOption}
                  className="text-primary"
                >
                  <Plus className="h-4 w-4" /> Add Option
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Point Value</Label>
              <Input
                type="number"
                value={editForm.pointValue}
                onChange={(e) => onPointValueChange(e.target.value)}
                min="1"
                className="w-32"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancelEditing}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={onSaveChanges}
                disabled={isSaving}
              >
                {isSaving && <Spinner size="sm" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // View mode
  return (
    <Card className="shadow-lg">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-foreground">{prop.questionText}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{prop.pointValue} pts</span>
            {poolStatus === 'open' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStartEditing(prop)}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
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
                      onClick={() => setConfirmDialog({
                        isOpen: true,
                        optionIndex: index,
                        optionText: option,
                        isChange: false,
                      })}
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
                      onClick={() => setConfirmDialog({
                        isOpen: true,
                        optionIndex: index,
                        optionText: option,
                        isChange: true,
                      })}
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

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog({ isOpen: false, optionIndex: -1, optionText: '', isChange: false })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.isChange ? 'Change correct answer?' : 'Mark as correct answer?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.isChange ? (
                  <>
                    This will change the correct answer to <strong>&quot;{confirmDialog.optionText}&quot;</strong> and recalculate all player scores.
                  </>
                ) : (
                  <>
                    This will mark <strong>&quot;{confirmDialog.optionText}&quot;</strong> as the correct answer. Player scores will be updated accordingly.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmResolve}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {confirmDialog.isChange ? 'Change Answer' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
