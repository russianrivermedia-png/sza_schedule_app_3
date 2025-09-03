import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requiredRole = 'staff' }) {
  const { user, hasPermission, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // You could add a proper loading spinner here
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
