import React from 'react';
import './CatalogPage.css';

export default function ItemTable({
  items,
  handleOpenEditItemModal,
  handleOpenDeleteItemModal,
}) {
  return (
    <div className="catalog-table-card">
      <h3>Items</h3>

      <div className="catalog-table-wrapper">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Specifications</th>
              <th>Type</th>
              <th>Unit</th>
              <th>Tracking Type</th>
              <th>Reorder Level</th>
              <th>Estimated Useful Life</th>
              <th className="action-col">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!items || items.length === 0 ? (
              <tr>
                <td colSpan="10" className="empty-row">
                  No items created yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="monospace font-bold">
                    {item.item_code}
                  </td>

                  <td className="font-bold">
                    {item.name}
                  </td>

                  <td>
                    {item.category?.name || 'N/A'}
                  </td>

                  <td>
                    {item.brand || '—'}
                  </td>

                  <td>
                    {item.specifications || '—'}
                  </td>

                  <td>
                    {item.type || '—'}
                  </td>

                  <td>
                    {item.unit_of_measure}
                  </td>

                  <td>
                    {item.tracking_type || '—'}
                  </td>

                  <td>
                    {item.reorder_level}
                  </td>

                  <td>
                    {item.estimated_useful_life || '—'}
                  </td>

                  <td className="action-cell">
                    <div className="action-buttons">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenEditItemModal(item)
                        }
                        className="btn-action btn-edit"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenDeleteItemModal(item)
                        }
                        className="btn-action btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}