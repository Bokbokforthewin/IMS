import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
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
  Eye,
  Search,
  X,
  Layers,
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
 * Coerces IDs, property numbers, and reference numbers to strings for matching.
 */
function groupAssets(assets) {
  if (!Array.isArray(assets)) return [];

  const byPropertyNumber = {};
  const byReferenceNo = {};
  const byId = {};

  // Build lookup maps for parent lookup
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
          return false; // Hide attached child assets from the top-level grid
        }
      }
      return true;
    })
    .map((primary) => ({
      primary,
      children: childrenByParentKey[String(primary.id)] || [],
    }));
}

export default function AssetCatalogBrowse({
  catalog = {},
  cart = [],
  addAssetToCart,
  onProceed,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsGroup, setDetailsGroup] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const rawAssets =
    catalog?.serialized || catalog?.assets || (Array.isArray(catalog) ? catalog : []);
  const assets = Array.isArray(rawAssets) ? rawAssets : [];

  const groupedAssets = useMemo(() => groupAssets(assets), [assets]);

  const filteredGroupedAssets = useMemo(() => {
    if (!searchQuery.trim()) return groupedAssets;
    const query = searchQuery.trim();

    return groupedAssets.filter(({ primary, children }) => {
      const primaryMatches = isAssetMatch(primary, query);
      const childMatches = children.some((child) => isAssetMatch(child, query));
      return primaryMatches || childMatches;
    });
  }, [groupedAssets, searchQuery]);

  const openDetails = (group) => {
    setDetailsGroup(group);
    setIsDetailsOpen(true);
  };

  const allDetailRows = detailsGroup ? [detailsGroup.primary, ...detailsGroup.children] : [];

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Browse Assets</h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search category, property no, serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Badge variant="secondary" className="whitespace-nowrap">
            {filteredGroupedAssets.length} {filteredGroupedAssets.length === 1 ? 'Asset' : 'Assets'}
          </Badge>
        </div>
      </div>

      {/* Proceed Section */}
      <div className="flex justify-end border-t pt-4">
        <Button size="lg" disabled={cart.length === 0} onClick={onProceed}>
          Proceed
          {cart.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {cart.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Empty States */}
      {groupedAssets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No available assets to display.
          </p>
        </div>
      ) : filteredGroupedAssets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No assets found matching "{searchQuery}".
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setSearchQuery('')}
          >
            Clear Search
          </Button>
        </div>
      ) : (
        /* Asset Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredGroupedAssets.map(({ primary, children }) => {
            const cartKey = `a-${primary.id}`;
            const inCart = cart.some((c) => c.key === cartKey);
            const cost = Number(primary.unit_cost || 0);
            const isBundled = children.length > 0;
            const itemName = primary.item?.name || primary.item_name || 'Asset Item';
            const itemCode = primary.item?.item_code || primary.item_code || 'N/A';
            const brandName = primary.item?.brand ? `${primary.item.brand} ` : '';
            
            // Resolve image URL
            const imageUrl = primary.item?.image_url || primary.image_url || primary.item_image_url;

            const categoryName =
              primary.category_name ||
              primary.category?.name ||
              primary.item?.category_name ||
              primary.item?.category?.name ||
              null;

            return (
              <Card 
                key={primary.id} 
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md"
              >
                {/* Large Hero Card Image Header */}
                <div className="relative aspect-4/3 w-full bg-muted/40 overflow-hidden border-b flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={itemName}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
                      <Package className="size-10 stroke-[1.5]" />
                      <span className="text-[11px] font-medium uppercase tracking-wider">No Image</span>
                    </div>
                  )}

                  {/* Overlaid Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <Badge variant="default" className="shadow-xs text-[10px]">
                      Asset
                    </Badge>
                    {isBundled && (
                      <Badge variant="outline" className="bg-background/90 backdrop-blur-xs shadow-xs text-[10px]">
                        Bundled ({children.length})
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-xs shadow-xs text-[10px] font-bold">
                      {cost >= 50000 ? 'PAR' : 'ICS'}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-bold line-clamp-1">
                    {brandName}{itemName}
                  </CardTitle>
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {categoryName || primary.property_number || primary.reference_no || itemCode}
                  </p>
                </CardHeader>

                <CardContent className="px-4 py-2 flex-1">
                  <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Property No.</dt>
                    <dd className="text-right font-mono text-[11px] font-medium truncate">
                      {primary.property_number || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground font-medium pt-1">Unit Cost</dt>
                    <dd className="text-right font-bold text-sm text-foreground pt-1">
                      {money(cost)}
                    </dd>
                  </dl>

                  {isBundled && (
                    <p className="text-[11px] text-muted-foreground mt-2 truncate border-t pt-1.5">
                      <span className="font-semibold text-foreground">Includes:</span>{' '}
                      {children
                        .map((c) => c.item?.name || c.item_name || 'Peripheral')
                        .join(', ')}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="p-4 pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => openDetails({ primary, children })}
                  >
                    <Eye className="size-3.5" />
                    Details
                  </Button>

                  <Button
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    disabled={inCart}
                    onClick={() => addAssetToCart(primary, children)}
                  >
                    {inCart ? (
                      <>
                        <Check className="size-3.5" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" />
                        Add Asset
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Details Modal */}
      <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span>
                {detailsGroup?.primary?.item?.name ||
                  detailsGroup?.primary?.item_name ||
                  'Asset Details'}
              </span>
              {detailsGroup?.children.length > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  <Layers className="mr-1 h-3.5 w-3.5" />
                  + {detailsGroup.children.length} bundled peripheral(s)
                </Badge>
              )}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {allDetailRows.map((row, idx) => {
              const rowName = row.item?.name || row.item_name || 'Asset Item';
              const rowCode = row.item?.item_code || row.item_code || 'N/A';
              const isMain = idx === 0;
              const rowImageUrl = row.item?.image_url || row.image_url || row.item_image_url;

              const rowCategory =
                row.category_name ||
                row.category?.name ||
                row.item?.category_name ||
                row.item?.category?.name ||
                'N/A';

              return (
                <div
                  key={row.id || idx}
                  className={`border rounded-md p-3.5 ${
                    isMain ? 'bg-muted/30 border-muted-foreground/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {rowImageUrl ? (
                        <img
                          src={rowImageUrl}
                          alt={rowName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Package className="size-8 text-muted-foreground/60" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm truncate">{rowName}</div>
                        <Badge variant={isMain ? 'default' : 'secondary'}>
                          {isMain ? 'Main Asset' : 'Peripheral / Bundled Item'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{rowCode}</p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm border-t pt-2">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="text-right font-medium text-xs">{rowCategory}</dd>

                    <dt className="text-muted-foreground">Item Code</dt>
                    <dd className="text-right font-mono text-xs">{rowCode}</dd>

                    <dt className="text-muted-foreground">Property No.</dt>
                    <dd className="text-right font-mono text-xs">
                      {row.property_number || 'N/A'}
                    </dd>

                    {row.reference_no && (
                      <>
                        <dt className="text-muted-foreground">Reference No.</dt>
                        <dd className="text-right font-mono text-xs">{row.reference_no}</dd>
                      </>
                    )}

                    {row.serial_number && (
                      <>
                        <dt className="text-muted-foreground">Serial Number</dt>
                        <dd className="text-right font-mono text-xs">{row.serial_number}</dd>
                      </>
                    )}

                    {row.model && (
                      <>
                        <dt className="text-muted-foreground">Model</dt>
                        <dd className="text-right">{row.model}</dd>
                      </>
                    )}

                    {row.manufacturer_name && (
                      <>
                        <dt className="text-muted-foreground">Manufacturer</dt>
                        <dd className="text-right">{row.manufacturer_name}</dd>
                      </>
                    )}

                    {row.country_of_origin && (
                      <>
                        <dt className="text-muted-foreground">Country of Origin</dt>
                        <dd className="text-right">{row.country_of_origin}</dd>
                      </>
                    )}

                    <dt className="text-muted-foreground font-medium">Unit Cost</dt>
                    <dd className="text-right font-semibold">{money(row.unit_cost)}</dd>
                  </dl>
                </div>
              );
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}