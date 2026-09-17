import React from 'react';
import { Tag, AlignLeft, Save } from 'lucide-react';
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
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="category_name" className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            Category Name *
          </FieldLabel>
          <Input
            id="category_name"
            type="text"
            required
            value={categoryForm.name || ''}
            onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="category_description" className="flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-muted-foreground" />
            Description
          </FieldLabel>
          <Textarea
            id="category_description"
            rows={3}
            placeholder="Brief category description..."
            value={categoryForm.description || ''}
            onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
          />
        </Field>
      </FieldGroup>

      <Button type="submit" className="mt-4 flex items-center gap-2">
        <Save className="w-4 h-4" />
        Save
      </Button>
    </form>
  );
}