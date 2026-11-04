import React, { useState } from 'react';
import { Layers, Pencil, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const validPage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedCategories = categories.slice(startIndex, startIndex + itemsPerPage);

  const handleRowsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="min-w-0 w-full space-y-4">
      <div className="min-w-0 w-full rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
        {/* Prominent Task Header */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Existing Categories
          </h3>
        </div>

        {/* Main Table / Mobile Card Container */}
        <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          {paginatedCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No categories created yet.
            </div>
          ) : (
            <>
              {/* DESKTOP / TABLET VIEW (Wide Table) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold text-foreground">Category Name</TableHead>
                      <TableHead className="font-semibold text-foreground">Description</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedCategories.map((cat) => (
                      <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">{cat.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{cat.description || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <CategoryActions 
                            cat={cat} 
                            handleSaveCategory={handleSaveCategory} 
                            handleDeleteCategory={handleDeleteCategory} 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* MOBILE STACKED CARD VIEW (No Horizontal Scroll) */}
              <div className="divide-y divide-border md:hidden">
                {paginatedCategories.map((cat) => (
                  <div key={`mob-${cat.id}`} className="p-4 space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-semibold text-sm text-foreground break-words">{cat.name}</h4>
                        <p className="text-xs text-muted-foreground break-words">{cat.description || 'No description provided.'}</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-border/50 flex justify-end">
                      <CategoryActions 
                        cat={cat} 
                        handleSaveCategory={handleSaveCategory} 
                        handleDeleteCategory={handleDeleteCategory} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Controls: Pagination & Rows Per Page */}
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

// Extracted Actions Component (Shared between Table and Cards)
function CategoryActions({ cat, handleSaveCategory, handleDeleteCategory }) {
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
    <div className="flex items-center justify-end gap-2">
      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Pencil className="size-3.5" />
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
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`cat-name-${cat.id}`} className="text-xs font-medium text-muted-foreground">
                  Category Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id={`cat-name-${cat.id}`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={`cat-desc-${cat.id}`} className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <Textarea
                  id={`cat-desc-${cat.id}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
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
              Delete Category
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category 
              <span className="font-semibold text-foreground"> "{cat.name}" </span> from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteCategory(cat.id)}
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