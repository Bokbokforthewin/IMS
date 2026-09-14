import React from 'react';

export default function StatCard({ title, value, icon, color }) {
  return (
    <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between ${color}`}>
      <div>
        <p className="text-sm font-medium opacity-80">{title}</p>
        <h4 className="text-3xl font-ext500 font-bold mt-1">{value}</h4>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  );
}