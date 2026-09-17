import React from 'react';
import { 
  Tag, Package, Badge, Ruler, 
  Layers, TrendingDown, Save
} from 'lucide-react';
import { 
  Field, FieldLabel, FieldDescription, FieldGroup, FieldSet, FieldLegend 
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';

export default function ItemForm({ itemForm, setItemForm, categories, handleApiCall }) {
  const trackingType = itemForm.tracking_type || 'consumable';
  const isSerialized = trackingType === 'serialized';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemForm.category_id) return;

    // Build a clean payload for the catalog item
    const payload = {
      category_id: itemForm.category_id,
      name: itemForm.name,
      brand: itemForm.brand,
      unit_of_measure: itemForm.unit_of_measure,
      reorder_level: isSerialized ? '1' : itemForm.reorder_level,
      tracking_type: trackingType,
    };

    handleApiCall('/items', payload, () => setItemForm({
      category_id: '',
      name: '',
      brand: '',
      unit_of_measure: '',
      reorder_level: '',
      tracking_type: 'consumable',
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FieldGroup>
        
        {/* --- 1. ITEM CATALOG INFORMATION --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="category_id" className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" /> Category *
            </FieldLabel>
            <select 
              id="category_id"
              required 
              value={itemForm.category_id || ''} 
              onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select Category...</option>
              {(categories || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field>
            <FieldLabel htmlFor="brand" className="flex items-center gap-2">
              <Badge className="w-4 h-4 text-muted-foreground" /> Brand
            </FieldLabel>
            <Input
              id="brand"
              placeholder="e.g., HP, Ergoprax, Epson"
              value={itemForm.brand || ''}
              onChange={e => setItemForm({ ...itemForm, brand: e.target.value })}
            />
          </Field>
          
          <Field>
            <FieldLabel htmlFor="unit_of_measure" className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-muted-foreground" /> Unit of Measure *
            </FieldLabel>
            <Input
              id="unit_of_measure"
              required
              placeholder="pcs, box, unit, ream"
              value={itemForm.unit_of_measure || ''}
              onChange={e => setItemForm({ ...itemForm, unit_of_measure: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="reorder_level" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-muted-foreground" /> 
              Reorder Level {!isSerialized && '*'}
            </FieldLabel>
            <Input
              id="reorder_level"
              type="number"
              required={!isSerialized}
              disabled={isSerialized}
              placeholder="5"
              value={isSerialized ? '1' : (itemForm.reorder_level || '')}
              onChange={e => setItemForm({ ...itemForm, reorder_level: e.target.value })}
            />
          </Field>
        </div>

        {/* --- 2. TRACKING TYPE SELECTION (MOVED TO BOTTOM) --- */}
        <FieldSet className="w-full mt-4 pt-4 border-t">
          <FieldLegend variant="label" className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            Tracking Type *
          </FieldLegend>
         
          <RadioGroup 
            value={trackingType}
            onValueChange={(value) => {
              setItemForm({
                ...itemForm,
                tracking_type: value,
                reorder_level: value === 'serialized' ? '1' : (itemForm.reorder_level || ''),
              });
            }}
          >
            <Field orientation="horizontal">
              <RadioGroupItem value="serialized" id="track-serialized" />
              <FieldLabel htmlFor="track-serialized" className="font-normal">
                Serialized Asset <span className="text-muted-foreground text-sm">(Individual serial tracking)</span>
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="non-serialized" id="track-non-serialized" />
              <FieldLabel htmlFor="track-non-serialized" className="font-normal">
                Non-Serialized Asset <span className="text-muted-foreground text-sm">(Asset metadata without serials)</span>
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="consumable" id="track-consumable" />
              <FieldLabel htmlFor="track-consumable" className="font-normal">
                Consumable <span className="text-muted-foreground text-sm">(Quantity-based supplies)</span>
              </FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>

      </FieldGroup>

      <Button type="submit" className="mt-6 flex items-center gap-2">
        <Save className="w-4 h-4" /> Save Catalog Item
      </Button>
    </form>
  );
}