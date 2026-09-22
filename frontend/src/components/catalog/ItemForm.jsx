import React from 'react';
import { 
  Tag, Package, Badge, Ruler, 
  Layers, TrendingDown, Save, Clock, FileText, Sliders
} from 'lucide-react';
import { 
  Field, FieldLabel, FieldGroup, FieldSet, FieldLegend 
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function ItemForm({ itemForm, setItemForm, categories, handleApiCall }) {
  const trackingType = itemForm.tracking_type || 'consumable';
  const isAsset = trackingType === 'asset';
  const isConsumable = trackingType === 'consumable';

  const categoryOptions = (categories || []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemForm.category_id) return;

    const payload = {
      category_id: itemForm.category_id,
      name: itemForm.name,
      brand: itemForm.brand || null,
      specifications: itemForm.specifications || null,
      type: itemForm.type || null,
      unit_of_measure: itemForm.unit_of_measure,
      reorder_level: isConsumable ? (Number(itemForm.reorder_level) || 5) : 5,
      tracking_type: trackingType,
      estimated_useful_life: isAsset ? (itemForm.estimated_useful_life || null) : null,
    };

    handleApiCall('/items', payload, () => setItemForm({
      category_id: '',
      name: '',
      brand: '',
      specifications: '',
      type: '',
      unit_of_measure: '',
      reorder_level: '5',
      tracking_type: 'consumable',
      estimated_useful_life: '',
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FieldGroup>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field data-invalid={!itemForm.category_id ? undefined : false}>
            <FieldLabel htmlFor="category_id" className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" /> Category *
            </FieldLabel>
            <Select
              items={categoryOptions}
              value={itemForm.category_id ? String(itemForm.category_id) : ''}
              onValueChange={(value) => setItemForm({ ...itemForm, category_id: value })}
            >
              <SelectTrigger id="category_id" className="w-full">
                <SelectValue placeholder="Select Category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="name" className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" /> Item Name *
            </FieldLabel>
            <Input
              id="name"
              required
              placeholder="e.g., Office Chair, Dell Monitor, Printer Paper"
              value={itemForm.name || ''}
              onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="brand" className="flex items-center gap-2">
              <Badge className="w-4 h-4 text-muted-foreground" /> Brand (Optional)
            </FieldLabel>
            <Input
              id="brand"
              placeholder="e.g., HP, Epson, Logitech"
              value={itemForm.brand || ''}
              onChange={e => setItemForm({ ...itemForm, brand: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="type" className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-muted-foreground" /> Type (Optional)
            </FieldLabel>
            <Input
              id="type"
              placeholder="e.g., Peripheral, Hardware, Office Supply"
              value={itemForm.type || ''}
              onChange={e => setItemForm({ ...itemForm, type: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="specifications" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" /> Specifications (Optional)
            </FieldLabel>
            <Input
              id="specifications"
              placeholder="e.g., Short, A4, 70gsm, 27-inch 4K IPS"
              value={itemForm.specifications || ''}
              onChange={e => setItemForm({ ...itemForm, specifications: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="unit_of_measure" className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-muted-foreground" /> Unit of Measure *
            </FieldLabel>
            <Input
              id="unit_of_measure"
              required
              placeholder="pcs, ream, box, set, roll, liter"
              value={itemForm.unit_of_measure || ''}
              onChange={e => setItemForm({ ...itemForm, unit_of_measure: e.target.value })}
            />
          </Field>
        </div>

        <FieldSet className="w-full mt-4 pt-4 border-t">
          <FieldLegend variant="label" className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            Tracking Type *
          </FieldLegend>

          <RadioGroup
            value={trackingType}
            onValueChange={(value) => setItemForm({ ...itemForm, tracking_type: value })}
          >
            <Field orientation="horizontal">
              <RadioGroupItem value="asset" id="track-asset" />
              <FieldLabel htmlFor="track-asset" className="font-normal">
                Asset <span className="text-muted-foreground text-sm">(Long-term equipment requiring serials / property numbers)</span>
              </FieldLabel>
            </Field>

            <Field orientation="horizontal">
              <RadioGroupItem value="consumable" id="track-consumable" />
              <FieldLabel htmlFor="track-consumable" className="font-normal">
                Consumable <span className="text-muted-foreground text-sm">(Quantity-based inventory supplies)</span>
              </FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>

        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mt-2">
          {isConsumable && (
            <Field>
              <FieldLabel htmlFor="reorder_level" className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-muted-foreground" /> Reorder Level *
              </FieldLabel>
              <Input
                id="reorder_level"
                type="number"
                min="0"
                required
                placeholder="5"
                value={itemForm.reorder_level ?? '5'}
                onChange={e => setItemForm({ ...itemForm, reorder_level: e.target.value })}
              />
            </Field>
          )}

          {isAsset && (
            <Field>
              <FieldLabel htmlFor="estimated_useful_life" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Estimated Useful Life
              </FieldLabel>
              <Input
                id="estimated_useful_life"
                placeholder="e.g., 3 Years, 5 Years"
                value={itemForm.estimated_useful_life || ''}
                onChange={e => setItemForm({ ...itemForm, estimated_useful_life: e.target.value })}
              />
            </Field>
          )}
        </div>
      </FieldGroup>

      <Button type="submit" className="mt-6 flex items-center gap-2">
        <Save className="w-4 h-4" /> Save Catalog Item
      </Button>
    </form>
  );
}