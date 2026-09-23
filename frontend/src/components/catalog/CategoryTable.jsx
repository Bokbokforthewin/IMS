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

export default function CategoryTable({
  categories = [],
  handleSaveCategory,
  handleDeleteCategory,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dynamic Pagination Calculations
  const totalItems = categories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Keep page within bounds when deleting items or changing page size
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedCategories = categories.slice(startIndex, startIndex + itemsPerPage);

  const handleRowsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="catalog-table-card">
      <h3 className="text-lg font-semibold mb-4">Categories</h3>

      <div className="catalog-table-wrapper border rounded-md overflow-hidden">
        <Table className="catalog-table">
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="action-col text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="empty-row text-center h-24 text-muted-foreground">
                  No categories created yet.
                </TableCell>
              </TableRow>
            ) : (
              paginatedCategories.map((cat, index) => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  index={index}
                  handleSaveCategory={handleSaveCategory}
                  handleDeleteCategory={handleDeleteCategory}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Controls: Rows Per Page & Icons-Only Pagination */}
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

// Extracted Row Component
function CategoryRow({ cat, index, handleSaveCategory, handleDeleteCategory }) {
  const [name, setName] = useState(cat.name);
  const [description, setDescription] = useState(cat.description || '');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (handleSaveCategory) {
      handleSaveCategory({ ...cat, name, description });
    }
    setIsEditOpen(false);
  };

  return (
    <TableRow>
      <TableCell className="font-bold">{cat.name}</TableCell>
      <TableCell>{cat.description || 'N/A'}</TableCell>

      <TableCell className="action-cell">
        <div className="action-buttons flex items-center justify-end gap-2">
          
          {/* EDIT DIALOG */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button type="button" className="btn-action btn-edit" variant="outline" size="sm">
                Edit
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmitEdit}>
                <DialogHeader>
                  <DialogTitle>Edit Category</DialogTitle>
                  <DialogDescription>
                    Make changes to the category details below and click save.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`cat-name-${cat.id}`} className="text-sm font-medium">
                      Category Name
                    </label>
                    <input
                      id={`cat-name-${cat.id}`}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor={`cat-desc-${cat.id}`} className="text-sm font-medium">
                      Description
                    </label>
                    <textarea
                      id={`cat-desc-${cat.id}`}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
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
              <Button className="btn-action btn-delete" variant="destructive" size="sm">
                Delete
              </Button>
            </AlertDialogTrigger>
            
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the category 
                  <span className="font-bold text-foreground"> "{cat.name}" </span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>
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