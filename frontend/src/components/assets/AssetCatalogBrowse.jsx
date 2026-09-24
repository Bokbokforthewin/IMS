import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
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

  const fields = [
    asset.property_number,
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
 * Supports matching attached_to by either parent ID or property_number.
 */
function groupAssets(assets) {
  const byPropertyNumber = {};
  const byId = {};

  assets.forEach((asset) => {
    if (asset.property_number) {
      byPropertyNumber[asset.property_number] = asset;
    }
    if (asset.id) {
      byId[asset.id] = asset;
    }
  });

  const childrenByParentKey = {};

  assets.forEach((asset) => {
    const attachedTo = asset.attached_to;
    if (attachedTo) {
      // Resolve whether attached_to points to property_number or primary ID
      let parentKey = null;
      if (byPropertyNumber[attachedTo]) {
        parentKey = byPropertyNumber[attachedTo].id;
      } else if (byId[attachedTo]) {
        parentKey = attachedTo;
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
      // Exclude children from top-level rendering
      if (
        asset.attached_to &&
        (byPropertyNumber[asset.attached_to] || byId[asset.attached_to])
      ) {
        return false;
      }
      return true;
    })
    .map((primary) => ({
      primary,
      children: childrenByParentKey[primary.id] || [],
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

  const assets = catalog.serialized || catalog.assets || [];

  const groupedAssets = useMemo(
    () => groupAssets(assets),
    [assets]
  );

  // Filters primary assets AND attached peripherals against the search query
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
          <p className="text-sm text-muted-foreground mt-1">
            Select an available asset for accountability issuance.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* shadcn Input with Search Icon */}
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search assets, serials, codes, specs..."
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGroupedAssets.map(({ primary, children }) => {
            const cartKey = `a-${primary.id}`;
            const inCart = cart.some((c) => c.key === cartKey);
            const cost = Number(primary.unit_cost || 0);
            const isBundled = children.length > 0;
            const itemName = primary.item?.name || primary.item_name || 'Asset Item';
            const itemCode = primary.item?.item_code || primary.item_code || 'N/A';
            const brandName = primary.item?.brand ? `${primary.item.brand} - ` : '';

            return (
              <Card key={primary.id} className="flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex gap-1">
                        <Badge variant="default">Asset</Badge>
                        {isBundled && <Badge variant="outline">Bundled ({children.length})</Badge>}
                      </div>
                      <Badge variant="outline">
                        {cost >= 50000 ? 'PAR' : 'ICS'}
                      </Badge>
                    </div>

                    <CardTitle className="text-base line-clamp-1">
                      {brandName}{itemName}
                    </CardTitle>
                    {(primary.property_number || itemCode !== 'N/A') && (
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {primary.property_number || itemCode}
                      </p>
                    )}
                  </CardHeader>
                </div>

                <CardFooter className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openDetails({ primary, children })}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Details
                  </Button>

                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={inCart}
                    onClick={() => addAssetToCart(primary, children)}
                  >
                    {inCart ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 h-3.5 w-3.5" />
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
            <AlertDialogTitle>
              {detailsGroup?.primary?.item?.name || detailsGroup?.primary?.item_name || 'Asset Details'}
              {detailsGroup?.children.length > 0 && ` + ${detailsGroup.children.length} bundled item(s)`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Full asset specification and attached peripherals.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {allDetailRows.map((row, idx) => {
              const rowName = row.item?.name || row.item_name || 'Asset Item';
              const rowCode = row.item?.item_code || row.item_code || 'N/A';
              const isMain = idx === 0;

              return (
                <div key={row.id || idx} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{rowName}</div>
                    <Badge variant={isMain ? 'default' : 'secondary'}>
                      {isMain ? 'Main Asset' : 'Peripheral'}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Item Code</dt>
                    <dd className="text-right">{rowCode}</dd>

                    <dt className="text-muted-foreground">Property No.</dt>
                    <dd className="text-right">{row.property_number || 'N/A'}</dd>

                    {row.serial_number && (
                      <>
                        <dt className="text-muted-foreground">Serial Number</dt>
                        <dd className="text-right font-mono">{row.serial_number}</dd>
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

      {/* Proceed Section */}
      <div className="flex justify-end border-t pt-4">
        <Button
          size="lg"
          disabled={cart.length === 0}
          onClick={onProceed}
        >
          Proceed
          {cart.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {cart.length}
            </Badge>
          )}
        </Button>
      </div>

    </div>
  );
}