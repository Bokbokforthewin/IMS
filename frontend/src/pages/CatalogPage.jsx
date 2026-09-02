import React, { useState } from 'react';

import CategoryForm from '../components/catalog/CategoryForm.jsx';
import ItemForm from '../components/catalog/ItemForm.jsx';

import CategoryTable from '../components/catalog/CategoryTable.jsx';
import ItemTable from '../components/catalog/ItemTable.jsx';

import Modal from '../components/Modal.jsx';
import EditCategoryModal from '../components/catalog/EditCategoryModal.jsx';
import DeleteCategoryModal from '../components/catalog/DeleteCategoryModal.jsx';

import EditItemModal from '../components/catalog/EditItemModal.jsx';
import DeleteItemModal from '../components/catalog/DeleteItemModal.jsx';

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

  // Category Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Item Delete State
  const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Category Edit State
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

  // Item Delete Handlers
  const handleOpenDeleteItemModal = (item) => {
    setItemToDelete(item);
    setIsDeleteItemModalOpen(true);
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    handleApiCall(`/items/${itemToDelete.id}`, null, () => {
      setIsDeleteItemModalOpen(false);
      setItemToDelete(null);
    }, 'DELETE');
  };

  // Category Delete Handlers
  const handleOpenDeleteModal = (cat) => {
    setCategoryToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;
    handleApiCall(`/categories/${categoryToDelete.id}`, null, () => {
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    }, 'DELETE');
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
          + Add Catalog Item
        </button>
      </div>

      {/* Tables Section */}
      <CategoryTable 
        categories={categories} 
        handleOpenEditCategoryModal={handleOpenEditCategoryModal} 
        handleOpenDeleteModal={handleOpenDeleteModal} 
      />

      <ItemTable 
        items={items} 
        handleOpenEditItemModal={handleOpenEditItemModal} 
        handleOpenDeleteItemModal={handleOpenDeleteItemModal} 
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

      {/* Edit Category Modal */}
      <EditCategoryModal 
        isOpen={isEditCategoryModalOpen}
        onClose={() => setIsEditCategoryModalOpen(false)}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        handleUpdateCategory={handleUpdateCategory}
      />

      {/* Delete Category Modal */}
      <DeleteCategoryModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        categoryToDelete={categoryToDelete}
        handleDeleteCategory={handleDeleteCategory}
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

      {/* Delete Item Modal */}
      <DeleteItemModal 
        isOpen={isDeleteItemModalOpen}
        onClose={() => setIsDeleteItemModalOpen(false)}
        itemToDelete={itemToDelete}
        handleDeleteItem={handleDeleteItem}
      />
    </div>
  );
}