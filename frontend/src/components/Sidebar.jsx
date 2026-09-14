import React, { useState } from 'react';
import {
  Boxes,
  PackageCheck,
  PackageOpen,
  ClipboardCheck,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import './Sidebar.css';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    // {
    //   id: 'dashboard',
    //   label: 'Dashboard',
    //   description: 'Overview & Analytics',
    //   icon: Boxes,
    // },
    {
      id: 'catalog',
      label: 'Catalog',
      description: 'Categories & Items',
      icon: Boxes,
    },
    {
      id: 'receive',
      label: 'Receive Stock',
      description: 'Inbound Deliveries',
      icon: PackageCheck,
    },
    {
      id: 'consumables',
      label: 'Issue Consumables',
      description: 'FIFO Inventory',
      icon: PackageOpen,
    },
    {
      id: 'accountability',
      label: 'Assign Asset',
      description: 'PAR / ICS',
      icon: ClipboardCheck,
    },
    {
      id: 'transfer-return',
      label: 'Transfers & Returns',
      description: 'Asset Movement',
      icon: ArrowLeftRight,
    },
  ];

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <aside
      className={`sidebar ${
        isCollapsed ? 'sidebar--collapsed' : ''
      }`}
    >

      {/* =====================================================
          Sidebar Toggle
          ===================================================== */}
      <button
        type="button"
        className="sidebar__toggle-btn"
        onClick={toggleSidebar}
        title={isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
        aria-label={isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          <ChevronRight size={18} strokeWidth={2} />
        ) : (
          <ChevronLeft size={18} strokeWidth={2} />
        )}
      </button>


      {/* =====================================================
          Navigation
          ===================================================== */}
      <nav className="sidebar__nav">
        <ul className="sidebar__menu">

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`sidebar__item ${
                    isActive ? 'sidebar__item--active' : ''
                  }`}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >

                  {/* Icon */}
                  <span className="sidebar__item-icon">
                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                  </span>


                  {/* Text */}
                  <span className="sidebar__item-content">
                    <span className="sidebar__item-label">
                      {item.label}
                    </span>

                    <span className="sidebar__item-description">
                      {item.description}
                    </span>
                  </span>


                  {/* Active Indicator */}
                  {isActive && (
                    <span
                      className="sidebar__active-indicator"
                      aria-hidden="true"
                    />
                  )}

                </button>
              </li>
            );
          })}

        </ul>
      </nav>


      {/* =====================================================
          Footer
          ===================================================== */}
      <div className="sidebar__footer">

        <div className="sidebar__footer-divider" />

        <span className="sidebar__version">
          {isCollapsed
            ? 'DOH'
            : 'DOH NIR CHD - ICT Unit Systems'}
        </span>

      </div>

    </aside>
  );
}