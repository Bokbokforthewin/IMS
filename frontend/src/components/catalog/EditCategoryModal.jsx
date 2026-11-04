// import React from 'react';
// import { Pencil, Tag, AlignLeft } from 'lucide-react';
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
// import { Textarea } from "@/components/ui/textarea";
// import { Button } from "@/components/ui/button";

// export default function EditCategoryModal({ 
//   isOpen, 
//   onClose, 
//   editingCategory, 
//   setEditingCategory, 
//   handleUpdateCategory 
// }) {
//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-[480px]">
//         <form onSubmit={handleUpdateCategory} className="space-y-5">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2 text-base font-semibold">
//               <Pencil className="size-4 text-primary" />
//               Edit Category
//             </DialogTitle>
//             <DialogDescription className="text-xs text-muted-foreground">
//               Update category information below and click save when finished.
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-4 py-1">
//             <Field>
//               <FieldLabel htmlFor="edit_category_name" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
//                 <Tag className="w-3.5 h-3.5" />
//                 Category Name <span className="text-destructive">*</span>
//               </FieldLabel>
//               <Input
//                 id="edit_category_name"
//                 type="text"
//                 required
//                 value={editingCategory.name || ''}
//                 onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
//                 className="mt-1.5 w-full"
//               />
//             </Field>

//             <Field>
//               <FieldLabel htmlFor="edit_category_description" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
//                 <AlignLeft className="w-3.5 h-3.5" />
//                 Description
//               </FieldLabel>
//               <Textarea
//                 id="edit_category_description"
//                 rows={3}
//                 placeholder="Brief category description..."
//                 value={editingCategory.description || ''}
//                 onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
//                 className="mt-1.5 w-full resize-none"
//               />
//             </Field>
//           </div>

//           <DialogFooter className="gap-2 sm:gap-0">
//             <Button type="button" variant="outline" onClick={onClose}>
//               Cancel
//             </Button>
//             <Button type="submit">
//               Update Changes
//             </Button>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }