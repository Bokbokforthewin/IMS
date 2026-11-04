// import React from 'react';
// import { 
//   Pencil, Tag, Package, Badge, FileText, Sliders, Ruler, TrendingDown, Layers 
// } from 'lucide-react';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Field, FieldLabel } from "@/components/ui/field";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// export default function EditItemModal({ 
//   isOpen, 
//   onClose, 
//   editingItem, 
//   setEditingItem, 
//   categories = [], 
//   handleUpdateItem 
// }) {
//   const isSerialized = !!editingItem.is_serialized;

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
//         <form onSubmit={handleUpdateItem} className="space-y-5">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2 text-base font-semibold">
//               <Pencil className="size-4 text-primary" />
//               Edit Catalog Item
//             </DialogTitle>
//             <DialogDescription className="text-xs text-muted-foreground">
//               Modify master item parameters and inventory thresholds.
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-4 py-1">
//             {/* Category Selector */}
//             <Field>
//               <FieldLabel htmlFor="edit_item_category" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
//                 <Tag className="w-3.5 h-3.5" /> Category <span className="text-destructive">*</span>
//               </FieldLabel>
//               <Select
//                 value={String(editingItem.category_id || '')}
//                 onValueChange={(val) => setEditingItem({ ...editingItem, category_id: val })}
//               >
//                 <SelectTrigger id="edit_item_category" className="mt-1.5 w-full">
//                   <SelectValue placeholder="Select Category..." />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {categories.map((c) => (
//                     <SelectItem key={c.id} value={String(c.id)}>
//                       {c.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </Field>

//             {/* Item Name */}
//             <Field>
//               <FieldLabel htmlFor="edit_item_name" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
//                 <Package className="w-3.5 h-3.5" /> Item Name <span className="text-destructive">*</span>
//               </FieldLabel>
//               <Input
//                 id="edit_item_name"
//                 type="text"
//                 required
//                 value={editingItem.name || ''}
//                 onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
//                 className="mt-1.5 w-full"
//               />
//             </Field>

//             {/* Brand & Specifications */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <Field>
//                 <FieldLabel htmlFor="edit_item_brand" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
//                   <Badge className="w-3.5 h-3.5" /> Brand
//                 </FieldLabel>
//                 <Input
//                   id="edit_item_brand"
//                   type="text"
//                   value={editingItem.brand || ''}
//                   onChange={e => setEditingItem({ ...editingItem, brand: e.target.value })}
//                   className="mt-1.5 w-full"
//                 />
//               </Field>

//               <Field>
//                 <FieldLabel htmlFor="edit_item_specifications" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
//                   <FileText className="w-3.5 h-3.5" /> Specifications
//                 </FieldLabel>
//                 <Input
//                   id="edit_item_specifications"
//                   type="text"
//                   value={editingItem.specifications || ''}
//                   onChange={e => setEditingItem({ ...editingItem, specifications: e.target.value })}
//                   className="mt-1.5 w-full"
//                 />
//               </Field>
//             </div>

//             {/* Item Type & Unit of Measure */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <Field>
//                 <FieldLabel htmlFor="edit_item_type" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
//                   <Sliders className="w-3.5 h-3.5" /> Item Type
//                 </FieldLabel>
//                 <Input
//                   id="edit_item_type"
//                   type="text"
//                   value={editingItem.type || ''}
//                   onChange={e => setEditingItem({ ...editingItem, type: e.target.value })}
//                   className="mt-1.5 w-full"
//                 />
//               </Field>

//               <Field>
//                 <FieldLabel htmlFor="edit_item_uom" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
//                   <Ruler className="w-3.5 h-3.5" /> Unit of Measure <span className="text-destructive">*</span>
//                 </FieldLabel>
//                 <Input
//                   id="edit_item_uom"
//                   type="text"
//                   required
//                   value={editingItem.unit_of_measure || ''}
//                   onChange={e => setEditingItem({ ...editingItem, unit_of_measure: e.target.value })}
//                   className="mt-1.5 w-full"
//                 />
//               </Field>
//             </div>

//             {/* Reorder Level */}
//             <Field>
//               <FieldLabel htmlFor="edit_item_reorder" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
//                 <TrendingDown className="w-3.5 h-3.5" /> Reorder Level {!isSerialized && <span className="text-destructive">*</span>}
//               </FieldLabel>
//               <Input
//                 id="edit_item_reorder"
//                 type="number"
//                 required={!isSerialized}
//                 disabled={isSerialized}
//                 value={isSerialized ? '1' : (editingItem.reorder_level || '')}
//                 onChange={e => setEditingItem({ ...editingItem, reorder_level: e.target.value })}
//                 className="mt-1.5 w-full disabled:bg-muted disabled:text-muted-foreground"
//               />
//             </Field>

//             {/* Serialized Asset Card Toggle */}
//             <div className="rounded-lg border border-border bg-muted/30 p-3.5">
//               <label className="flex items-start gap-3 cursor-pointer">
//                 <input
//                   type="checkbox"
//                   checked={isSerialized}
//                   onChange={(e) => {
//                     const checked = e.target.checked;
//                     setEditingItem({
//                       ...editingItem,
//                       is_serialized: checked,
//                       reorder_level: checked ? '1' : '',
//                     });
//                   }}
//                   className="mt-0.5 size-4 rounded border-input text-primary focus:ring-ring"
//                 />
//                 <div className="space-y-0.5">
//                   <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
//                     <Layers className="size-3.5 text-primary" />
//                     Serialized Asset
//                   </span>
//                   <p className="text-[11px] text-muted-foreground leading-normal">
//                     Enable this for equipment requiring individual serial numbers or property tags.
//                   </p>
//                 </div>
//               </label>
//             </div>
//           </div>

//           <DialogFooter className="gap-2 sm:gap-0">
//             <Button type="button" variant="outline" onClick={onClose}>
//               Cancel
//             </Button>
//             <Button type="submit">
//               Update Item
//             </Button>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }