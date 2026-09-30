// src/auth/GuestRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // If user is already logged in, redirect away from login/register to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}