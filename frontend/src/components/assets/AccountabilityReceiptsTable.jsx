import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE_URL = '/api/v1';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// Groups a receipt's lines into: primary lines (their asset has no
// attached_to), each carrying an array of child lines whose asset's
// attached_to matches the primary's property_number.
function groupLines(lines) {
  const byPropertyNumber = {};
  lines.forEach(line => {
    const pn = line.serialized_asset?.property_number;
    if (pn) byPropertyNumber[pn] = line;
  });

  const childKeys = new Set();
  const primaries = lines.filter(line => {
    const attachedTo = line.serialized_asset?.attached_to;
    if (attachedTo && byPropertyNumber[attachedTo]) {
      childKeys.add(line.id);
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

const handleDownload = async (receiptId, documentNumber) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/accountability/receipts/${receiptId}/download-excel`,
      { responseType: 'blob' }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${documentNumber}.xlsx`); // Update extension to .xlsx
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

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Issued Accountability Receipts (PAR / ICS)</h3>

      {receipts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No accountability receipts generated yet.</p>
      ) : (
        <div className="space-y-4">
          {receipts.map((receipt) => {
            const grouped = groupLines(receipt.lines || []);

            return (
              <Card key={receipt.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-semibold">
                    {receipt.document_number} — <span className="font-normal">{receipt.user?.name}</span>
                  </CardTitle>
                  {/* Added button to trigger Excel download */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(receipt.id, receipt.document_number)}
                  >
                    <Download className="w-4 h-4 mr-2" /> Excel
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {grouped.map(({ primary, children }) => (
                    <div key={primary.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {primary.serialized_asset?.item?.name}
                            {primary.serialized_asset?.serial_number && (
                              <span className="text-muted-foreground font-normal">
                                {" "}— SN: {primary.serialized_asset.serial_number}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Qty: {primary.quantity} — {money(primary.serialized_asset?.unit_cost)}
                          </div>
                        </div>
                        {primary.serialized_asset?.property_number && (
                          <Button
                            size="sm"
                            variant="ghost"
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

                      {/* Render attached child lines */}
                      {children.map((child) => (
                        <div key={child.id} className="ml-4 pl-3 border-l-2 flex items-center justify-between text-sm">
                          <div>
                            <span>{child.serialized_asset?.item?.name}</span>
                            <Badge variant="secondary" className="ml-2">Attached</Badge>
                          </div>
                          <span className="text-muted-foreground">{money(child.serialized_asset?.unit_cost)}</span>
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