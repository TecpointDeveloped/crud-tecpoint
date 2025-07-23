// src/components/PrivateRoute.js (This is the actual PrivateRoute component)
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  // If still loading the auth state, you might show a loading spinner or null
  if (loading) {
    return <div className="text-center p-8">Cargando autenticación...</div>;
  }

  // If there's no current user and we're done loading, redirect to the login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If there's a current user, render the children (the protected content)
  return children;
}

export default PrivateRoute;