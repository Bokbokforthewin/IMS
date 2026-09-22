import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SerialNumberScanner({ quantity, serials, onChange }) {
  const [current, setCurrent] = useState('');

  const addSerial = () => {
    const value = current.trim();
    if (!value || serials.length >= quantity) return;
    onChange([...serials, value]);
    setCurrent('');
  };

  const removeSerial = (index) => {
    onChange(serials.filter((_, i) => i !== index));
  };

  const remaining = quantity - serials.length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Input
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSerial();
            }
          }}
          placeholder={remaining > 0 ? `Scan or type serial number (${remaining} remaining)` : 'All serial numbers entered'}
          disabled={remaining <= 0}
          autoFocus
        />
        <Button type="button" onClick={addSerial} disabled={!current.trim() || remaining <= 0}>
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {serials.map((s, i) => (
          <Badge key={i} variant="secondary" className="gap-1">
            {i + 1}. {s}
            <button type="button" onClick={() => removeSerial(i)} className="ml-1 text-muted-foreground hover:text-destructive">
              ✕
            </button>
          </Badge>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-1">
        {serials.length} of {quantity} entered
      </p>
    </div>
  );
}