import React from 'react';
import QuickEncodeForm from '../components/quick-receive/QuickEncodeForm.jsx';

export default function QuickReceivePage({ categories, items, handleApiCall }) {
  return (
    <div className="receive-panel">
      <h2 className="receive-panel__title">Quick Encode & Receive</h2>
      <QuickEncodeForm categories={categories} items={items} handleApiCall={handleApiCall} />
    </div>
  );
}