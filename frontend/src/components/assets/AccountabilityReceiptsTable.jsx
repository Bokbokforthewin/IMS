import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Download,
  FileSpreadsheet,
  Search,
  PackageOpen,
  FileText,
  User,
  UserCheck,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE_URL = '/api/v1';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

/**
 * Helper to resolve the secondary receiver (current holder) for an asset line.
 */
function getSecondaryReceiver(line, defaultPrimaryUser) {
  const holder =
    line.serialized_asset?.current_holder ||
    line.serialized_asset?.currentHolder;

  if (holder?.name) return holder.name;
  if (line.user?.name) return line.user.name;
  return defaultPrimaryUser?.name || 'Primary Receiver';
}

/**
 * Groups lines into primary assets and their attached child peripherals.
 * Accepts lines from both PAR and ICS receipts combined.
 */
function groupLines(lines) {
  const byPropertyNumber = {};
  lines.forEach((line) => {
    const pn = line.serialized_asset?.property_number;
    if (pn) byPropertyNumber[pn] = line;
  });

  const primaries = lines.filter((line) => {
    const attachedTo = line.serialized_asset?.attached_to;
    if (attachedTo && byPropertyNumber[attachedTo]) {
      return false;
    }
    return true;
  });

  return primaries.map((primary) => ({
    primary,
    children: lines.filter(
      (l) =>
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
    const primaryUser = receipt.receivedMrBy || receipt.user;
    const key = `${primaryUser?.id || receipt.user_id}_${receipt.issued_by_id}_${receipt.date_issued}_${receipt.remarks || ''}`;

    if (!bundleMap.has(key)) {
      bundleMap.set(key, {
        key,
        user: primaryUser, // Primary Receiver (PAR/ICS Signatory)
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
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReceipts = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/accountability/receipts`);
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
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

  // Filter bundles based on search query
  const filteredBundles = useMemo(() => {
    if (!searchQuery.trim()) return bundles;

    const query = searchQuery.toLowerCase();
    return bundles.filter((bundle) => {
      const primaryUserName = bundle.user?.name?.toLowerCase() || '';
      const remarksMatches = bundle.remarks?.toLowerCase().includes(query);
      const dateMatches = bundle.date_issued?.toLowerCase().includes(query);

      const receiptMatches = bundle.receipts.some(
        (rcpt) =>
          rcpt.document_number?.toLowerCase().includes(query) ||
          rcpt.receipt_type?.toLowerCase().includes(query)
      );

      const lineMatches = bundle.allLines.some((line) => {
        const itemName = line.serialized_asset?.item?.name?.toLowerCase() || '';
        const serialNo = line.serialized_asset?.serial_number?.toLowerCase() || '';
        const propertyNo = line.serialized_asset?.property_number?.toLowerCase() || '';
        const secondaryReceiver = (
          line.serialized_asset?.current_holder?.name ||
          line.serialized_asset?.currentHolder?.name ||
          ''
        ).toLowerCase();

        return (
          itemName.includes(query) ||
          serialNo.includes(query) ||
          propertyNo.includes(query) ||
          secondaryReceiver.includes(query)
        );
      });

      return (
        primaryUserName.includes(query) ||
        remarksMatches ||
        dateMatches ||
        receiptMatches ||
        lineMatches
      );
    });
  }, [bundles, searchQuery]);

  return (
    <Card className="w-full">
      {/* Header with Title and Search Input */}
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-xl font-bold tracking-tight">
            Issued Accountability Receipts
          </CardTitle>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search primary/secondary receiver, doc #, asset, SN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {filteredBundles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <PackageOpen className="h-8 w-8 opacity-40" />
            <p>
              {searchQuery
                ? `No accountability receipts matching "${searchQuery}"`
                : 'No accountability receipts generated yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBundles.map((bundle) => {
              const grouped = groupLines(bundle.allLines || []);

              return (
                <div
                  key={bundle.key}
                  className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden"
                >
                  {/* OUTSIDE HEADER: Primary Receiver & Downloads */}
                  <div className="bg-muted/40 p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-base">
                          {bundle.user?.name || 'Unassigned Primary Receiver'}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                          Primary Signatory
                        </Badge>
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          ({bundle.date_issued})
                        </span>
                      </div>
                      {bundle.remarks && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Remarks: {bundle.remarks}
                        </p>
                      )}
                    </div>

                    {/* Download Buttons Bar */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs font-medium text-muted-foreground mr-1 hidden sm:inline">
                        Downloads:
                      </span>
                      {bundle.receipts.map((rcpt) => (
                        <Button
                          key={rcpt.id}
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 bg-background shadow-xs hover:bg-accent"
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
                  </div>

                  {/* INSIDE DETAILS: Item Breakdowns & Secondary Receivers */}
                  <div className="p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Assigned Item Details & Asset Holders
                    </h4>

                    {grouped.map(({ primary, children }) => {
                      const primarySecondaryHolder = getSecondaryReceiver(
                        primary,
                        bundle.user
                      );

                      return (
                        <div
                          key={primary.id}
                          className="border rounded-md p-3 space-y-3 bg-background"
                        >
                          {/* Main Asset Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="font-medium flex flex-wrap items-center gap-2">
                                <span>{primary.serialized_asset?.item?.name}</span>
                                {primary.serialized_asset?.serial_number && (
                                  <span className="text-muted-foreground text-xs font-normal">
                                    — SN: {primary.serialized_asset.serial_number}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  Property No:{' '}
                                  <strong className="text-foreground font-mono">
                                    {primary.serialized_asset?.property_number || 'N/A'}
                                  </strong>
                                </span>
                                <span>|</span>
                                <span>Qty: {primary.quantity}</span>
                                <span>|</span>
                                <span>{money(primary.serialized_asset?.unit_cost)}</span>
                              </div>

                              {/* Secondary Receiver Indicator */}
                              <div className="pt-1 flex items-center gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className="text-[11px] font-normal gap-1 bg-primary/10 text-primary border-primary/20"
                                >
                                  <UserCheck className="h-3 w-3 shrink-0" />
                                  Secondary Receiver:
                                  <strong className="font-semibold text-foreground">
                                    {primarySecondaryHolder}
                                  </strong>
                                </Badge>
                              </div>
                            </div>

                            {/* Tag PDF Button */}
                            {primary.serialized_asset?.property_number && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs self-start sm:self-center"
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

                          {/* Render attached peripheral lines */}
                          {children.map((child) => {
                            const childSecondaryHolder = getSecondaryReceiver(
                              child,
                              bundle.user
                            );

                            return (
                              <div
                                key={child.id}
                                className="ml-2 sm:ml-4 pl-3 border-l-2 border-primary/30 py-2 bg-muted/30 rounded-r pr-3 space-y-1"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-foreground">
                                      {child.serialized_asset?.item?.name}
                                    </span>
                                    {child.serialized_asset?.serial_number && (
                                      <span className="text-muted-foreground">
                                        (SN: {child.serialized_asset.serial_number})
                                      </span>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-4 px-1 gap-0.5"
                                    >
                                      <Paperclip className="h-2.5 w-2.5" /> Attached
                                    </Badge>
                                  </div>

                                  <span className="font-semibold text-muted-foreground">
                                    {money(child.serialized_asset?.unit_cost)}
                                  </span>
                                </div>

                                {/* Attached Item Secondary Receiver */}
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <UserCheck className="h-3 w-3 text-primary shrink-0" />
                                  <span>Secondary Receiver:</span>
                                  <strong className="text-foreground font-medium">
                                    {childSecondaryHolder}
                                  </strong>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}