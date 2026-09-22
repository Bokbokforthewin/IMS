import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Modal({ isOpen, title, onClose, children }) {
  return (
    // onOpenChange fires when the user clicks the overlay or presses Escape
    // It passes a boolean, so if it's false, we trigger your onClose function
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* You can adjust sm:max-w-[425px] to make the modal wider or narrower */}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}