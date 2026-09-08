import React from 'react';
import './CatalogTables.css';

export default function CategoryTable({
  categories,
  handleOpenEditCategoryModal,
  handleOpenDeleteModal,
}) {
  return (
    <div className="catalog-table-card">
      <h3>Categories</h3>

      <div className="catalog-table-wrapper">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Description</th>
              <th className="action-col">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!categories || categories.length === 0 ? (
              <tr>
                <td colSpan="3" className="empty-row">
                  No categories created yet.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="font-bold">
                    {cat.name}
                  </td>

                  <td>
                    {cat.description || 'N/A'}
                  </td>

                  <td className="action-cell">
                    <div className="action-buttons">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenEditCategoryModal(cat)
                        }
                        className="btn-action btn-edit"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenDeleteModal(cat)
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