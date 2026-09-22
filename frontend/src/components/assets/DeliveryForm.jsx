import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const API_BASE_URL = '/api/v1';

export default function DeliveryForm({ cart, handleApiCall, onBack, onSuccess }) {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [issuedById, setIssuedById] = useState('');
  const [dateIssued, setDateIssued] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/users`);
    setUsers(await res.json());
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      cart: cart.map(c => ({
        key: c.key,
        serialized_asset_id: c.serialized_asset_id,
        attach_to_key: c.attachToKey || undefined,
      })),
      user_id: userId,
      issued_by_id: issuedById,
      date_issued: dateIssued,
      remarks,
    };

    handleApiCall('/accountability/issue-asset', payload, () => {
      onSuccess();
    }).finally(() => setSubmitting(false));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold mb-4">Delivery Details</h2>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="user_id">Issue To *</FieldLabel>
          <select id="user_id" required value={userId} onChange={e => setUserId(e.target.value)} className="border rounded-md h-9 px-2">
            <option value="">Select employee...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.designation}</option>)}
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="issued_by_id">Issued By (You) *</FieldLabel>
          <select id="issued_by_id" required value={issuedById} onChange={e => setIssuedById(e.target.value)} className="border rounded-md h-9 px-2">
            <option value="">Select your name...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="date_issued">Date Issued *</FieldLabel>
          <Input id="date_issued" type="date" required value={dateIssued} onChange={e => setDateIssued(e.target.value)} />
        </Field>

        <Field>
          <FieldLabel htmlFor="remarks">Remarks</FieldLabel>
          <Input id="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />
        </Field>
      </FieldGroup>

      <div className="flex gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Processing...' : 'Confirm & Generate Receipt'}
        </Button>
      </div>
    </form>
  );
}