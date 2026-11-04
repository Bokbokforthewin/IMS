import React, { useState } from 'react';
import { Tag, AlignLeft, Save, FolderPlus, Layers, Pencil, Trash2 } from 'lucide-react';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function QuickCategoryForm({
  categories = [],
  handleApiCall,
  onSuccess,
}) {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Handle Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof handleApiCall === 'function') {
      handleApiCall('/categories', formData, () => {
        setFormData({ name: '', description: '' });
        if (typeof onSuccess === 'function') onSuccess();
      });
    }
  };

  // Inline Category Save/Update Handler
  const handleSaveCategory = (updatedCat) => {
    if (typeof handleApiCall === 'function') {
      handleApiCall(
        `/categories/${updatedCat.id}`,
        updatedCat,
        () => {
          if (typeof onSuccess === 'function') onSuccess();
        },
        'PUT'
      );
    }
  };

  // Inline Category Delete Handler
  const handleDeleteCategory = (categoryId) => {
    if (typeof handleApiCall === 'function') {
      handleApiCall(
        `/categories/${categoryId}`,
        {},
        () => {
          if (typeof onSuccess === 'function') onSuccess();
        },
        'DELETE'
      );
    }
  };

  // Dynamic Pagination Calculations
  const totalItems = categories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const validPage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedCategories = categories.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleRowsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 1. Category Creation Form Card */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
        {/* Task Title Header */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <FolderPlus className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Add Quick Category
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <FieldLabel
                htmlFor="category_name"
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
              >
                <Tag className="w-4 h-4 text-muted-foreground" />
                Category Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="category_name"
                type="text"
                required
                placeholder="e.g., IT Equipment, Office Supplies"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1.5 w-full"
              />
            </Field>

            <Field>
              <FieldLabel
                htmlFor="category_description"
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
              >
                <AlignLeft className="w-4 h-4 text-muted-foreground" />
                Description
              </FieldLabel>
              <Textarea
                id="category_description"
                rows={1}
                placeholder="Brief category description..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="mt-1.5 w-full resize-none min-h-[38px]"
              />
            </Field>
          </FieldGroup>

          <div className="pt-2">
            <Button type="submit" className="w-full sm:w-auto min-w-[140px] flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              Save Category
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Category List Table & Card Container */}
      <div className="min-w-0 w-full rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
        {/* Table Title Header */}
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
              {/* DESKTOP VIEW */}
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

              {/* MOBILE STACKED VIEW */}
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

        {/* Footer Controls: Pagination */}
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
                    className={validPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                    }}
                    className={validPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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

// Extracted Category Actions Component
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
              <Button type="submit" className="w-full sm:w-auto min-w-[140px] flex items-center justify-center gap-2">
                Save Changes
              </Button>
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
              This action cannot be undone. This will permanently delete the category{' '}
              <span className="font-semibold text-foreground">"{cat.name}"</span> from the database.
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