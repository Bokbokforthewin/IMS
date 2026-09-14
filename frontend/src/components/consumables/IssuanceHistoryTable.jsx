import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function IssuanceHistoryTable({ refreshKey }) {
  const [issuances, setIssuances] = useState([]);
  const [expandedLineId, setExpandedLineId] = useState(null);

  const fetchIssuances = useCallback(async () => {
    try {
      const response = await axios.get('/api/v1/consumables/issuances');

      setIssuances(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load issuance logs:', err);
      setIssuances([]);
    }
  }, []);

  useEffect(() => {
    fetchIssuances();
  }, [fetchIssuances, refreshKey]);

  const toggleExpand = (lineId) => {
    setExpandedLineId(prev => (prev === lineId ? null : lineId));
  };

  // Flatten each issuance's lines into individual rows, keeping a reference
  // back to the parent document (RIS number, date, purpose) for display.
  const rows = issuances.flatMap(issuance => {
    const lines = Array.isArray(issuance?.lines) ? issuance.lines : [];
    return lines.map((line, index) => ({
      line,
      issuance,
      isFirstLineOfDoc: index === 0,
      lineCountInDoc: lines.length,
    }));
  });

  return (
    <div className="consumables-panel">
      <h3 className="consumables-panel__title">Consumable Issuance History (RIS Logs)</h3>
      <div className="consumables-table-wrapper">
        <table className="consumables-table">
          <thead>
            <tr>
              <th></th>
              <th>RIS Number</th>
              <th>Item Name</th>
              <th>Qty Issued</th>
              <th>Issued To</th>
              <th>Date</th>
              <th>Purpose</th>
              <th>Batches Drawn</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="8" className="consumables-table__empty">No issuance records found.</td>
              </tr>
            ) : (
              rows.map(({ line, issuance, isFirstLineOfDoc, lineCountInDoc }) => {
                const allocations = Array.isArray(line?.batch_allocations) ? line.batch_allocations : [];
                const isExpanded = expandedLineId === line.id;
                const isMultiBatch = allocations.length > 1;
                const isMultiLineDoc = lineCountInDoc > 1;

                return (
                  <React.Fragment key={line.id}>
                    <tr className={isMultiLineDoc && !isFirstLineOfDoc ? 'consumables-line-grouped' : ''}>
                      <td>
                        {allocations.length > 0 && (
                          <button
                            type="button"
                            className="consumables-expand-btn"
                            onClick={() => toggleExpand(line.id)}
                            aria-label={isExpanded ? 'Collapse batch details' : 'Expand batch details'}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        )}
                      </td>
                      <td className="consumables-table__ris">
                        {isFirstLineOfDoc ? (issuance?.document_number || 'N/A') : ''}
                        {isFirstLineOfDoc && isMultiLineDoc && (
                          <span className="badge badge--multi">{lineCountInDoc} recipients</span>
                        )}
                      </td>
                      <td>
                        {line?.item?.name || 'Item'}
                        {isMultiBatch && (
                          <span className="badge badge--multi">Multi-batch</span>
                        )}
                      </td>
                      <td className="consumables-table__qty">{line?.quantity_issued ?? 0}</td>
                      <td>
                        {line?.issued_to?.name || 'N/A'}
                        {line?.issued_to && (
                          <div className="consumables-table__item-meta">
                            {line.issued_to.designation}, {line.issued_to.unit} / {line.issued_to.division}
                          </div>
                        )}
                      </td>
                      <td>{isFirstLineOfDoc ? (issuance?.issuance_date || 'N/A') : ''}</td>
                      <td>{isFirstLineOfDoc ? (issuance?.purpose || 'N/A') : ''}</td>
                      <td>{allocations.length || '-'}</td>
                    </tr>

                    {isExpanded && allocations.length > 0 && (
                      <tr className="consumables-subrow">
                        <td></td>
                        <td colSpan="7">
                          <table className="consumables-subtable">
                            <thead>
                              <tr>
                                <th>IAR Number</th>
                                <th>Qty Deducted</th>
                                <th>Unit Cost (at issuance)</th>
                                <th>Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allocations.map(a => (
                                <tr key={a.id}>
                                  <td className="consumables-table__item-code">
                                    {a?.stock_batch?.iar_number || 'N/A'}
                                  </td>
                                  <td className="consumables-table__qty">{a.quantity_deducted}</td>
                                  <td>{money(a.unit_cost_at_issuance)}</td>
                                  <td>{money(a.unit_cost_at_issuance * a.quantity_deducted)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}