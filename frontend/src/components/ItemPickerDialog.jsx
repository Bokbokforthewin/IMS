import React, { useState, useMemo } from 'react';
import { Search, Check, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ItemPickerDialog({
  items = [],
  categories = [],
  value,
  onSelect,
  disabled = false,
  placeholder = 'Select an item...',
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Find currently selected item
  const selectedItem = useMemo(() => {
    if (!value) return null;
    return items.find((item) => String(item.id) === String(value));
  }, [items, value]);

  // Filter items by category and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Filter by Category
      if (selectedCategory !== 'ALL') {
        const itemCatId = item.category_id || item.category?.id;
        if (String(itemCatId) !== String(selectedCategory)) {
          return false;
        }
      }

      // 2. Filter by Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const name = item.name || item.item_name || '';
        const code = item.code || item.item_code || item.sku || '';
        const categoryName =
          item.category_name ||
          categories.find(
            (c) => String(c.id) === String(item.category_id || item.category?.id)
          )?.name ||
          '';

        return (
          name.toLowerCase().includes(query) ||
          code.toLowerCase().includes(query) ||
          categoryName.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [items, categories, selectedCategory, searchQuery]);

  const handleSelect = (item) => {
    if (onSelect) {
      onSelect(item);
    }
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal text-left h-9 px-3"
        >
          <span className="truncate pr-2">
            {selectedItem
              ? `${selectedItem.name || selectedItem.item_name} ${
                  selectedItem.code || selectedItem.item_code
                    ? `(${selectedItem.code || selectedItem.item_code})`
                    : ''
                }`
              : placeholder}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 opacity-50">
            {selectedItem && (
              <X
                className="h-4 w-4 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleClear}
              />
            )}
            <Search className="h-4 w-4" />
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[92vw] sm:max-w-[550px] p-0 overflow-hidden gap-0 box-border rounded-xl">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 w-full overflow-hidden box-border">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2 min-w-0">
            <Package className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="truncate">Select Item</span>
          </DialogTitle>
        </DialogHeader>

        {/* Filter and Search Controls */}
        <div className="px-5 pb-4 space-y-3 border-b w-full box-border overflow-hidden">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search item name, code, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full box-border"
              autoFocus
            />
          </div>

          {categories.length > 0 && (
            <div className="w-full overflow-x-auto pb-1 max-w-full">
              <div className="flex gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors shrink-0 ${
                    selectedCategory === 'ALL'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(String(cat.id))}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors shrink-0 ${
                      String(selectedCategory) === String(cat.id)
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Items Scroll Area */}
        <div className="max-h-[350px] overflow-y-auto px-4 py-3 w-full box-border">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No items found matching your filter criteria.
            </div>
          ) : (
            <div className="space-y-1.5 w-full">
              {filteredItems.map((item) => {
                const isSelected = String(item.id) === String(value);
                const categoryName =
                  item.category_name ||
                  categories.find(
                    (c) => String(c.id) === String(item.category_id || item.category?.id)
                  )?.name;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors w-full box-border ${
                      isSelected
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1 pr-3 space-y-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-sm font-medium">
                          {item.name || item.item_name}
                        </span>
                        {categoryName && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {categoryName}
                          </Badge>
                        )}
                      </div>
                      {(item.code || item.item_code || item.sku) && (
                        <span className="text-xs text-muted-foreground truncate font-mono">
                          Code: {item.code || item.item_code || item.sku}
                        </span>
                      )}
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}