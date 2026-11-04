import React, { useState } from 'react';

import CategoryForm from '../components/catalog/CategoryForm.jsx';
import ItemForm from '../components/catalog/ItemForm.jsx';

import CategoryTable from '../components/catalog/CategoryTable.jsx';
import ItemTable from '../components/catalog/ItemTable.jsx';

// import EditCategoryModal from '../components/catalog/EditCategoryModal.jsx';
// import EditItemModal from '../components/catalog/EditItemModal.jsx';

export default function CatalogPage({ 
  activeTab,
  categories, 
  categoryForm, 
  setCategoryForm, 
  items, 
  itemForm, 
  setItemForm, 
  handleApiCall 
}) {
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

  // Handlers
  const handleDeleteCategory = (categoryId) => {
    handleApiCall(`/categories/${categoryId}`, null, null, 'DELETE');
  };

  const handleSaveCategory = (updatedCategory) => {
    handleApiCall(`/categories/${updatedCategory.id}`, updatedCategory, null, 'PUT');
  };

  const handleDeleteItem = (itemId) => {
    handleApiCall(`/items/${itemId}`, null, null, 'DELETE');
  };

  const handleSaveItem = (updatedItem) => {
    handleApiCall(`/items/${updatedItem.id}`, updatedItem, null, 'PUT');
  };

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
    <div className="space-y-6 p-4">
      {/* Prominent Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          {activeTab === 'catalog-categories' ? 'Category Management' : 'Item Catalog'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {activeTab === 'catalog-categories'
            ? 'Manage inventory item classification groups and descriptions.'
            : 'Maintain master list definitions for consumables and serialized equipment.'}
        </p>
      </div>

      {/* Sub-view: Categories */}
      {activeTab === 'catalog-categories' && (
        <div className="flex flex-col gap-6">
          <CategoryForm 
            categoryForm={categoryForm} 
            setCategoryForm={setCategoryForm} 
            handleApiCall={handleApiCall} 
          />

          <CategoryTable 
            categories={categories} 
            handleSaveCategory={handleSaveCategory}
            handleDeleteCategory={handleDeleteCategory}
            handleOpenEditModal={handleOpenEditCategoryModal}
          />
        </div>
      )}

      {/* Sub-view: Items */}
      {activeTab === 'catalog-items' && (
        <div className="flex flex-col gap-6">
          <ItemForm 
            itemForm={itemForm} 
            setItemForm={setItemForm} 
            categories={categories} 
            handleApiCall={handleApiCall} 
          />

          <ItemTable 
            items={items} 
            handleSaveItem={handleSaveItem}
            handleDeleteItem={handleDeleteItem} 
            handleOpenEditModal={handleOpenEditItemModal}
          />
        </div>
      )}

      {/* Edit Modals */}
      {/* <EditCategoryModal 
        isOpen={isEditCategoryModalOpen}
        onClose={() => setIsEditCategoryModalOpen(false)}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        handleUpdateCategory={handleUpdateCategory}
      />

      <EditItemModal 
        isOpen={isEditItemModalOpen}
        onClose={() => setIsEditItemModalOpen(false)}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        categories={categories}
        handleUpdateItem={handleUpdateItem}
      /> */}
    </div>
  );
}