import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ activeTab, setActiveTab, children }) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}