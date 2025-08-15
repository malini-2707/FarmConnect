import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required, check if user has access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    let redirectPath = '/dashboard';
    
    switch (user.role) {
      case 'customer':
        redirectPath = '/dashboard/customer';
        break;
      case 'farmer':
        redirectPath = '/dashboard/farmer';
        break;
      case 'delivery_partner':
        redirectPath = '/dashboard/delivery';
        break;
      case 'admin':
        redirectPath = '/dashboard/admin';
        break;
      default:
        redirectPath = '/dashboard';
    }

    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
