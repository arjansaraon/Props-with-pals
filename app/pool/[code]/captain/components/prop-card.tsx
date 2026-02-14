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
import { Plus, Trash2, Check, Pencil, AlertTriangle, GripVertical, X } from 'lucide-react';
import type { Prop } from '@/app/types/domain';

interface EditFormState {
  questionText: string;
  options: string[];
  pointValue: string;
  category: string;
}

interface PropCardProps {
  prop: Prop;
  poolStatus: string;
  isEditing: boolean;
  editForm: EditFormState;
  isSaving: boolean;
  hasPicksWarning: boolean;
  resolvingPropId: string | null;
  deletingPropId: string | null;
  existingCategories?: string[];
  dragHandleProps?: Record<string, unknown>;
  onStartEditing: (prop: Prop) => Promise<void>;
  onCancelEditing: () => void;
  onSaveChanges: () => Promise<void>;
  onResolve: (propId: string, optionIndex: number) => void;
  onDelete: (propId: string) => void;
  onQuestionChange: (value: string) => void;
  onPointValueChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
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
  deletingPropId,
  existingCategories = [],
  dragHandleProps,
  onStartEditing,
  onCancelEditing,
  onSaveChanges,
  onResolve,
  onDelete,
  onQuestionChange,
  onPointValueChange,
  onCategoryChange,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleConfirmResolve = () => {
    onResolve(prop.id, confirmDialog.optionIndex);
    setConfirmDialog({ isOpen: false, optionIndex: -1, optionText: '', isChange: false });
  };

  if (isEditing) {
    return (
      <Card className="shadow-md">
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
              <Label>Category (Optional)</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  placeholder="e.g., First Quarter, Halftime"
                  list="edit-category-suggestions"
                  maxLength={50}
                  className={editForm.category ? 'pr-8' : ''}
                />
                {editForm.category && (
                  <button
                    type="button"
                    onClick={() => onCategoryChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {existingCategories.length > 0 && (
                <datalist id="edit-category-suggestions">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              )}
            </div>

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
    <Card className="shadow-md">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {dragHandleProps && (
              <button
                type="button"
                className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
                {...dragHandleProps}
              >
                <GripVertical className="h-5 w-5" />
              </button>
            )}
            <h3 className="text-lg font-medium text-foreground">{prop.questionText}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">{prop.pointValue} pts</span>
            {poolStatus === 'open' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStartEditing(prop)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deletingPropId === prop.id}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
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

        {/* Resolve Confirmation Dialog */}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete prop?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>&quot;{prop.questionText}&quot;</strong> and any picks players have made for it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(prop.id);
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
