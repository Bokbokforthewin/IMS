import React, { useState } from 'react';
import { Boxes, Pencil, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ItemTable({
  items = [],
  handleSaveItem,
  handleDeleteItem,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dynamic Pagination Calculations
  const safeItems = items || [];
  const totalItems = safeItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const validPage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedItems = safeItems.slice(startIndex, startIndex + itemsPerPage);

  const handleRowsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="min-w-0 w-full space-y-4">
      <div className="min-w-0 w-full rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
        {/* Prominent Task Header */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Boxes className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Master Item Catalog
          </h3>
        </div>

        {/* Main Table / Mobile Card Container */}
        <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          {paginatedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No catalog items created yet.
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW (Full Table for XL screens) */}
              <div className="hidden xl:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold text-foreground">Item Code</TableHead>
                      <TableHead className="font-semibold text-foreground">Item Name</TableHead>
                      <TableHead className="font-semibold text-foreground">Category</TableHead>
                      <TableHead className="font-semibold text-foreground">Brand</TableHead>
                      <TableHead className="font-semibold text-foreground">Specifications</TableHead>
                      <TableHead className="font-semibold text-foreground">Type</TableHead>
                      <TableHead className="font-semibold text-foreground">Unit</TableHead>
                      <TableHead className="font-semibold text-foreground">Tracking</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-foreground">{item.item_code}</TableCell>
                        <TableCell className="font-semibold text-foreground">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.category?.name || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.brand || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={item.specifications}>
                          {item.specifications || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.type || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.unit_of_measure}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs font-normal">
                            {item.tracking_type || 'consumable'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <ItemActions 
                            item={item} 
                            handleSaveItem={handleSaveItem} 
                            handleDeleteItem={handleDeleteItem} 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* STREAMLINED MOBILE & TABLET VIEW (Only Essential Information) */}
              <div className="divide-y divide-border xl:hidden">
                {paginatedItems.map((item) => (
                  <div key={`mob-${item.id}`} className="p-4 space-y-2.5 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-primary">{item.item_code}</span>
                          <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                            {item.tracking_type || 'consumable'}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm text-foreground break-words">{item.name}</h4>
                      </div>
                    </div>

                    {/* Streamlined Key Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Category</span>
                        <span className="text-foreground font-medium">{item.category?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Brand</span>
                        <span className="text-foreground">{item.brand || '—'}</span>
                      </div>
                      {item.specifications && item.specifications !== '—' && (
                        <div className="col-span-2">
                          <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Specs</span>
                          <span className="text-muted-foreground truncate block">{item.specifications}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t border-border/50 flex justify-end">
                      <ItemActions 
                        item={item} 
                        handleSaveItem={handleSaveItem} 
                        handleDeleteItem={handleDeleteItem} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Field orientation="horizontal" className="w-fit flex items-center gap-2">
            <FieldLabel htmlFor="select-rows-per-page" className="text-xs text-muted-foreground">
              Rows per page
            </FieldLabel>
            <Select value={String(itemsPerPage)} onValueChange={handleRowsPerPageChange}>
              <SelectTrigger className="w-20 h-8 text-xs" id="select-rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Showing {totalItems === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
            </span>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.max(prev - 1, 1));
                    }}
                    className={validPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                    }}
                    className={validPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemActions({ item, handleSaveItem, handleDeleteItem }) {
  const [formData, setFormData] = useState({
    name: item.name || '',
    brand: item.brand || '',
    specifications: item.specifications || '',
    type: item.type || '',
    unit_of_measure: item.unit_of_measure || '',
    tracking_type: item.tracking_type || '',
  });

  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (handleSaveItem) {
      handleSaveItem({ ...item, ...formData });
    }
    setIsEditOpen(false);
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSubmitEdit}>
            <DialogHeader>
              <DialogTitle>Edit Item ({item.item_code})</DialogTitle>
              <DialogDescription>
                Update the item details below and click save.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Item Name <span className="text-destructive">*</span>
                </label>
                <Input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Brand</label>
                  <Input
                    name="brand"
                    type="text"
                    value={formData.brand}
                    onChange={handleChange}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Input
                    name="type"
                    type="text"
                    value={formData.type}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Specifications</label>
                <Textarea
                  name="specifications"
                  value={formData.specifications}
                  onChange={handleChange}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Unit of Measure <span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="unit_of_measure"
                    type="text"
                    value={formData.unit_of_measure}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tracking Type</label>
                  <Input
                    name="tracking_type"
                    type="text"
                    value={formData.tracking_type}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto min-w-[140px] flex items-center justify-center gap-2">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="w-full sm:w-auto min-w-[140px] flex items-center justify-center gap-2">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE ALERT DIALOG */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-xs">
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </AlertDialogTrigger>
        
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Delete Catalog Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete 
              <span className="font-semibold text-foreground"> "{item.name}" </span>
              ({item.item_code}) from your catalog database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteItem && handleDeleteItem(item.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}