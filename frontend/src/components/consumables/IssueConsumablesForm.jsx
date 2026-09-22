import React, { useState, useEffect, useCallback } from 'react';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const API_BASE_URL = '/api/v1';

export default function IssueConsumablesForm({ item, handleApiCall, onSuccess }) {
  const [form, setForm] = useState({
    item_id: item?.id || '',
    quantity_requested: '',
    issued_to_id: '',
    issuance_date: '',
    purpose: '',
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      const json = await res.json();

      let userList = [];
      if (Array.isArray(json)) {
        userList = json;
      } else if (json && Array.isArray(json.data)) {
        userList = json.data;
      }

      setUsers(userList);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Keep item_id in sync
  useEffect(() => {
    setForm((f) => ({ ...f, item_id: item?.id || '' }));
  }, [item]);

  const selectedUser = users.find((u) => String(u.id) === String(form.issued_to_id));

  // Pre-validate form before opening confirmation dialog
  const handlePreSubmit = (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!form.quantity_requested || !form.issued_to_id || !form.issuance_date) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (Number(form.quantity_requested) > Number(item?.total_stock || 0)) {
      setErrorMessage(`Requested quantity exceeds available stock (${item?.total_stock}).`);
      return;
    }

    setIsConfirmOpen(true);
  };

  const executeSubmit = async () => {
    setIsConfirmOpen(false);

    if (typeof handleApiCall !== 'function') {
      setErrorMessage('Configuration error: handleApiCall handler is missing.');
      return;
    }

    setLoading(true);
    try {
      await handleApiCall('/consumables/issue', form, (res) => {
        if (res?.message) {
          setSuccessMessage(res.message);
        }
        setForm({
          item_id: item?.id || '',
          quantity_requested: '',
          issued_to_id: '',
          issuance_date: '',
          purpose: '',
        });
        if (typeof onSuccess === 'function') onSuccess();
      });
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to process issuance.');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <div className="space-y-6">
      {/* Alert Notifications */}
      {errorMessage && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600 font-medium">
          {successMessage}
        </div>
      )}

      {/* Target Item Card Summary */}
      <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Issuing Item</span>
        <h4 className="text-base font-semibold">{item.name}</h4>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">[{item.item_code}]</span> &mdash; Available: <strong className="text-foreground">{item.total_stock} {item.unit_of_measure}</strong>
        </p>
      </div>

      <form onSubmit={handlePreSubmit}>
        <FieldGroup className="space-y-4">
          {/* Quantity Field */}
          <Field>
            <FieldLabel htmlFor="quantity_requested">Quantity to Issue</FieldLabel>
            <Input
              id="quantity_requested"
              type="number"
              required
              min="1"
              max={item.total_stock}
              placeholder="e.g., 5"
              value={form.quantity_requested}
              onChange={(e) => setForm({ ...form, quantity_requested: e.target.value })}
            />
            <FieldDescription>Maximum available stock is {item.total_stock} {item.unit_of_measure}</FieldDescription>
          </Field>

          {/* Issued To Field */}
          <Field>
            <FieldLabel htmlFor="issued_to_id">Issued To</FieldLabel>
            <select
              id="issued_to_id"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.issued_to_id}
              onChange={(e) => setForm({ ...form, issued_to_id: e.target.value })}
            >
              <option value="" disabled>Select employee...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} &mdash; {u.designation}, {u.unit} / {u.division}
                </option>
              ))}
            </select>
          </Field>

          {/* Issuance Date Field */}
          <Field>
            <FieldLabel htmlFor="issuance_date">Issuance Date</FieldLabel>
            <Input
              id="issuance_date"
              type="date"
              required
              value={form.issuance_date}
              onChange={(e) => setForm({ ...form, issuance_date: e.target.value })}
            />
          </Field>

          {/* Purpose / Remarks Field */}
          <Field>
            <FieldLabel htmlFor="purpose">Purpose / Remarks (Optional)</FieldLabel>
            <Input
              id="purpose"
              type="text"
              placeholder="e.g., Monthly office supplies printing"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
          </Field>
        </FieldGroup>

        {/* Action Button & Confirmation Modal */}
        <div className="mt-6 flex justify-end">
          <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogTrigger render={
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Processing...' : 'Issue Consumables & Generate RIS'}
              </Button>
            } />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Consumable Issuance</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to issue <strong>{form.quantity_requested} {item.unit_of_measure}</strong> of <strong>{item.name}</strong> to <strong>{selectedUser?.name || 'the selected employee'}</strong>? This action will decrement inventory stock and generate a Requisition and Issue Slip (RIS).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executeSubmit}>
                  Confirm & Issue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>
    </div>
  );
}