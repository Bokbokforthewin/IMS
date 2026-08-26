import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside style={{ width: '250px', borderRight: '1px solid #ccc', padding: '20px', background: '#f9f9f9', height: '100vh' }}>
      <h2>DOH Inventory</h2>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <li>
            <button 
              onClick={() => setActiveTab('catalog')} 
              style={{ width: '100%', textAlign: 'left', padding: '10px', background: activeTab === 'catalog' ? '#e2e8f0' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'catalog' ? 'bold' : 'normal', borderRadius: '4px' }}
            >
              1 & 2. Categories & Items
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('receive')}
              style={{ width: '100%', textAlign: 'left', padding: '10px', background: activeTab === 'receive' ? '#e2e8f0' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'receive' ? 'bold' : 'normal', borderRadius: '4px' }}
            >
              3. Receive Stock
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('consumables')}
              style={{ width: '100%', textAlign: 'left', padding: '10px', background: activeTab === 'consumables' ? '#e2e8f0' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'consumables' ? 'bold' : 'normal', borderRadius: '4px' }}
            >
              4. Issue Consumables (FIFO)
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('accountability')}
              style={{ width: '100%', textAlign: 'left', padding: '10px', background: activeTab === 'accountability' ? '#e2e8f0' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'accountability' ? 'bold' : 'normal', borderRadius: '4px' }}
            >
              5. Assign Asset (PAR/ICS)
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('transfer-return')}
              style={{ width: '100%', textAlign: 'left', padding: '10px', background: activeTab === 'transfer-return' ? '#e2e8f0' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'transfer-return' ? 'bold' : 'normal', borderRadius: '4px' }}
            >
              6. Asset Transfers & Returns
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}