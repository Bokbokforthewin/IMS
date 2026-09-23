import React, { useState } from 'react';
import './CatalogPage.css';
import { Button } from "@/components/ui/button";
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
  handleSaveItem, // Function to call when saving edits
  handleDeleteItem, // Direct function to delete item by ID
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination calculations
  const safeItems = items || [];
  const totalItems = safeItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Keep page index within bounds when items are deleted or page size changes
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedItems = safeItems.slice(startIndex, startIndex + itemsPerPage);

  const handleRowsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when page size changes
  };

  return (
    <div className="catalog-table-card">
      <h3 className="text-lg font-semibold mb-4">Items</h3>

      <div className="catalog-table-wrapper border rounded-md overflow-x-auto">
        <Table className="catalog-table">
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Specifications</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Tracking Type</TableHead>
              <TableHead className="action-col text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="empty-row text-center h-24 text-muted-foreground">
                  No items created yet.
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item, index) => (
                <ItemRow 
                  key={item.id} 
                  item={item} 
                  index={index}
                  handleSaveItem={handleSaveItem}
                  handleDeleteItem={handleDeleteItem}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Controls: Rows Per Page & Icon-Only Pagination */}
      <div className="flex items-center justify-between gap-4 px-2 py-4">
        <Field orientation="horizontal" className="w-fit flex items-center gap-2">
          <FieldLabel htmlFor="select-rows-per-page">Rows per page</FieldLabel>
          <Select value={String(itemsPerPage)} onValueChange={handleRowsPerPageChange}>
            <SelectTrigger className="w-20" id="select-rows-per-page">
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
  );
}

// Extracted row component managing both Edit and Delete confirmation state per item
function ItemRow({ item, index, handleSaveItem, handleDeleteItem }) {
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
    <TableRow>
      <TableCell className="font-mono font-bold">{item.item_code}</TableCell>
      <TableCell className="font-bold">{item.name}</TableCell>
      <TableCell>{item.category?.name || 'N/A'}</TableCell>
      <TableCell>{item.brand || '—'}</TableCell>
      <TableCell>{item.specifications || '—'}</TableCell>
      <TableCell>{item.type || '—'}</TableCell>
      <TableCell>{item.unit_of_measure}</TableCell>
      <TableCell>{item.tracking_type || '—'}</TableCell>

      <TableCell className="action-cell">
        <div className="action-buttons flex items-center justify-end gap-2">
          
          {/* EDIT DIALOG */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button type="button" className="btn-action btn-edit" variant="outline" size="sm">
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
                    <label className="text-sm font-medium">Item Name</label>
                    <input
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Brand</label>
                      <input
                        name="brand"
                        type="text"
                        value={formData.brand}
                        onChange={handleChange}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Type</label>
                      <input
                        name="type"
                        type="text"
                        value={formData.type}
                        onChange={handleChange}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Specifications</label>
                    <textarea
                      name="specifications"
                      value={formData.specifications}
                      onChange={handleChange}
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Unit of Measure</label>
                      <input
                        name="unit_of_measure"
                        type="text"
                        value={formData.unit_of_measure}
                        onChange={handleChange}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Tracking Type</label>
                      <input
                        name="tracking_type"
                        type="text"
                        value={formData.tracking_type}
                        onChange={handleChange}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* DELETE ALERT DIALOG */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                className="btn-action btn-delete"
                variant="destructive"
                size="sm"
              >
                Delete
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete 
                  <span className="font-bold text-foreground"> "{item.name}" </span>
                  ({item.item_code}) from your catalog.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleDeleteItem && handleDeleteItem(item.id)}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </TableCell>
    </TableRow>
  );
}