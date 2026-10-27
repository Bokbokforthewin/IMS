import React, { useState } from 'react';
import { Tag, AlignLeft, Save } from 'lucide-react';
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
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedCategories = categories.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* 1. Category Creation Form Card */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Add Quick Category</h3>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <FieldLabel
                htmlFor="category_name"
                className="flex items-center gap-2"
              >
                <Tag className="w-4 h-4 text-muted-foreground" />
                Category Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="category_name"
                type="text"
                required
                placeholder="e.g. IT Equipment"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel
                htmlFor="category_description"
                className="flex items-center gap-2"
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
              />
            </Field>
          </FieldGroup>

          <Button type="submit" className="mt-4 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Category
          </Button>
        </form>
      </div>

      {/* 2. Category List Table */}
      <div className="catalog-table-card rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Existing Categories</h3>

        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Category Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedCategories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center h-24 text-muted-foreground"
                  >
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

        {/* Footer Controls: Pagination */}
        <div className="flex items-center justify-between gap-4 px-2 py-4">
          <Field
            orientation="horizontal"
            className="w-fit flex items-center gap-2"
          >
            <FieldLabel htmlFor="select-rows-per-page">Rows per page</FieldLabel>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(val) => {
                setItemsPerPage(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20" id="select-rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((prev) => Math.max(prev - 1, 1));
                  }}
                  className={
                    validPage === 1
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                  }}
                  className={
                    validPage >= totalPages
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}

// Extracted Category Row Component
function CategoryRow({ cat, handleSaveCategory, handleDeleteCategory }) {
  const [name, setName] = useState(cat.name);
  const [description, setDescription] = useState(cat.description || '');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    handleSaveCategory({ ...cat, name, description });
    setIsEditOpen(false);
  };

  return (
    <TableRow>
      <TableCell className="font-bold">{cat.name}</TableCell>
      <TableCell>{cat.description || 'N/A'}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {/* EDIT DIALOG */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmitEdit}>
                <DialogHeader>
                  <DialogTitle>Edit Category</DialogTitle>
                  <DialogDescription>
                    Update category details below and click save.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor={`cat-name-${cat.id}`}
                      className="text-sm font-medium"
                    >
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
                    <label
                      htmlFor={`cat-desc-${cat.id}`}
                      className="text-sm font-medium"
                    >
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
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will delete the category{' '}
                  <span className="font-bold text-foreground">"{cat.name}"</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}