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

export default function CategoryTable({
  categories,
  handleSaveCategory, // Function to call when saving edits
  handleDeleteCategory, 
}) {
  return (
    <div className="catalog-table-card">
      <h3 className="text-lg font-semibold mb-4">Categories</h3>

      <div className="catalog-table-wrapper border rounded-md">
        <Table className="catalog-table">
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="action-col text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!categories || categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="empty-row text-center h-24 text-muted-foreground">
                  No categories created yet.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <CategoryRow 
                  key={cat.id} 
                  cat={cat} 
                  handleSaveCategory={handleSaveCategory}
                  handleDeleteCategory={handleDeleteCategory}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Extracted row component to maintain local state for editing each category form
function CategoryRow({ cat, handleSaveCategory, handleDeleteCategory }) {
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
          
          {/* EDIT BUTTON (Uses Shadcn Dialog) */}
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

          {/* DELETE BUTTON (Uses Shadcn AlertDialog) */}
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

              {/* Directly execute deletion here */}
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