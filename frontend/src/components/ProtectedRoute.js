import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading, loggingOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={styles.loader}>
        <div style={styles.spinner}></div>
        <p style={styles.loaderText}>Loading...</p>
      </div>
    );
  }

  // Show logout loader
  if (loggingOut) {
    return (
      <div style={styles.loader}>
        <div style={styles.spinner}></div>
        <p style={styles.loaderText}>Logging out...</p>
      </div>
    );
  }

  if (!user) {
    // Replace history so user can't press forward to get back in
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

const styles = {
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f5f5f5',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #eee',
    borderTop: '4px solid #c0392b',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: {
    marginTop: '1rem',
    color: '#757575',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
};

export default ProtectedRoute;
