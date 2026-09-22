import React, { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function EditReorderLevelModal({ isOpen, onClose, item, onSaved }) {
  const [reorderLevel, setReorderLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (item) {
      setReorderLevel(item.reorder_level ?? '');
      setError(null);
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ reorder_level: reorderLevel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update reorder level.');
        return;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError('Network error while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={`Edit Reorder Level — ${item.name}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reorder_level">Reorder Level</FieldLabel>
              <Input
                id="reorder_level"
                type="number"
                min="0"
                required
                placeholder="e.g., 10"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
              <FieldDescription>
                Item will be flagged &quot;Low Stock&quot; once quantity on hand falls to or below this number.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Reorder Level'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}