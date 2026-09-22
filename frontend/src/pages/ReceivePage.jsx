import React, { useState } from 'react';

import ReceiveForm from '../components/receive/ReceiveForm.jsx';
import ReceiveBundleForm from '../components/receive/ReceiveBundleForm.jsx';
import ReceivedStockTable from '../components/receive/ReceivedStockTable.jsx';
import { Button } from '@/components/ui/button';

import '../components/receive/ReceivePage.css';

export default function ReceivePage({ items, receiveForm, setReceiveForm, handleApiCall }) {
  // 1. Move hooks INSIDE the component function body
  const [mode, setMode] = useState('single'); // 'single' | 'bundle'
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="receive-page-container">
      {/* Mode Switcher */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={mode === 'single' ? 'default' : 'outline'}
          onClick={() => setMode('single')}
        >
          Single Item
        </Button>
        <Button
          variant={mode === 'bundle' ? 'default' : 'outline'}
          onClick={() => setMode('bundle')}
        >
          Bundle / Set
        </Button>
      </div>

      {/* Conditional Form Rendering */}
      {mode === 'single' ? (
        <ReceiveForm
          items={items}
          receiveForm={receiveForm}
          setReceiveForm={setReceiveForm}
          handleApiCall={handleApiCall}
          onSuccess={handleSuccess}
        />
      ) : (
        <ReceiveBundleForm
          items={items}
          handleApiCall={handleApiCall}
          onSuccess={handleSuccess}
        />
      )}

      {/* Received Stock Table */}
      <ReceivedStockTable refreshKey={refreshKey} />
    </div>
  );
}