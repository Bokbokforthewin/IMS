import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function EditReceivedItemModal({ isOpen, onClose, row, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!row) return;
    if (row.type === 'Consumable') {
      setForm({
        iar_number: row.reference_no || '',
        received_date: row.received_at ? row.received_at.substring(0, 10) : '',
        quantity_on_hand: row.quantity ?? '',
        unit_cost: row.unit_cost ?? '',
      });
    } else {
      setForm({
        serial_number: row.serial_number || '',
        model: row.model || '',
        unit_cost: row.unit_cost ?? '',
      });
    }
    setError(null);
  }, [row]);

  if (!row) return null;

  const isConsumable = row.type === 'Consumable';
  const endpoint = isConsumable
    ? `/inventory/stock-batches/${row.id}`
    : `/inventory/serialized-assets/${row.id}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save changes.');
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>
              Edit {isConsumable ? 'Stock Batch' : 'Serialized Asset'}
            </DialogTitle>
            <DialogDescription>
              Make changes to the received item details below and click save.
            </DialogDescription>
          </DialogHeader>

          {/* Error Alert */}
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <FieldGroup className="space-y-4">
            {isConsumable ? (
              <>
                <Field>
                  <FieldLabel htmlFor="iar_number">IAR Number</FieldLabel>
                  <Input
                    id="iar_number"
                    type="text"
                    required
                    value={form.iar_number || ''}
                    onChange={(e) => setForm({ ...form, iar_number: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="received_date">Received Date</FieldLabel>
                  <Input
                    id="received_date"
                    type="date"
                    required
                    value={form.received_date || ''}
                    onChange={(e) => setForm({ ...form, received_date: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="quantity_on_hand">Quantity on Hand</FieldLabel>
                  <Input
                    id="quantity_on_hand"
                    type="number"
                    min="0"
                    required
                    value={form.quantity_on_hand ?? ''}
                    onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })}
                  />
                  <FieldDescription>
                    Correcting this does not reverse or replay any past issuances.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="unit_cost">Unit Cost (₱)</FieldLabel>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.unit_cost ?? ''}
                    onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="serial_number">Serial Number</FieldLabel>
                  <Input
                    id="serial_number"
                    type="text"
                    value={form.serial_number || ''}
                    onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="model">Model</FieldLabel>
                  <Input
                    id="model"
                    type="text"
                    value={form.model || ''}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="unit_cost">Unit Cost (₱)</FieldLabel>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.unit_cost ?? ''}
                    onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                  />
                </Field>

                <p className="text-xs text-muted-foreground pt-1">
                  Property number and status are not editable here. Status changes through issuance or return workflows.
                </p>
              </>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}