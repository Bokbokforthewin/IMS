import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, requireRole, requirePermission }) {
  const { user, loading, hasRole, hasPermission } = useAuth();

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && !hasRole(requireRole)) return <Navigate to="/" replace />;
  if (requirePermission && !hasPermission(requirePermission)) return <Navigate to="/" replace />;

  // Render children if passed directly, otherwise render nested routes via Outlet
  return children ? children : <Outlet />;
}