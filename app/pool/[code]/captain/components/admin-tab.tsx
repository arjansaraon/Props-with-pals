'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { PropCard } from './prop-card';
import { AddPropForm } from './add-prop-form';
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
  isFormOpen: boolean;
  setQuestionText: (value: string) => void;
  setPointValue: (value: string) => void;
  setIsFormOpen: (value: boolean) => void;
  addOption: () => void;
  updateOption: (index: number, value: string) => void;
  removeOption: (index: number) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

interface EditFormState {
  questionText: string;
  options: string[];
  pointValue: string;
}

interface EditPropReturn {
  editingPropId: string | null;
  editForm: EditFormState;
  isSaving: boolean;
  hasPicksWarning: boolean;
  startEditing: (prop: Prop) => Promise<void>;
  cancelEditing: () => void;
  setQuestionText: (value: string) => void;
  setPointValue: (value: string) => void;
  addOption: () => void;
  updateOption: (index: number, value: string) => void;
  removeOption: (index: number) => void;
  saveChanges: () => Promise<void>;
}

interface AdminTabProps {
  poolStatus: string;
  propsList: Prop[];
  adminActions: AdminActionsReturn;
  addPropForm: AddPropFormReturn;
  editProp: EditPropReturn;
}

export function AdminTab({
  poolStatus,
  propsList,
  adminActions,
  addPropForm,
  editProp,
}: AdminTabProps) {
  return (
    <>
      {/* Section Heading */}
      <h2 className="text-lg font-semibold mb-4">Manage Props</h2>

      {poolStatus === 'locked' && (
        <p className="text-sm text-muted-foreground mb-6">
          Mark all props as resolved before completing the pool to finalize scores.
        </p>
      )}

      {/* Props List */}
      {propsList.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground">Props ({propsList.length})</h2>
          {propsList.map((prop) => (
            <PropCard
              key={prop.id}
              prop={prop}
              poolStatus={poolStatus}
              isEditing={editProp.editingPropId === prop.id}
              editForm={editProp.editForm}
              isSaving={editProp.isSaving}
              hasPicksWarning={editProp.hasPicksWarning}
              resolvingPropId={adminActions.resolvingPropId}
              onStartEditing={editProp.startEditing}
              onCancelEditing={editProp.cancelEditing}
              onSaveChanges={editProp.saveChanges}
              onResolve={adminActions.handleResolve}
              onQuestionChange={editProp.setQuestionText}
              onPointValueChange={editProp.setPointValue}
              onAddOption={editProp.addOption}
              onUpdateOption={editProp.updateOption}
              onRemoveOption={editProp.removeOption}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {propsList.length === 0 && poolStatus === 'open' && (
        <Card className="shadow-lg mb-6">
          <CardContent className="py-6">
            <p className="text-muted-foreground text-center">No props yet. Add your first prop below!</p>
          </CardContent>
        </Card>
      )}

      {/* Add Prop Form */}
      {poolStatus === 'open' && (
        <AddPropForm
          isOpen={addPropForm.isFormOpen}
          questionText={addPropForm.questionText}
          options={addPropForm.options}
          pointValue={addPropForm.pointValue}
          isAddingProp={addPropForm.isAddingProp}
          onOpenChange={addPropForm.setIsFormOpen}
          onQuestionChange={addPropForm.setQuestionText}
          onPointValueChange={addPropForm.setPointValue}
          onAddOption={addPropForm.addOption}
          onUpdateOption={addPropForm.updateOption}
          onRemoveOption={addPropForm.removeOption}
          onSubmit={addPropForm.handleSubmit}
        />
      )}
    </>
  );
}
