import React, { useState, useEffect } from 'react';
import IssueAssetModal from './IssueAssetModal.jsx';
import EditAssetStatusModal from './EditAssetStatusModal.jsx';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, AlertTriangle } from 'lucide-react';

// Maps asset status to the appropriate Badge variant and color styling
function getStatusBadgeProps(status) {
  switch (status) {
    case 'Available':
      return { variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
    case 'Assigned':
    case 'Issued':
      return { variant: 'secondary', className: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-200' };
    case 'Under Repair':
      return { variant: 'default', className: 'bg-amber-500 hover:bg-amber-600 text-white' };
    case 'Condemned':
    case 'Disposed':
      return { variant: 'destructive' };
    default:
      return { variant: 'outline' };
  }
}

export default function SerializedAssetsGrid({ serializedAssets = [], handleApiCall, refreshData }) {
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [initialAssetId, setInitialAssetId] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // Maintain local state for optimistic UI updates
  const [localAssets, setLocalAssets] = useState(serializedAssets || []);

  useEffect(() => {
    setLocalAssets(Array.isArray(serializedAssets) ? serializedAssets : []);
  }, [serializedAssets]);

  const handleOpenIssueModal = (asset) => {
    setInitialAssetId(asset.id);
    setIsIssueModalOpen(true);
  };

  const handleCloseIssueModal = () => {
    setIsIssueModalOpen(false);
    setInitialAssetId(null);
  };

  const handleIssueSuccess = () => {
    handleCloseIssueModal();
    if (typeof refreshData === 'function') refreshData();
  };

  const handleOpenEditModal = (asset) => {
    setEditingAsset(asset);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingAsset(null);
  };

  const handleEditSaved = (updatedAsset) => {
    if (updatedAsset && updatedAsset.id) {
      setLocalAssets((prev) =>
        prev.map((a) => (a.id === updatedAsset.id ? { ...a, ...updatedAsset } : a))
      );
    }
    if (typeof refreshData === 'function') refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">
            Serialized Assets Inventory Status
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track individual unit availability, serial numbers, and maintenance conditions.
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-1 px-3">
          Total Items: {localAssets.length}
        </Badge>
      </div>

      {/* Empty State */}
      {!localAssets || localAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/20">
          <Package className="h-12 w-12 text-muted-foreground/60 mb-3" />
          <h4 className="text-base font-medium text-muted-foreground">No serialized assets found</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Available unit inventory will be displayed here.
          </p>
        </div>
      ) : (
        /* Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {localAssets.map((asset) => {
            const cost = Number(
              asset.unit_cost ??
              asset.unit_price ??
              asset.item?.unit_cost ??
              asset.item?.cost ??
              asset.item?.price ??
              0
            );

            const isPar = cost >= 50000;
            const isAvailable = asset.status === 'Available';
            const badgeProps = getStatusBadgeProps(asset.status);

            const brandName = asset.item?.brand ? `${asset.item.brand} ` : '';
            const itemName = asset.item?.name || asset.item_name || 'N/A';
            const fullTitle = `${brandName}${itemName}`;

            return (
              <Card
                key={asset.id}
                className="relative overflow-hidden flex flex-col justify-between w-full shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Floating Badges */}
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
                  <Badge variant={isPar ? 'destructive' : 'secondary'} className="text-[10px] font-bold tracking-wider">
                    {isPar ? 'PAR' : 'ICS'}
                  </Badge>
                  <Badge {...badgeProps} className="text-xs font-medium">
                    {asset.status || 'Unknown'}
                  </Badge>
                </div>

                {/* Asset Image Preview */}
                <div className="relative aspect-video w-full bg-muted/30 overflow-hidden border-b flex items-center justify-center">
                  {asset.item?.image_url ? (
                    <img
                      src={asset.item.image_url}
                      alt={fullTitle}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground/60">
                      <Package className="h-10 w-10 stroke-1 mb-1" />
                      <span className="text-xs">No image preview</span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <CardHeader className="flex-1 pb-4 pt-4 space-y-2">
                  <CardTitle className="text-base font-semibold leading-tight line-clamp-2" title={fullTitle}>
                    {fullTitle}
                  </CardTitle>

                  <div className="text-lg font-bold text-foreground">
                    ₱{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  {/* Identification Details */}
                  <div className="space-y-1 text-xs text-muted-foreground pt-2 border-t">
                    {asset.property_number && (
                      <div className="flex justify-between items-center">
                        <span>Property No:</span>
                        <span className="font-mono font-medium text-foreground">{asset.property_number}</span>
                      </div>
                    )}
                    {asset.serial_number && (
                      <div className="flex justify-between items-center">
                        <span>Serial No:</span>
                        <span className="font-mono font-medium text-foreground">{asset.serial_number}</span>
                      </div>
                    )}
                    {asset.model && (
                      <div className="flex justify-between items-center">
                        <span>Model:</span>
                        <span className="font-medium text-foreground">{asset.model}</span>
                      </div>
                    )}
                  </div>

                  {/* Condition / Maintenance Remarks */}
                  {asset.condition_remarks && (asset.status === 'Under Repair' || asset.status === 'Condemned') && (
                    <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">
                        <strong>Remarks:</strong> {asset.condition_remarks}
                      </span>
                    </div>
                  )}
                </CardHeader>

                {/* Actions */}
                <CardFooter className="gap-2 pt-2 border-t">
                  <Button
                    className="w-full flex-1"
                    onClick={() => handleOpenIssueModal(asset)}
                    disabled={!isAvailable}
                    size="sm"
                  >
                    {isAvailable ? 'Issue Asset' : asset.status}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditModal(asset)}
                  >
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Issue Asset Modal */}
      {isIssueModalOpen && (
        <IssueAssetModal
          isOpen={isIssueModalOpen}
          onClose={handleCloseIssueModal}
          serializedAssets={localAssets}
          initialAssetId={initialAssetId}
          handleApiCall={handleApiCall}
          onSuccess={handleIssueSuccess}
        />
      )}

      {/* Edit Asset Status Modal */}
      {isEditModalOpen && (
        <EditAssetStatusModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          asset={editingAsset}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}