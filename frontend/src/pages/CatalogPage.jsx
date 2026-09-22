import React, { useState } from 'react';

import CategoryForm from '../components/catalog/CategoryForm.jsx';
import ItemForm from '../components/catalog/ItemForm.jsx';

import CategoryTable from '../components/catalog/CategoryTable.jsx';
import ItemTable from '../components/catalog/ItemTable.jsx';

import Modal from '../components/Modal.jsx';
import EditCategoryModal from '../components/catalog/EditCategoryModal.jsx';
import EditItemModal from '../components/catalog/EditItemModal.jsx';

import '../components/catalog/CatalogPage.css';
import '../components/catalog/CatalogForms.css';
import '../components/catalog/CatalogTables.css';
import '../components/catalog/CatalogModals.css';

export default function CatalogPage({ 
  categories, 
  categoryForm, 
  setCategoryForm, 
  items, 
  itemForm, 
  setItemForm, 
  handleApiCall 
}) {
  // Add Form Modal States
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  // Category Edit State (If managed via modal)
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState({ id: '', name: '', description: '' });

  // Item Edit State
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState({
    id: '',
    category_id: '',
    name: '',
    brand: '',
    specifications: '',
    type: '',
    unit_of_measure: '',
    reorder_level: '',
    is_serialized: false
  });

  // Direct Category Handlers
  const handleDeleteCategory = (categoryId) => {
    handleApiCall(`/categories/${categoryId}`, null, null, 'DELETE');
  };

  const handleSaveCategory = (updatedCategory) => {
    handleApiCall(`/categories/${updatedCategory.id}`, updatedCategory, null, 'PUT');
  };

  // Direct Item Handlers
  const handleDeleteItem = (itemId) => {
    handleApiCall(`/items/${itemId}`, null, null, 'DELETE');
  };

  const handleSaveItem = (updatedItem) => {
    handleApiCall(`/items/${updatedItem.id}`, updatedItem, null, 'PUT');
  };

  // Category Edit Handlers
  const handleOpenEditCategoryModal = (cat) => {
    setEditingCategory({ id: cat.id, name: cat.name, description: cat.description || '' });
    setIsEditCategoryModalOpen(true);
  };

  const handleUpdateCategory = (e) => {
    e.preventDefault();
    handleApiCall(`/categories/${editingCategory.id}`, editingCategory, () => {
      setIsEditCategoryModalOpen(false);
    }, 'PUT');
  };

  // Item Edit Handlers
  const handleOpenEditItemModal = (item) => {
    setEditingItem({
      id: item.id,
      category_id: item.category_id,
      name: item.name,
      brand: item.brand || '',
      specifications: item.specifications || '',
      type: item.type || '',
      unit_of_measure: item.unit_of_measure,
      reorder_level: item.reorder_level,
      is_serialized: !!item.is_serialized
    });
    setIsEditItemModalOpen(true);
  };

  const handleUpdateItem = (e) => {
    e.preventDefault();
    handleApiCall(`/items/${editingItem.id}`, editingItem, () => {
      setIsEditItemModalOpen(false);
    }, 'PUT');
  };

  return (
    <div className="catalog-page-container">
      {/* Action Buttons Header */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button 
          onClick={() => setIsAddCategoryModalOpen(true)} 
          className="btn-modal btn-primary"
        >
          + Add Category
        </button>
        <button 
          onClick={() => setIsAddItemModalOpen(true)} 
          className="btn-modal btn-primary"
        >
          + Add Item
        </button>
      </div>

      {/* Tables Section */}
      <CategoryTable 
        categories={categories} 
        handleSaveCategory={handleSaveCategory}
        handleDeleteCategory={handleDeleteCategory}
      />

      <ItemTable 
        items={items} 
        handleSaveItem={handleSaveItem}
        handleDeleteItem={handleDeleteItem} 
      />

      {/* Add Category Modal */}
      <Modal isOpen={isAddCategoryModalOpen} title="Add Category" onClose={() => setIsAddCategoryModalOpen(false)}>
        <CategoryForm 
          categoryForm={categoryForm} 
          setCategoryForm={setCategoryForm} 
          handleApiCall={(url, data, onSuccess) => {
            handleApiCall(url, data, () => {
              if (onSuccess) onSuccess();
              setIsAddCategoryModalOpen(false);
            });
          }} 
        />
      </Modal>

      {/* Add Item Modal */}
      <Modal isOpen={isAddItemModalOpen} title="Add Catalog Item" onClose={() => setIsAddItemModalOpen(false)}>
        <ItemForm 
          itemForm={itemForm} 
          setItemForm={setItemForm} 
          categories={categories} 
          handleApiCall={(url, data, onSuccess) => {
            handleApiCall(url, data, () => {
              if (onSuccess) onSuccess();
              setIsAddItemModalOpen(false);
            });
          }} 
        />
      </Modal>

      {/* Edit Category Modal (If using external modal) */}
      <EditCategoryModal 
        isOpen={isEditCategoryModalOpen}
        onClose={() => setIsEditCategoryModalOpen(false)}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        handleUpdateCategory={handleUpdateCategory}
      />

      {/* Edit Item Modal */}
      <EditItemModal 
        isOpen={isEditItemModalOpen}
        onClose={() => setIsEditItemModalOpen(false)}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        categories={categories}
        handleUpdateItem={handleUpdateItem}
      />
    </div>
  );
}