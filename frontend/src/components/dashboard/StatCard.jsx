import React from 'react';

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'bg-white text-slate-800 border-slate-200' 
}) {
  return (
    <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between ${color}`}>
      <div>
        <p className="text-sm font-medium opacity-80">{title}</p>
        <h4 className="text-3xl font-bold mt-1">{value}</h4>
      </div>
      <div className="text-3xl flex items-center justify-center">
        {/* Handles Lucide component references, JSX elements, or emojis */}
        {typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null && !React.isValidElement(Icon)) ? (
          <Icon size={32} />
        ) : (
          Icon
        )}
      </div>
    </div>
  );
}