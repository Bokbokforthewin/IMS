import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '@/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

function resolveRowDetails(row) {
  const item = row.item || {};
  const category = item.category || row.category || {};

  const categoryId =
    row.category_id ??
    row.item_category_id ??
    item.category_id ??
    category.id ??
    '';

  const categoryName =
    row.category_name ??
    row.item_category_name ??
    item.category_name ??
    category.name ??
    '';

  return {
    categoryId:
      categoryId !== null && categoryId !== undefined ? String(categoryId) : '',
    categoryName,
    brand: row.brand ?? row.item_brand ?? item.brand ?? '',
    specifications:
      row.specifications ??
      row.item_specifications ??
      item.specifications ??
      '',
    unitOfMeasure: row.unit_of_measure ?? item.unit_of_measure ?? '',
    unitCost: row.unit_cost ?? item.unit_cost ?? '',
    receivedDate: row.received_at
      ? String(row.received_at).substring(0, 10)
      : row.arrival_date
      ? String(row.arrival_date).substring(0, 10)
      : row.created_at
      ? String(row.created_at).substring(0, 10)
      : '',
    quantity: row.quantity ?? '',
    reorderLevel: row.reorder_level ?? item.reorder_level ?? '',
    model: row.model ?? item.model ?? '',
    manufacturerName:
      row.manufacturer_name ??
      row.manufacturer ??
      item.manufacturer_name ??
      item.manufacturer ??
      '',
    countryOfOrigin:
      row.country_of_origin ??
      row.origin ??
      item.country_of_origin ??
      '',
    serialNumber: row.serial_number ?? '',
    propertyNumber: row.property_number ?? '',
    assignPropertyNumber: Boolean(
      row.assign_property_number ?? row.property_number
    ),
    trackSerialNumbers: Boolean(
      row.track_serial_numbers ?? row.serial_number
    ),
    photoUrl:
      row.item_image_url || row.image_url || item.image_url || '',
  };
}

