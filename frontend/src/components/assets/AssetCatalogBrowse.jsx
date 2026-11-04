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
  RotateCcw,
  Layers,
  ArrowRight,
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
            size="sm"
            disabled={cart.length === 0}
            onClick={onProceed}
            className="h-9 text-xs gap-1.5 px-3 shrink-0"
          >
            <span>Proceed</span>
            {cart.length > 0 && (
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground text-[10px] h-4 px-1">
                {cart.length}
              </Badge>
            )}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Empty States */}
      {groupedAssets.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No available assets to display in the catalog.
        </div>
      ) : filteredGroupedAssets.length === 0 ? (
        <div className="flex flex-col h-36 items-center justify-center text-center text-xs text-muted-foreground gap-3 border border-dashed border-border rounded-lg bg-muted/20">
          <span>No assets found matching "{searchQuery}".</span>
          <Button
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
        /* Asset Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-2xs transition-all hover:shadow-sm"
              >
                {/* Hero Image Header Section */}
                <div className="relative aspect-4/3 w-full bg-muted/40 overflow-hidden border-b border-border flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={itemName}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
                      <Package className="size-8 stroke-[1.5]" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">No Preview</span>
                    </div>
                  )}

                  {/* Overlaid Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider border bg-info-soft text-info-text border-info-border">
                      Asset
                    </span>
                    {isBundled && (
                      <Badge variant="outline" className="bg-card/90 backdrop-blur-xs text-[10px] px-1.5 py-0 border-border">
                        Bundled ({children.length})
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant="secondary" className="bg-card/90 backdrop-blur-xs text-[10px] font-bold border border-border">
                      {cost >= 50000 ? 'PAR' : 'ICS'}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="p-3.5 pb-2">
                  <CardTitle className="text-sm font-semibold line-clamp-1 text-foreground">
                    {brandName}{itemName}
                  </CardTitle>
                  <p className="text-[11px] font-medium text-muted-foreground truncate">
                    {categoryName || primary.property_number || primary.reference_no || itemCode}
                  </p>
                </CardHeader>

                <CardContent className="px-3.5 py-1.5 flex-1 space-y-2">
                  <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Property No.</dt>
                    <dd className="text-right font-medium text-foreground truncate">
                      {primary.property_number || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground font-medium pt-1 border-t border-border/50">Unit Cost</dt>
                    <dd className="text-right font-semibold text-xs text-foreground pt-1 border-t border-border/50">
                      {money(cost)}
                    </dd>
                  </dl>

                  {isBundled && (
                    <p className="text-[11px] text-muted-foreground truncate border-t border-border/60 pt-2">
                      <span className="font-semibold text-foreground">Includes:</span>{' '}
                      {children
                        .map((c) => c.item?.name || c.item_name || 'Peripheral')
                        .join(', ')}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="p-3.5 pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8 gap-1.5"
                    onClick={() => openDetails({ primary, children })}
                  >
                    <Eye className="size-3.5" />
                    Details
                  </Button>

                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8 gap-1.5"
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
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground flex items-center justify-between gap-2">
              <span className="truncate">
                {detailsGroup?.primary?.item?.name ||
                  detailsGroup?.primary?.item_name ||
                  'Asset Details'}
              </span>
              {detailsGroup?.children.length > 0 && (
                <Badge variant="outline" className="bg-card text-[11px] font-normal border-border shrink-0">
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
                        <span className="font-semibold text-xs text-foreground truncate">{rowName}</span>
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
                        Item Code: <span className="font-medium text-muted-foreground">{rowCode}</span>
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/60 pt-2.5">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="text-right font-medium text-foreground">{rowCategory}</dd>

                    <dt className="text-muted-foreground">Property No.</dt>
                    <dd className="text-right font-medium text-foreground">
                      {row.property_number || 'N/A'}
                    </dd>

                    {row.reference_no && (
                      <>
                        <dt className="text-muted-foreground">Reference No.</dt>
                        <dd className="text-right font-medium text-foreground">{row.reference_no}</dd>
                      </>
                    )}

                    {row.serial_number && (
                      <>
                        <dt className="text-muted-foreground">Serial Number</dt>
                        <dd className="text-right font-medium text-foreground">{row.serial_number}</dd>
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
                        <dd className="text-right text-foreground">{row.manufacturer_name}</dd>
                      </>
                    )}

                    {row.country_of_origin && (
                      <>
                        <dt className="text-muted-foreground">Country of Origin</dt>
                        <dd className="text-right text-foreground">{row.country_of_origin}</dd>
                      </>
                    )}

                    <dt className="text-muted-foreground font-medium">Unit Cost</dt>
                    <dd className="text-right font-semibold text-foreground">{money(row.unit_cost)}</dd>
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