import React from 'react';

export interface CostItem {
  id: string;
  elementType: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  total: number;
}

interface CostPanelProps {
  items?: CostItem[];
  onExport?: (items: CostItem[]) => void;
  currency?: string;
}

function formatCurrency(value: number, currency = '$'): string {
  return `${currency}${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function CostPanel({ items = [], onExport, currency = '$' }: CostPanelProps = {}) {
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="cost-panel">
      <div className="panel-header">
        <span className="panel-title">Cost Estimate</span>
        <button
          aria-label="Export cost estimate"
          className="btn-export"
          onClick={() => onExport?.(items)}
          disabled={items.length === 0}
        >
          Export
        </button>
      </div>

      {items.length === 0 ? (
        <div className="cost-empty">No cost items. Add elements to generate an estimate.</div>
      ) : (
        <>
          <table className="cost-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="cost-row">
                  <td className="cost-desc">{item.description}</td>
                  <td className="cost-type">{item.elementType}</td>
                  <td className="cost-qty">{item.quantity}</td>
                  <td className="cost-unit">{item.unit}</td>
                  <td className="cost-rate">{formatCurrency(item.unitRate, currency)}</td>
                  <td className="cost-total">{formatCurrency(item.total, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="cost-grand-total">
                <td colSpan={5}><strong>Total</strong></td>
                <td><strong>{formatCurrency(grandTotal, currency)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}