export default function EditReceivedItemModal({
  isOpen,
  onClose,
  row,
  onSaved,
  mode = 'single', // 'single' | 'shared'
  targetIds = [],
}) {
  const [form, setForm] = useState({});
  const [categories, setCategories] = useState([]);
  const [fallbackCategory, setFallbackCategory] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isConsumable = row?.type === 'Consumable';
  const isSharedMode = mode === 'shared';

  useEffect(() => {
    if (!isOpen || !isSharedMode) return;
    api
      .get('/v1/categories')
      .then((res) => {
        const payload = res.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.categories)
          ? payload.categories
          : [];
        setCategories(list);
      })
      .catch(() => {
        setCategories([]);
      });
  }, [isOpen, isSharedMode]);

  useEffect(() => {
    if (!isOpen) {
      setForm({});
      setPhotoFile(null);
      setPhotoPreview('');
      setRemovePhoto(false);
      setFallbackCategory(null);
      setError(null);
      return;
    }

    if (!row) return;

    const resolved = resolveRowDetails(row);
    setPhotoFile(null);
    setPhotoPreview(resolved.photoUrl);
    setRemovePhoto(false);
    setError(null);
    setFallbackCategory(
      resolved.categoryId
        ? {
            id: resolved.categoryId,
            name: resolved.categoryName || `Category #${resolved.categoryId}`,
          }
        : null
    );

    if (isSharedMode) {
      const sharedCommon = {
        category_id: resolved.categoryId,
        brand: resolved.brand,
        specifications: resolved.specifications,
        unit_of_measure: resolved.unitOfMeasure,
        unit_cost: resolved.unitCost,
        received_date: resolved.receivedDate,
      };

      if (isConsumable) {
        setForm({
          ...sharedCommon,
          quantity: resolved.quantity,
          reorder_level: resolved.reorderLevel,
        });
      } else {
        setForm({
          ...sharedCommon,
          model: resolved.model,
          manufacturer_name: resolved.manufacturerName,
          country_of_origin: resolved.countryOfOrigin,
          assign_property_number: resolved.assignPropertyNumber,
          track_serial_numbers: resolved.trackSerialNumbers,
        });
      }
    } else {
      if (isConsumable) {
        setForm({
          quantity: resolved.quantity,
          received_date: resolved.receivedDate,
          unit_cost: resolved.unitCost,
        });
      } else {
        setForm({
          serial_number: resolved.serialNumber,
          assign_property_number: resolved.assignPropertyNumber,
          track_serial_numbers: resolved.trackSerialNumbers,
          unit_cost: resolved.unitCost,
        });
      }
    }
  }, [row, isOpen, isSharedMode, isConsumable]);

  if (!isOpen || !row) return null;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setRemovePhoto(false);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleClearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = isConsumable
      ? `/v1/inventory/stock-batches/${row.id}`
      : `/v1/inventory/serialized-assets/${row.id}`;

    const payload = isSharedMode
      ? {
          ...form,
          remove_photo: removePhoto,
          edit_mode: 'shared',
          target_ids: targetIds.length > 0 ? targetIds : [row.id],
          arrival_date: form.received_date,
          ...(isConsumable ? { quantity_on_hand: form.quantity } : {}),
        }
      : {
          ...form,
          edit_mode: 'single',
          target_ids: [row.id],
          ...(isConsumable
            ? {
                quantity_on_hand: form.quantity,
                arrival_date: form.received_date,
              }
            : {}),
        };

    try {
      if (isSharedMode && (photoFile || removePhoto)) {
        const formData = new FormData();
        formData.append('_method', 'PUT');
        Object.entries(payload).forEach(([key, val]) => {
          if (val === undefined || val === null) return;
          if (Array.isArray(val)) {
            val.forEach((v, idx) => formData.append(`${key}[${idx}]`, v));
          } else if (typeof val === 'boolean') {
            formData.append(key, val ? '1' : '0');
          } else {
            formData.append(key, String(val));
          }
        });
        if (photoFile) {
          formData.append('photo', photoFile);
        }

        await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.put(endpoint, payload);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const hasMatchingCategoryOption =
    form.category_id &&
    categories.some((c) => String(c.id) === String(form.category_id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {isSharedMode ? 'Edit Shared ' : 'Edit Individual '}
              {isConsumable ? 'Consumable / Stock Batch' : 'Asset'}
            </DialogTitle>
            <DialogDescription>
              {isSharedMode
                ? `Update shared details across ${
                    targetIds.length > 0 ? `${targetIds.length} matching` : 'selected'
                  } ${isConsumable ? 'consumable records' : 'asset records'}.`
                : `Update details specific to ${
                    row.property_number ||
                    row.serial_number ||
                    row.reference_no ||
                    row.item_name ||
                    `#${row.id}`
                  }.`}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          {isSharedMode ? (
            <FieldGroup className="space-y-4">
              {/* Category + Unit of Measure */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="category_id">Category</FieldLabel>
                  <select
                    id="category_id"
                    value={form.category_id || ''}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs text-foreground shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </option>
                    ))}
                    {form.category_id && !hasMatchingCategoryOption && fallbackCategory && (
                      <option value={String(fallbackCategory.id)}>
                        {fallbackCategory.name}
                      </option>
                    )}
                  </select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="unit_of_measure">Unit of Measure</FieldLabel>
                  <Input
                    id="unit_of_measure"
                    type="text"
                    placeholder="e.g., pcs, box, ream, unit"
                    value={form.unit_of_measure || ''}
                    onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })}
                    className="h-9 text-xs"
                  />
                </Field>
              </div>

              {/* Brand + Unit Cost */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="brand">Brand</FieldLabel>
                  <Input
                    id="brand"
                    type="text"
                    placeholder="e.g., HP, Brother, Epson"
                    value={form.brand || ''}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="h-9 text-xs"
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
                    className="h-9 text-xs"
                  />
                </Field>
              </div>

              {/* Arrival Date (+ Quantity for Consumables) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="received_date">Arrival Date</FieldLabel>
                  <Input
                    id="received_date"
                    type="date"
                    required
                    value={form.received_date || ''}
                    onChange={(e) => setForm({ ...form, received_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </Field>

                {isConsumable && (
                  <Field>
                    <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      required
                      value={form.quantity ?? ''}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="h-9 text-xs"
                    />
                    <FieldDescription className="text-[11px]">
                      Adjusting stock does not replay past issuances.
                    </FieldDescription>
                  </Field>
                )}
              </div>

              {/* Specifications */}
              <Field>
                <FieldLabel htmlFor="specifications">Specifications</FieldLabel>
                <Input
                  id="specifications"
                  type="text"
                  placeholder="Enter item specifications or technical notes..."
                  value={form.specifications || ''}
                  onChange={(e) => setForm({ ...form, specifications: e.target.value })}
                  className="h-9 text-xs"
                />
              </Field>

              {/* Photo Upload / Camera Capture */}
              <Field>
                <FieldLabel>Item Photo</FieldLabel>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Item preview"
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground/50" />
                    )}
                  </div>

                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-3.5" />
                      Upload Photo
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="size-3.5" />
                      Take Photo
                    </Button>

                    {photoPreview && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive"
                        onClick={handleClearPhoto}
                      >
                        <X className="size-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </Field>

              {/* Consumable vs Asset Shared Fields */}
              {isConsumable ? (
                <Field>
                  <FieldLabel htmlFor="reorder_level">Reorder Level</FieldLabel>
                  <Input
                    id="reorder_level"
                    type="number"
                    min="0"
                    placeholder="Minimum stock threshold before reorder"
                    value={form.reorder_level ?? ''}
                    onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                    className="h-9 text-xs"
                  />
                </Field>
              ) : (
                <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-3.5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="model">Model</FieldLabel>
                      <Input
                        id="model"
                        type="text"
                        value={form.model || ''}
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                        className="h-9 bg-card text-xs"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="manufacturer_name">Manufacturer</FieldLabel>
                      <Input
                        id="manufacturer_name"
                        type="text"
                        value={form.manufacturer_name || ''}
                        onChange={(e) =>
                          setForm({ ...form, manufacturer_name: e.target.value })
                        }
                        className="h-9 bg-card text-xs"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="country_of_origin">Country of Origin</FieldLabel>
                      <Input
                        id="country_of_origin"
                        type="text"
                        value={form.country_of_origin || ''}
                        onChange={(e) =>
                          setForm({ ...form, country_of_origin: e.target.value })
                        }
                        className="h-9 bg-card text-xs"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="min-w-0">
                        <label
                          htmlFor="shared_toggle_assign_property_number"
                          className="block cursor-pointer text-xs font-medium text-foreground"
                        >
                          Assign Property Number
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Auto-generated upon saving if enabled
                        </p>
                      </div>
                      <Switch
                        id="shared_toggle_assign_property_number"
                        checked={Boolean(form.assign_property_number)}
                        onCheckedChange={(checked) =>
                          setForm({ ...form, assign_property_number: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="min-w-0">
                        <label
                          htmlFor="shared_toggle_track_serial_numbers"
                          className="block cursor-pointer text-xs font-medium text-foreground"
                        >
                          Track Serial Numbers
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Enable serial number tracking per unit
                        </p>
                      </div>
                      <Switch
                        id="shared_toggle_track_serial_numbers"
                        checked={Boolean(form.track_serial_numbers)}
                        onCheckedChange={(checked) =>
                          setForm({ ...form, track_serial_numbers: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </FieldGroup>
          ) : (
            <FieldGroup className="space-y-4">
              {isConsumable ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="single_quantity">Quantity on Hand</FieldLabel>
                      <Input
                        id="single_quantity"
                        type="number"
                        min="0"
                        required
                        value={form.quantity ?? ''}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        className="h-9 text-xs"
                      />
                      <FieldDescription className="text-[11px]">
                        Adjusting stock does not replay past issuances.
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="single_received_date">Arrival Date</FieldLabel>
                      <Input
                        id="single_received_date"
                        type="date"
                        required
                        value={form.received_date || ''}
                        onChange={(e) =>
                          setForm({ ...form, received_date: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="single_unit_cost">Unit Cost (₱)</FieldLabel>
                    <Input
                      id="single_unit_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.unit_cost ?? ''}
                      onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="min-w-0">
                        <label
                          htmlFor="single_toggle_assign_property_number"
                          className="block cursor-pointer text-xs font-medium text-foreground"
                        >
                          Assign Property Number
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          {row.property_number
                            ? `Current: ${row.property_number}`
                            : 'Auto-generated upon saving'}
                        </p>
                      </div>
                      <Switch
                        id="single_toggle_assign_property_number"
                        checked={Boolean(form.assign_property_number)}
                        onCheckedChange={(checked) =>
                          setForm({ ...form, assign_property_number: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="min-w-0">
                        <label
                          htmlFor="single_toggle_track_serial_numbers"
                          className="block cursor-pointer text-xs font-medium text-foreground"
                        >
                          Track Serial Numbers
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Enable serial number for this unit
                        </p>
                      </div>
                      <Switch
                        id="single_toggle_track_serial_numbers"
                        checked={Boolean(form.track_serial_numbers)}
                        onCheckedChange={(checked) =>
                          setForm({ ...form, track_serial_numbers: checked })
                        }
                      />
                    </div>
                  </div>

                  {form.track_serial_numbers && (
                    <Field>
                      <FieldLabel htmlFor="single_serial_number">Serial Number</FieldLabel>
                      <Input
                        id="single_serial_number"
                        type="text"
                        value={form.serial_number || ''}
                        onChange={(e) =>
                          setForm({ ...form, serial_number: e.target.value })
                        }
                        className="h-9 font-mono text-xs"
                      />
                    </Field>
                  )}

                  <Field>
                    <FieldLabel htmlFor="single_unit_cost">Unit Cost (₱)</FieldLabel>
                    <Input
                      id="single_unit_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.unit_cost ?? ''}
                      onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </Field>
                </>
              )}
            </FieldGroup>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
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