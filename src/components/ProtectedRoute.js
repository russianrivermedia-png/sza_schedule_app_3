import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from './Login';

function ProtectedRoute({ children, requiredRole = 'staff' }) {
  const { user, hasPermission, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // You could add a proper loading spinner here
  }

  if (!user) {
    return <Login />;
  }

  if (!hasPermission(requiredRole)) {
    return <Navigate to="/viewer" replace />;
  }

  return children;
}

export default ProtectedRoute;
