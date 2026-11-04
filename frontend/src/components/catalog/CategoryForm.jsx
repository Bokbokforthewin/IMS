import React from 'react';
import { Tag, AlignLeft, Save, FolderPlus } from 'lucide-react';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function CategoryForm({ categoryForm, setCategoryForm, handleApiCall }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleApiCall('/categories', categoryForm, () => setCategoryForm({ name: '', description: '' }));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
      {/* Prominent Task / Form Title Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <FolderPlus className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Create New Category
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup className="space-y-4">
          <Field>
            <FieldLabel htmlFor="category_name" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Tag className="w-4 h-4 text-muted-foreground" />
              Category Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="category_name"
              type="text"
              required
              placeholder="e.g., Office Supplies, IT Equipment"
              value={categoryForm.name || ''}
              onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="mt-1.5 w-full"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="category_description" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
              Description
            </FieldLabel>
            <Textarea
              id="category_description"
              rows={3}
              placeholder="Brief category description..."
              value={categoryForm.description || ''}
              onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className="mt-1.5 w-full resize-none"
            />
          </Field>
        </FieldGroup>

        <div className="pt-2">
          <Button type="submit" className="w-full sm:w-auto min-w-[140px] flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            Save Category
          </Button>
        </div>
      </form>
    </div>
  );
}