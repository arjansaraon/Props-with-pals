'use client';

import { Spinner } from '@/app/components/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface AddPropFormProps {
  isOpen: boolean;
  questionText: string;
  options: string[];
  pointValue: string;
  category: string;
  existingCategories: string[];
  isAddingProp: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionChange: (value: string) => void;
  onPointValueChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAddOption: () => void;
  onUpdateOption: (index: number, value: string) => void;
  onRemoveOption: (index: number) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function AddPropForm({
  isOpen,
  questionText,
  options,
  pointValue,
  category,
  existingCategories,
  isAddingProp,
  onOpenChange,
  onQuestionChange,
  onPointValueChange,
  onCategoryChange,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onSubmit,
}: AddPropFormProps) {
  if (!isOpen) {
    return (
      <Button onClick={() => onOpenChange(true)} variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Add Prop
      </Button>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Add New Prop</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              type="text"
              value={questionText}
              onChange={(e) => onQuestionChange(e.target.value)}
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
                  onChange={(e) => onUpdateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  aria-label={`Option ${index + 1}`}
                  required
                />
                {options.length > 2 && (
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
            {options.length < 10 && (
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
              value={pointValue}
              onChange={(e) => onPointValueChange(e.target.value)}
              min="1"
              required
              className="w-32"
            />
          </div>

          <div className="space-y-2">
            <Label>Category (Optional)</Label>
            <Input
              type="text"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              placeholder="e.g., First Quarter, Halftime"
              list="category-suggestions"
              maxLength={50}
            />
            {existingCategories.length > 0 && (
              <datalist id="category-suggestions">
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            )}
          </div>

          <Button type="submit" disabled={isAddingProp}>
            {isAddingProp && <Spinner size="sm" />}
            {isAddingProp ? 'Adding...' : 'Add Prop'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
