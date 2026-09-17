import React, { useState, useEffect } from 'react';
import IssueAssetModal from './IssueAssetModal.jsx';
import EditAssetStatusModal from './EditAssetStatusModal.jsx';
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Maps status to the appropriate Badge variant/color styling
function getBadgeProps(status) {
  switch (status) {
    case 'Available':
      return { variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
    case 'Assigned':
      return { variant: 'secondary', className: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200' };
    case 'Under Repair':
      return { variant: 'default', className: 'bg-amber-500 hover:bg-amber-600 text-white' };
    case 'Condemned':
      return { variant: 'destructive' };
    default:
      return { variant: 'secondary' };
  }
}

export default function SerializedAssetsGrid({ serializedAssets, handleApiCall, refreshData }) {
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [initialAssetId, setInitialAssetId] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // 1. Maintain a local copy of assets for immediate UI updates
  const [localAssets, setLocalAssets] = useState(serializedAssets || []);

  // 2. Keep local state synchronized if props change from outside
  useEffect(() => {
    setLocalAssets(serializedAssets || []);
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
    setIsIssueModalOpen(false);
    setInitialAssetId(null);
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

  // 3. Receive the updated asset back and patch it locally right away
  const handleEditSaved = (updatedAsset) => {
    if (updatedAsset && updatedAsset.id) {
      setLocalAssets(prev =>
        prev.map(a => (a.id === updatedAsset.id ? updatedAsset : a))
      );
    }
    // Also trigger parent refresh in the background to keep everything aligned
    if (typeof refreshData === 'function') refreshData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold tracking-tight">Serialized Assets Inventory Status</h3>
      </div>

      {(!localAssets || localAssets.length === 0) ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
          <img src="https://via.placeholder.com/150?text=No+Data" alt="Empty" className="opacity-50 mb-4" />
          <p className="text-muted-foreground">No serialized assets found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {localAssets.map((a) => {
            const cost = Number(a.unit_cost ?? a.item?.unit_cost ?? a.item?.cost ?? a.item?.price ?? 0);
            const type = cost >= 50000 ? 'PAR' : 'ICS';
            const isAvailable = a.status === 'Available';
            const badgeProps = getBadgeProps(a.status);

            return (
              <Card key={a.id} className="relative overflow-hidden flex flex-col pt-0 w-full">
                  {/* Positioned on the top-right, indented by 12px (top-3 right-3) and layered above the image */}
                  <div className="absolute top-3 right-3 z-30">
                    <Badge {...badgeProps}>
                      {a.status || 'Unknown'}
                    </Badge>
                  </div>

                  <img
                    src={a.item?.image_url || 'https://via.placeholder.com/400x300?text=Asset'}
                    alt={a.item?.name || 'Asset'}
                    className="relative z-20 aspect-video w-full object-cover border-b"
                  />

                  <CardHeader className="flex-1 pb-4">
                    <CardTitle className="leading-tight line-clamp-2" title={a.item?.name || 'N/A'}>
                      {a.item?.brand} - {a.item?.name || 'N/A'}
                    </CardTitle>
                    
                    <CardDescription className="flex flex-col gap-5 mt-2">
                      <span className="text-lg font-bold text-foreground">
                        ₱{cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    
                    {/* <div className="flex gap-1 text-sm">
                      <span style={{ fontWeight: 'bold', color: type === 'PAR' ? '#dc2626' : '#0284c7' }}>
                        {type}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">SN: {a.serial_number}</span>
                      <span className="text-muted-foreground">Made in: {a.country_of_origin}</span>
                    </div> */}

                    {/* Remarks for Repair/Condemned */}
                    {a.condition_remarks && (a.status === 'Under Repair' || a.status === 'Condemned') && (
                      <div className="mt-2 text-xs italic text-destructive font-medium">
                        Remarks: {a.condition_remarks}
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="gap-2">
                  <Button
                    className="w-full flex-1"
                    onClick={() => handleOpenIssueModal(a)}
                    disabled={!isAvailable}
                  >
                    {isAvailable ? 'Issue Asset' : a.status}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenEditModal(a)}
                  >
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <IssueAssetModal
        isOpen={isIssueModalOpen}
        onClose={handleCloseIssueModal}
        serializedAssets={localAssets}
        initialAssetId={initialAssetId}
        handleApiCall={handleApiCall}
        onSuccess={handleIssueSuccess}
      />

      <EditAssetStatusModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        asset={editingAsset}
        onSaved={handleEditSaved}
      />
    </div>
  );
}