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
      `${API_BASE_URL}/accountability/receipts/${receiptId}/download`,
      { responseType: 'blob' }
    );

    // Create a temporary link to trigger the file download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${documentNumber}.pdf`);
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
          {receipts.map(receipt => {
            const grouped = groupLines(receipt.lines || []);

            return (
              <Card key={receipt.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-mono">{receipt.document_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Issued to {receipt.user?.name || 'N/A'} — {receipt.date_issued}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={receipt.receipt_type === 'PAR' ? 'default' : 'secondary'}>
                      {receipt.receipt_type}
                    </Badge>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(receipt.id, receipt.document_number)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {grouped.map(({ primary, children }) => (
                      <div key={primary.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            {primary.serialized_asset?.item?.name}
                            {primary.serialized_asset?.serial_number && (
                              <span className="text-muted-foreground font-normal">
                                {' '}— SN: {primary.serialized_asset.serial_number}
                              </span>
                            )}
                          </div>
                          <div className="text-sm">
                            Qty: {primary.quantity} — {money(primary.serialized_asset?.unit_cost)}
                          </div>
                        </div>

                        {children.length > 0 && (
                          <div className="mt-2 pl-4 border-l-2 border-muted space-y-1">
                            {children.map(child => (
                              <div key={child.id} className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>↳ {child.serialized_asset?.item?.name}</span>
                                <span>Qty: {child.quantity} — {money(child.serialized_asset?.unit_cost)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}