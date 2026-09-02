/* src/components/Layout.jsx */

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

export default function Layout({
  activeTab,
  setActiveTab,
  children,
}) {
  return (
    <div className="layout">

      <Header />

      <div className="layout__body">

        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <main className="layout__content">
          {children}
        </main>

      </div>

    </div>
  );
}