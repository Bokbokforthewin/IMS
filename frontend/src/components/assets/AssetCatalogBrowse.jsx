
import React, { useMemo } from 'react';
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
import {
  Package,
  Check,
  Plus,
} from 'lucide-react';

/*
 * Group serialized assets by their attached_to relationship.
 *
 * Primary asset:
 *   attached_to = null
 *
 * Attached asset:
 *   attached_to = primary.property_number
 *
 * A standalone asset is simply a group with no children.
 */
function groupAssets(assets) {
  const byPropertyNumber = {};

  assets.forEach((asset) => {
    if (asset.property_number) {
      byPropertyNumber[asset.property_number] = asset;
    }
  });

  const childrenByParent = {};

  assets.forEach((asset) => {
    const attachedTo = asset.attached_to;

    if (
      attachedTo &&
      byPropertyNumber[attachedTo]
    ) {
      if (!childrenByParent[attachedTo]) {
        childrenByParent[attachedTo] = [];
      }

      childrenByParent[attachedTo].push(asset);
    }
  });

  return assets
    .filter((asset) => {
      /*
       * If this asset is attached to another asset
       * in the current catalog, don't render it as
       * a separate top-level card.
       */
      if (
        asset.attached_to &&
        byPropertyNumber[asset.attached_to]
      ) {
        return false;
      }

      return true;
    })
    .map((primary) => ({
      primary,
      children: primary.property_number
        ? childrenByParent[primary.property_number] || []
        : [],
    }));
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;
}

export default function AssetCatalogBrowse({
  catalog = {},
  cart = [],
  addAssetToCart,
  onProceed,
}) {
  /*
   * Extract serialized assets from the same
   * catalog structure currently being used.
   */
  const assets = catalog.serialized || catalog.assets || [];

  /*
   * Group assets into primary + attached assets.
   */
  const groupedAssets = useMemo(
    () => groupAssets(assets),
    [assets]
  );

  return (
    <div className="space-y-6">

      {/* =====================================================
          Header
          ===================================================== */}
      <div className="flex items-center justify-between gap-4">

        <div>
          <h2 className="text-lg font-semibold">
            Browse Assets
          </h2>

          <p className="text-sm text-muted-foreground mt-1">
            Select an available asset for accountability issuance.
          </p>
        </div>

        <Badge variant="secondary">
          {groupedAssets.length}{' '}
          {groupedAssets.length === 1
            ? 'Asset'
            : 'Assets'}
        </Badge>

      </div>

      {/* =====================================================
          Empty State
          ===================================================== */}
      {groupedAssets.length === 0 ? (

        <div className="rounded-lg border border-dashed p-8 text-center">

          <Package className="mx-auto h-10 w-10 text-muted-foreground" />

          <p className="mt-3 text-sm text-muted-foreground">
            No available assets to display.
          </p>

        </div>

      ) : (

        /* ===================================================
           Asset Grid
           =================================================== */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {groupedAssets.map(({ primary, children }) => {

            const cartKey = `a-${primary.id}`;

            const inCart = cart.some(
              (c) => c.key === cartKey
            );

            const cost = Number(
              primary.unit_cost || 0
            );

            const hasChildren =
              children.length > 0;

            return (
              <Card
                key={primary.id}
                className="overflow-hidden"
              >

                {/* =================================================
                    Image
                    ================================================= */}
                <div className="relative">

                  <img
                    src={
                      primary.item?.image_url ||
                      'https://via.placeholder.com/400x240?text=Asset'
                    }
                    alt={
                      primary.item?.name ||
                      'Asset'
                    }
                    className="aspect-video w-full object-cover"
                  />

                  {/* Availability */}
                  <div className="absolute left-3 top-3">
                    <Badge>
                      Available
                    </Badge>
                  </div>

                  {/* Bundle */}
                  {hasChildren && (
                    <div className="absolute right-3 top-3">
                      <Badge variant="secondary">
                        <Package className="mr-1 h-3.5 w-3.5" />
                        Bundled
                      </Badge>
                    </div>
                  )}

                </div>

                {/* =================================================
                    Main Information
                    ================================================= */}
                <CardHeader>

                  <div className="flex items-start justify-between gap-3">

                    <CardTitle className="text-base">
                      {primary.item?.brand
                        ? `${primary.item.brand} - `
                        : ''}
                      {primary.item?.name ||
                        'Asset Item'}
                    </CardTitle>

                    {cost >= 50000 && (
                      <Badge
                        variant="outline"
                        className="shrink-0"
                      >
                        PAR
                      </Badge>
                    )}

                    {cost < 50000 && (
                      <Badge
                        variant="outline"
                        className="shrink-0"
                      >
                        ICS
                      </Badge>
                    )}

                  </div>

                  <CardDescription className="space-y-1">

                    {primary.model && (
                      <div>
                        Model: {primary.model}
                      </div>
                    )}

                    {primary.serial_number && (
                      <div>
                        SN: {primary.serial_number}
                      </div>
                    )}

                    {primary.property_number && (
                      <div>
                        Property No:{' '}
                        {primary.property_number}
                      </div>
                    )}

                  </CardDescription>

                </CardHeader>

                {/* =================================================
                    Details
                    ================================================= */}
                <CardContent className="space-y-3">

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-muted-foreground">
                      Unit Cost
                    </span>

                    <span className="font-semibold">
                      {money(cost)}
                    </span>

                  </div>

                  {/* =================================================
                      Bundle Summary
                      ================================================= */}
                  {hasChildren && (
                    <div className="rounded-md border bg-muted/30 p-3">

                      <div className="flex items-center gap-2">

                        <Package className="h-4 w-4 text-muted-foreground" />

                        <span className="text-sm font-medium">
                          {children.length}{' '}
                          {children.length === 1
                            ? 'attached item'
                            : 'attached items'}
                        </span>

                      </div>

                      <div className="mt-2 space-y-1">

                        {children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >

                            <span className="truncate text-muted-foreground">
                              {child.item?.brand
                                ? `${child.item.brand} - `
                                : ''}
                              {child.item?.name ||
                                'Unnamed item'}
                            </span>

                            {child.serial_number && (
                              <span className="shrink-0 font-mono text-muted-foreground">
                                {child.serial_number}
                              </span>
                            )}

                          </div>
                        ))}

                      </div>

                    </div>
                  )}

                </CardContent>

                {/* =================================================
                    Add to Cart
                    ================================================= */}
                <CardFooter>

                  <Button
                    className="w-full"
                    disabled={inCart}
                    onClick={() =>
                      addAssetToCart(primary)
                    }
                  >
                    {inCart ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
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

      {/* =====================================================
          Proceed
          ===================================================== */}
      <div className="flex justify-end border-t pt-4">

        <Button
          size="lg"
          disabled={cart.length === 0}
          onClick={onProceed}
        >
          Proceed
          {cart.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-2"
            >
              {cart.length}
            </Badge>
          )}
        </Button>

      </div>

    </div>
  );
}