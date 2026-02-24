import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PrivateRoute({ children, adminOnly = false }) {
  const { currentUser, userRole, loading } = useAuth();
  
  console.log('🔐 PrivateRoute Debug:');
  console.log('  currentUser:', currentUser?.email);
  console.log('  userRole:', userRole);
  console.log('  loading:', loading);
  console.log('  adminOnly:', adminOnly);
  
  // Show loading state while checking auth
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#4b5563'
      }}>
        Loading...
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    console.log('  ➡️ No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Admin check
  if (adminOnly && userRole !== 'admin') {
    console.log(`  ➡️ Not admin (role: ${userRole}), redirecting to dashboard`);
    return <Navigate to="/dashboard" replace />;
  }

  console.log('  ✅ Access granted');
  return children;
}