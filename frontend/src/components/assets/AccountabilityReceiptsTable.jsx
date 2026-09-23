import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE_URL = '/api/v1';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

/**
 * Groups lines into primary assets and their attached child peripherals.
 * Accepts lines from both PAR and ICS receipts combined.
 */
function groupLines(lines) {
  const byPropertyNumber = {};
  lines.forEach(line => {
    const pn = line.serialized_asset?.property_number;
    if (pn) byPropertyNumber[pn] = line;
  });

  const primaries = lines.filter(line => {
    const attachedTo = line.serialized_asset?.attached_to;
    if (attachedTo && byPropertyNumber[attachedTo]) {
      return false;
    }
    return true;
  });

  return primaries.map(primary => ({
    primary,
    children: lines.filter(l =>
      l.serialized_asset?.attached_to &&
      l.serialized_asset.attached_to === primary.serialized_asset?.property_number
    ),
  }));
}

/**
 * Groups individual database receipts (PAR & ICS) created in the same
 * issuance transaction into a single bundled card object.
 */
function groupReceiptsIntoBundles(receipts) {
  const bundleMap = new Map();

  receipts.forEach((receipt) => {
    // Unique key identifying a single issuance session
    const key = `${receipt.user_id}_${receipt.issued_by_id}_${receipt.date_issued}_${receipt.remarks || ''}`;

    if (!bundleMap.has(key)) {
      bundleMap.set(key, {
        key,
        user: receipt.user,
        issuedBy: receipt.issuedBy,
        date_issued: receipt.date_issued,
        remarks: receipt.remarks,
        receipts: [],
        allLines: [],
      });
    }

    const bundle = bundleMap.get(key);
    bundle.receipts.push(receipt);

    if (receipt.lines && Array.isArray(receipt.lines)) {
      bundle.allLines.push(...receipt.lines);
    }
  });

  return Array.from(bundleMap.values());
}

const handleDownload = async (receiptId, documentNumber) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/accountability/receipts/${receiptId}/download-excel`,
      { responseType: 'blob' }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${documentNumber}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download receipt:', err);
  }
};

export default function AccountabilityReceiptsTable({ refreshKey }) {
  const [receipts, setReceipts] = useState([]);

  const fetchReceipts = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/accountability/receipts`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setReceipts(data);
    } catch (err) {
      console.error('Failed to load accountability receipts:', err);
      setReceipts([]);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts, refreshKey]);

  // Group receipts into transaction bundles
  const bundles = useMemo(() => groupReceiptsIntoBundles(receipts), [receipts]);

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Issued Accountability Receipts</h3>

      {bundles.length === 0 ? (
        <p className="text-muted-foreground text-sm">No accountability receipts generated yet.</p>
      ) : (
        <div className="space-y-4">
          {bundles.map((bundle) => {
            const grouped = groupLines(bundle.allLines || []);

            return (
              <Card key={bundle.key}>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b mb-3">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <span>{bundle.user?.name || 'Unassigned User'}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        ({bundle.date_issued})
                      </span>
                    </CardTitle>
                    {bundle.remarks && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Remarks: {bundle.remarks}
                      </p>
                    )}
                  </div>

                  {/* Render Excel download buttons for all receipts in this transaction */}
                  <div className="flex flex-wrap gap-2">
                    {bundle.receipts.map((rcpt) => (
                      <Button
                        key={rcpt.id}
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => handleDownload(rcpt.id, rcpt.document_number)}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                        <span>{rcpt.document_number}</span>
                        <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                          {rcpt.receipt_type}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {grouped.map(({ primary, children }) => (
                    <div key={primary.id} className="border rounded-md p-3 space-y-2 bg-card">
                      {/* Main Asset Row */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <span>{primary.serialized_asset?.item?.name}</span>
                            {primary.serialized_asset?.serial_number && (
                              <span className="text-muted-foreground text-sm font-normal">
                                — SN: {primary.serialized_asset.serial_number}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Property No: {primary.serialized_asset?.property_number || 'N/A'} | Qty: {primary.quantity} — {money(primary.serialized_asset?.unit_cost)}
                          </div>
                        </div>

                        {primary.serialized_asset?.property_number && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() =>
                              window.open(
                                `${API_BASE_URL}/accountability/serialized-assets/${primary.serialized_asset.id}/download-tag-pdf`,
                                '_blank'
                              )
                            }
                          >
                            Tag PDF
                          </Button>
                        )}
                      </div>

                      {/* Render attached peripheral lines under the main asset */}
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="ml-4 pl-3 border-l-2 border-primary/30 flex items-center justify-between text-sm py-1 bg-muted/40 rounded-r pr-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs">
                              {child.serialized_asset?.item?.name}
                            </span>
                            {child.serialized_asset?.serial_number && (
                              <span className="text-xs text-muted-foreground">
                                (SN: {child.serialized_asset.serial_number})
                              </span>
                            )}
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">
                              Attached
                            </Badge>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {money(child.serialized_asset?.unit_cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}