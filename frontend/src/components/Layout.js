import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const isAdmin = user?.role === 'admin';
  const canUpload = user?.role === 'admin' || user?.role === 'user';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', show: true },
    { path: '/documents', label: 'Documents', icon: '📄', show: true },
    { path: '/documents/upload', label: 'Upload', icon: '⬆️', show: canUpload },
    { path: '/companies', label: 'Companies', icon: '🏢', show: true },
    { path: '/banks', label: 'Banks', icon: '🏦', show: true },
    { path: '/facilities', label: 'Facilities', icon: '🏭', show: true },
    { path: '/users', label: 'Users', icon: '👥', show: isAdmin },
    { path: '/audit-logs', label: 'Audit Logs', icon: '📋', show: isAdmin },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logoIcon}>DS</div>
          <span style={styles.brandText}>Document Storage</span>
        </div>

        <nav style={styles.nav}>
          {navItems.filter(item => item.show).map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.navLink,
                ...(isActive(item.path) ? styles.navLinkActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Area */}
      <div style={styles.mainArea}>
        <header style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <h2 style={styles.pageIndicator}>
              {navItems.find(i => isActive(i.path))?.label || 'Document Storage'}
            </h2>
          </div>
          <div style={styles.topBarRight}>
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>
                {(user?.name || user?.email)?.charAt(0).toUpperCase()}
              </div>
              <div style={styles.userDetails}>
                <span style={styles.userEmail}>{user?.name || user?.email}</span>
                <span style={styles.userRole}>{user?.role?.toUpperCase()}</span>
              </div>
            </div>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#fafafa',
  },
  sidebar: {
    width: '250px',
    background: '#fff',
    borderRight: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.25rem 1.25rem',
    borderBottom: '1px solid #eee',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: '#c0392b',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '0.85rem',
    color: '#fff',
    flexShrink: 0,
  },
  brandText: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#2c2c2c',
    letterSpacing: '-0.3px',
  },
  nav: {
    flex: 1,
    padding: '0.75rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    padding: '0.65rem 0.9rem',
    color: '#666',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  navLinkActive: {
    background: '#c0392b',
    color: '#fff',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(192, 57, 43, 0.25)',
  },
  navIcon: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  mainArea: {
    flex: 1,
    marginLeft: '250px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem 2rem',
    background: '#fff',
    borderBottom: '1px solid #eee',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  topBarLeft: {},
  pageIndicator: {
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#2c2c2c',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  userAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: '#c0392b',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.8rem',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  userEmail: {
    fontSize: '0.78rem',
    fontWeight: '500',
    color: '#2c2c2c',
  },
  userRole: {
    fontSize: '0.68rem',
    color: '#c0392b',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  logoutBtn: {
    padding: '0.45rem 0.9rem',
    background: '#fff',
    color: '#c0392b',
    border: '1.5px solid #c0392b',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  content: {
    flex: 1,
    padding: '1.75rem 2rem',
  },
};

export default Layout;
