'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { PropCard } from './prop-card';
import { AddPropForm } from './add-prop-form';
import type { Prop } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function groupPropsByCategory(props: Prop[]): { category: string | null; props: Prop[] }[] {
  const groups: Map<string | null, Prop[]> = new Map();
  for (const prop of props) {
    const key = prop.category || null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(prop);
  }
  const result: { category: string | null; props: Prop[] }[] = [];
  const uncategorized = groups.get(null);
  if (uncategorized) result.push({ category: null, props: uncategorized });
  for (const [key, value] of groups) {
    if (key !== null) result.push({ category: key, props: value });
  }
  return result;
}

interface SortablePropCardProps {
  prop: Prop;
  poolStatus: string;
  editProp: EditPropReturn;
  adminActions: AdminActionsReturn;
  existingCategories: string[];
  isDndEnabled: boolean;
}

function SortablePropCard({ prop, poolStatus, editProp, adminActions, existingCategories, isDndEnabled }: SortablePropCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prop.id, disabled: !isDndEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // For drag-handle pattern: attributes + listeners go on the handle, not the wrapper
  const handleProps = isDndEnabled
    ? { ...listeners, ...attributes }
    : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      <PropCard
        prop={prop}
        poolStatus={poolStatus}
        isEditing={editProp.editingPropId === prop.id}
        editForm={editProp.editForm}
        isSaving={editProp.isSaving}
        hasPicksWarning={editProp.hasPicksWarning}
        resolvingPropId={adminActions.resolvingPropId}
        deletingPropId={adminActions.deletingPropId}
        existingCategories={existingCategories}
        dragHandleProps={handleProps}
        onStartEditing={editProp.startEditing}
        onCancelEditing={editProp.cancelEditing}
        onSaveChanges={editProp.saveChanges}
        onResolve={adminActions.handleResolve}
        onDelete={adminActions.handleDeleteProp}
        onQuestionChange={editProp.setQuestionText}
        onPointValueChange={editProp.setPointValue}
        onCategoryChange={editProp.setCategory}
        onAddOption={editProp.addOption}
        onUpdateOption={editProp.updateOption}
        onRemoveOption={editProp.removeOption}
      />
    </div>
  );
}

interface AdminActionsReturn {
  isLocking: boolean;
  isCompleting: boolean;
  resolvingPropId: string | null;
  deletingPropId: string | null;
  handleLockPool: () => void;
  handleCompletePool: () => void;
  handleResolve: (propId: string, optionIndex: number) => void;
  handleDeleteProp: (propId: string) => void;
}

interface AddPropFormReturn {
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
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

interface EditFormState {
  questionText: string;
  options: string[];
  pointValue: string;
  category: string;
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
  setCategory: (value: string) => void;
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
  existingCategories: string[];
  onDragEnd: (event: DragEndEvent) => void;
}

export function AdminTab({
  poolStatus,
  propsList,
  adminActions,
  addPropForm,
  editProp,
  existingCategories,
  onDragEnd,
}: AdminTabProps) {
  const grouped = groupPropsByCategory(propsList);
  const isDndEnabled = poolStatus === 'open';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const propsContent = (
    <>
      {grouped.map((group) => (
        <div key={group.category ?? '__uncategorized'}>
          {group.category && (
            <div className="flex items-center gap-2 mt-4 mb-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-medium text-muted-foreground px-2">{group.category}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          <div className="space-y-4">
            {group.props.map((prop) => (
              <SortablePropCard
                key={prop.id}
                prop={prop}
                poolStatus={poolStatus}
                editProp={editProp}
                adminActions={adminActions}
                existingCategories={existingCategories}
                isDndEnabled={isDndEnabled}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );

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
          <DndContext
            sensors={isDndEnabled ? sensors : []}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={propsList.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {propsContent}
            </SortableContext>
          </DndContext>
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
          category={addPropForm.category}
          existingCategories={existingCategories}
          isAddingProp={addPropForm.isAddingProp}
          onOpenChange={addPropForm.setIsFormOpen}
          onQuestionChange={addPropForm.setQuestionText}
          onPointValueChange={addPropForm.setPointValue}
          onCategoryChange={addPropForm.setCategory}
          onAddOption={addPropForm.addOption}
          onUpdateOption={addPropForm.updateOption}
          onRemoveOption={addPropForm.removeOption}
          onSubmit={addPropForm.handleSubmit}
        />
      )}
    </>
  );
}
