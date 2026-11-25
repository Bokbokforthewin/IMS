import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Package,
  Check,
  Plus,
  X,
  Eye,
  Search,
  RotateCcw,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

function money(value) {
  return `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;
}

/**
 * Helper to check if an asset object matches the search query across any property.
 */
function isAssetMatch(asset, query) {
  if (!asset || !query) return false;
  const q = query.toLowerCase();

  const cost = Number(asset.unit_cost || 0);
  const badgeType = cost >= 50000 ? 'par' : 'ics';

  const categoryName =
    asset.category_name ||
    asset.category?.name ||
    asset.item?.category_name ||
    asset.item?.category?.name ||
    '';

  const fields = [
    categoryName,
    asset.property_number,
    asset.reference_no,
    asset.serial_number,
    asset.model,
    asset.manufacturer_name,
    asset.country_of_origin,
    asset.item_name,
    asset.item_code,
    asset.item?.name,
    asset.item?.item_code,
    asset.item?.brand,
    cost.toString(),
    badgeType,
  ];

  return fields.some(
    (field) => field && String(field).toLowerCase().includes(q)
  );
}

/**
 * Groups serialized assets into primary items and attached child peripherals.
 */
function groupAssets(assets) {
  if (!Array.isArray(assets)) return [];

  const byPropertyNumber = {};
  const byReferenceNo = {};
  const byId = {};

  assets.forEach((asset) => {
    if (asset.id != null) {
      byId[String(asset.id).trim()] = asset;
    }
    if (asset.property_number != null) {
      byPropertyNumber[String(asset.property_number).trim()] = asset;
    }
    if (asset.reference_no != null) {
      byReferenceNo[String(asset.reference_no).trim()] = asset;
    }
  });

  const childrenByParentKey = {};

  assets.forEach((asset) => {
    const rawAttachedTo =
      asset.attached_to ?? asset.attached_to_id ?? asset.parent_id ?? asset.attachedTo;

    if (rawAttachedTo != null) {
      const attachedTo = String(rawAttachedTo).trim();
      let parentKey = null;

      if (byId[attachedTo]) {
        parentKey = String(byId[attachedTo].id);
      } else if (byPropertyNumber[attachedTo]) {
        parentKey = String(byPropertyNumber[attachedTo].id);
      } else if (byReferenceNo[attachedTo]) {
        parentKey = String(byReferenceNo[attachedTo].id);
      }

      if (parentKey) {
        if (!childrenByParentKey[parentKey]) {
          childrenByParentKey[parentKey] = [];
        }
        childrenByParentKey[parentKey].push(asset);
      }
    }
  });

  return assets
    .filter((asset) => {
      const rawAttachedTo =
        asset.attached_to ?? asset.attached_to_id ?? asset.parent_id ?? asset.attachedTo;
      if (rawAttachedTo != null) {
        const attachedTo = String(rawAttachedTo).trim();
        if (byId[attachedTo] || byPropertyNumber[attachedTo] || byReferenceNo[attachedTo]) {
          return false;
        }
      }
      return true;
    })
    .map((primary) => ({
      primary,
      children: childrenByParentKey[String(primary.id)] || [],
    }));
}

function getItemGroupKey(asset) {
  const itemId = asset.item_id ?? asset.item?.id;
  const itemCode = asset.item_code ?? asset.item?.item_code;
  const itemName = asset.item_name ?? asset.item?.name ?? 'Asset Item';
  return `item-${itemId || itemCode || itemName}`;
}

export default function AssetCatalogBrowse({
  catalog = {},
  cart = [],
  addAssetToCart,
  removeAssetFromCart,
  onRemoveFromCart,
  onCartChange,
  setCart,
  onProceed,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localCart, setLocalCart] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const [detailsGroup, setDetailsGroup] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Use parent cart when provided; mirror removals cleanly if parent doesn't pass a setter/handler
  const effectiveCart = useMemo(() => {
    if (!Array.isArray(cart)) return localCart;
    if (
      typeof removeAssetFromCart === 'function' ||
      typeof onRemoveFromCart === 'function' ||
      typeof onCartChange === 'function' ||
      typeof setCart === 'function'
    ) {
      return cart;
    }
    return cart.filter((item) => !localCart.some((rem) => rem.key === item.key));
  }, [cart, localCart, removeAssetFromCart, onRemoveFromCart, onCartChange, setCart]);

  const rawAssets =
    catalog?.serialized || catalog?.assets || (Array.isArray(catalog) ? catalog : []);
  const assets = Array.isArray(rawAssets) ? rawAssets : [];

  const groupedAssets = useMemo(() => groupAssets(assets), [assets]);

  // Group standalone asset entries that share the same item into a single expandable row
  const itemBuckets = useMemo(() => {
    const map = new Map();

    groupedAssets.forEach((entry) => {
      const key = getItemGroupKey(entry.primary);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(entry);
    });

    return Array.from(map.entries()).map(([key, entries]) => {
      const primary = entries[0].primary;
      const allUnits = entries.flatMap((e) => [e.primary, ...e.children]);
      const totalCost = entries.reduce(
        (sum, e) => sum + Number(e.primary.unit_cost || 0),
        0
      );

      return {
        key,
        primary,
        entries,
        allUnits,
        totalCost,
      };
    });
  }, [groupedAssets]);

  const filteredBuckets = useMemo(() => {
    if (!searchQuery.trim()) return itemBuckets;
    const query = searchQuery.trim();

    return itemBuckets.filter(({ allUnits }) =>
      allUnits.some((unit) => isAssetMatch(unit, query))
    );
  }, [itemBuckets, searchQuery]);

  const toggleExpand = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleAssetCart = (e, unit, children = []) => {
    e?.stopPropagation?.();
    const key = `a-${unit.id}`;
    const childKeys = new Set((children || []).map((c) => `a-${c.id}`));
    const exists = effectiveCart.some((c) => c.key === key);

    if (!exists) {
      setLocalCart((prev) => prev.filter((item) => item.key !== key && !childKeys.has(item.key)));
      addAssetToCart?.(unit, children);
      return;
    }

    if (typeof removeAssetFromCart === 'function') {
      removeAssetFromCart(unit, children);
    } else if (typeof onRemoveFromCart === 'function') {
      onRemoveFromCart(key, unit, children);
    } else if (typeof setCart === 'function') {
      setCart((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (item) => item.key !== key && !childKeys.has(item.key) && item.parentId !== unit.id
        )
      );
    } else if (typeof onCartChange === 'function') {
      const nextCart = (Array.isArray(cart) ? cart : []).filter(
        (item) => item.key !== key && !childKeys.has(item.key) && item.parentId !== unit.id
      );
      onCartChange(nextCart);
    } else {
      // Fallback when parent only passes `cart` and `addAssetToCart`
      setLocalCart((prev) => [
        ...prev.filter((item) => item.key !== key),
        { key, parentId: unit.id },
      ]);
      addAssetToCart?.(unit, children);
    }
  };

  const openDetails = (e, unit, children = []) => {
    e?.stopPropagation?.();
    setDetailsGroup({ primary: unit, children });
    setIsDetailsOpen(true);
  };

  const allDetailRows = detailsGroup
    ? [detailsGroup.primary, ...(detailsGroup.children || [])]
    : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
      {/* Task Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Browse Asset Inventory Catalog
          </h3>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search property, serial, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button
            type="button"
            size="sm"
            disabled={effectiveCart.length === 0}
            onClick={onProceed}
            className="h-9 text-xs gap-1.5 px-3 shrink-0"
          >
            <span>Proceed</span>
            {effectiveCart.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-primary-foreground/20 text-primary-foreground text-[10px] h-4 px-1"
              >
                {effectiveCart.length}
              </Badge>
            )}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Empty States */}
      {itemBuckets.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No available assets to display in the catalog.
        </div>
      ) : filteredBuckets.length === 0 ? (
        <div className="flex flex-col h-36 items-center justify-center text-center text-xs text-muted-foreground gap-3 border border-dashed border-border rounded-lg bg-muted/20">
          <span>No assets found matching "{searchQuery}".</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="text-xs h-8 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear Search
          </Button>
        </div>
      ) : (
        /* Expandable Asset Table */
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="w-8 py-2.5 pl-3 pr-1"></th>
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Total Cost</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBuckets.map((bucket) => {
                const { key, primary, entries, totalCost } = bucket;
                const isExpanded = expandedKeys.has(key);
                const hasMultipleUnits = entries.length > 1;
                const primaryEntry = entries[0];
                const cartKey = `a-${primary.id}`;
                const inCart = effectiveCart.some((c) => c.key === cartKey);
                const cost = Number(primary.unit_cost || 0);
                const itemName = primary.item?.name || primary.item_name || 'Asset Item';
                const itemCode = primary.item?.item_code || primary.item_code || 'N/A';
                const brandName = primary.item?.brand ? `${primary.item.brand} ` : '';
                const imageUrl =
                  primary.item?.image_url || primary.image_url || primary.item_image_url;
                const categoryName =
                  primary.category_name ||
                  primary.category?.name ||
                  primary.item?.category_name ||
                  primary.item?.category?.name ||
                  null;

                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={() => hasMultipleUnits && toggleExpand(key)}
                      className={`transition-colors ${
                        hasMultipleUnits ? 'cursor-pointer' : ''
                      } ${isExpanded ? 'bg-muted/40' : 'hover:bg-muted/25'}`}
                    >
                      <td className="py-2.5 pl-3 pr-1 text-muted-foreground">
                        {hasMultipleUnits ? (
                          isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )
                        ) : null}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted/40">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={itemName}
                                className="size-full object-cover"
                              />
                            ) : (
                              <Package className="size-4 text-muted-foreground/60" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground truncate">
                                {brandName}
                                {itemName}
                              </span>
                              {hasMultipleUnits && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1.5 text-[10px] font-medium gap-1"
                                >
                                  <Layers className="size-2.5" />
                                  {entries.length} units
                                </Badge>
                              )}
                            </div>
                            <span className="block text-[11px] text-muted-foreground truncate">
                              {categoryName || primary.reference_no || itemCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider border bg-info-soft text-info-text border-info-border">
                          {cost >= 50000 ? 'PAR' : 'ICS'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                        {money(hasMultipleUnits ? totalCost : cost)}
                      </td>

                      <td
                        className="py-2.5 px-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {!hasMultipleUnits && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1"
                                onClick={(e) =>
                                  openDetails(e, primaryEntry.primary, primaryEntry.children)
                                }
                              >
                                <Eye className="size-3" />
                                Details
                              </Button>

                              {inCart ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 px-2 text-[11px] gap-1 border border-border"
                                  onClick={(e) =>
                                    handleToggleAssetCart(
                                      e,
                                      primaryEntry.primary,
                                      primaryEntry.children
                                    )
                                  }
                                  title="Tap to cancel and remove from cart"
                                >
                                  <Check className="size-3 text-emerald-600" />
                                  <span>Added</span>
                                  <X className="size-3 text-muted-foreground" />
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] gap-1"
                                  onClick={(e) =>
                                    handleToggleAssetCart(
                                      e,
                                      primaryEntry.primary,
                                      primaryEntry.children
                                    )
                                  }
                                >
                                  <Plus className="size-3" />
                                  Add
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Dropdown Rows for Same Item */}
                    {isExpanded && hasMultipleUnits && (
                      <tr className="bg-muted/20">
                        <td colSpan={7} className="p-0">
                          <div className="border-t border-border/70 px-4 py-3 pl-11">
                            <div className="overflow-x-auto rounded-md border border-border bg-card">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    <th className="py-1.5 px-2.5">#</th>
                                    <th className="py-1.5 px-2.5">Property No.</th>
                                    <th className="py-1.5 px-2.5">Serial No.</th>
                                    <th className="py-1.5 px-2.5 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {entries.map((entry, idx) => {
                                    const unit = entry.primary;
                                    const unitCartKey = `a-${unit.id}`;
                                    const unitInCart = effectiveCart.some(
                                      (c) => c.key === unitCartKey
                                    );

                                    return (
                                      <tr
                                        key={unit.id || idx}
                                        className="hover:bg-muted/30 transition-colors"
                                      >
                                        <td className="py-2 px-2.5 font-mono text-[11px] text-muted-foreground">
                                          #{idx + 1}
                                        </td>
                                        <td className="py-2 px-2.5 font-mono text-[11px] text-foreground">
                                          {unit.property_number || 'N/A'}
                                        </td>
                                        <td className="py-2 px-2.5 font-mono text-[11px] text-muted-foreground">
                                          {unit.serial_number || 'N/A'}
                                        </td>
                                        <td className="py-2 px-2.5 text-right">
                                          <div className="inline-flex items-center justify-end gap-1.5">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="h-6 px-2 text-[11px] gap-1"
                                              onClick={(e) =>
                                                openDetails(e, unit, entry.children)
                                              }
                                            >
                                              <Eye className="size-3" />
                                              Details
                                            </Button>

                                            {unitInCart ? (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                className="h-6 px-2 text-[11px] gap-1 border border-border"
                                                onClick={(e) =>
                                                  handleToggleAssetCart(
                                                    e,
                                                    unit,
                                                    entry.children
                                                  )
                                                }
                                                title="Tap to cancel and remove from cart"
                                              >
                                                <Check className="size-3 text-emerald-600" />
                                                <span>Added</span>
                                                <X className="size-3 text-muted-foreground" />
                                              </Button>
                                            ) : (
                                              <Button
                                                type="button"
                                                size="sm"
                                                className="h-6 px-2 text-[11px] gap-1"
                                                onClick={(e) =>
                                                  handleToggleAssetCart(
                                                    e,
                                                    unit,
                                                    entry.children
                                                  )
                                                }
                                              >
                                                <Plus className="size-3" />
                                                Add
                                              </Button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View Details Modal */}
      <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground flex items-center justify-between gap-2">
              <span className="truncate">
                {detailsGroup?.primary?.item?.name ||
                  detailsGroup?.primary?.item_name ||
                  'Asset Details'}
              </span>
              {detailsGroup?.children?.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-card text-[11px] font-normal border-border shrink-0"
                >
                  <Layers className="mr-1 h-3 w-3 text-primary" />
                  + {detailsGroup.children.length} bundled peripheral(s)
                </Badge>
              )}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-2">
            {allDetailRows.map((row, idx) => {
              const rowName = row.item?.name || row.item_name || 'Asset Item';
              const rowCode = row.item?.item_code || row.item_code || 'N/A';
              const isMain = idx === 0;
              const rowImageUrl =
                row.item?.image_url || row.image_url || row.item_image_url;

              const rowCategory =
                row.category_name ||
                row.category?.name ||
                row.item?.category_name ||
                row.item?.category?.name ||
                'N/A';

              return (
                <div
                  key={row.id || idx}
                  className="border border-border rounded-lg bg-muted/30 p-3.5 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-md border border-border bg-card flex items-center justify-center overflow-hidden shrink-0">
                      {rowImageUrl ? (
                        <img
                          src={rowImageUrl}
                          alt={rowName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Package className="size-6 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {rowName}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                            isMain
                              ? 'bg-info-soft text-info-text border-info-border'
                              : 'bg-muted/80 text-muted-foreground border-border'
                          }`}
                        >
                          {isMain ? 'Main Asset' : 'Peripheral'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Item Code:{' '}
                        <span className="font-medium text-muted-foreground">
                          {rowCode}
                        </span>
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/60 pt-2.5">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="text-right font-medium text-foreground">
                      {rowCategory}
                    </dd>

                    <dt className="text-muted-foreground">Property No.</dt>
                    <dd className="text-right font-medium text-foreground">
                      {row.property_number || 'N/A'}
                    </dd>

                    {row.reference_no && (
                      <>
                        <dt className="text-muted-foreground">Reference No.</dt>
                        <dd className="text-right font-medium text-foreground">
                          {row.reference_no}
                        </dd>
                      </>
                    )}

                    {row.serial_number && (
                      <>
                        <dt className="text-muted-foreground">Serial Number</dt>
                        <dd className="text-right font-medium text-foreground">
                          {row.serial_number}
                        </dd>
                      </>
                    )}

                    {row.model && (
                      <>
                        <dt className="text-muted-foreground">Model</dt>
                        <dd className="text-right text-foreground">{row.model}</dd>
                      </>
                    )}

                    {row.manufacturer_name && (
                      <>
                        <dt className="text-muted-foreground">Manufacturer</dt>
                        <dd className="text-right text-foreground">
                          {row.manufacturer_name}
                        </dd>
                      </>
                    )}

                    {row.country_of_origin && (
                      <>
                        <dt className="text-muted-foreground">Country of Origin</dt>
                        <dd className="text-right text-foreground">
                          {row.country_of_origin}
                        </dd>
                      </>
                    )}

                    <dt className="text-muted-foreground font-medium">Unit Cost</dt>
                    <dd className="text-right font-semibold text-foreground">
                      {money(row.unit_cost)}
                    </dd>
                  </dl>
                </div>
              );
            })}
          </div>

          <AlertDialogFooter className="pt-2 border-t border-border">
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}