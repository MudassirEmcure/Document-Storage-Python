import React from 'react';
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
    <>
      {/* Topbar */}
      <header style={styles.topbar}>
        <div style={styles.topbarLeft}>
          <span style={styles.logo}>Document Storage</span>
        </div>
        <div style={styles.topbarRight}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {(user?.name || user?.email)?.charAt(0).toUpperCase()}
            </div>
            <div style={styles.userMeta}>
              <span style={styles.userName}>{user?.name || user?.email}</span>
              <span style={styles.userRole}>{user?.role}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.navGroup}>
          <span style={styles.navGroupLabel}>Navigation</span>
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
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <Outlet />
      </main>
    </>
  );
}

const styles = {
  topbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    height: 'var(--topbar-height)',
    background: 'var(--color-neutral-0)',
    borderBottom: '1px solid var(--color-neutral-200)',
    boxShadow: '0 2px 10px rgba(33,35,38,.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--space-6)',
  },
  topbarLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--color-primary)',
    letterSpacing: '-0.5px',
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--color-primary)',
    color: 'var(--color-neutral-0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
  },
  userMeta: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-neutral-800)',
  },
  userRole: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--color-neutral-500)',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
  },
  sidebar: {
    position: 'fixed',
    top: 'var(--topbar-height)',
    left: 0,
    bottom: 0,
    width: 'var(--sidenav-width)',
    background: 'var(--color-neutral-0)',
    borderRight: '1px solid var(--color-neutral-200)',
    overflowY: 'auto',
    overflowX: 'visible',
    padding: 'var(--space-4) var(--space-3)',
  },
  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navGroupLabel: {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.1em',
    color: 'var(--color-neutral-500)',
    padding: '0 var(--space-3)',
    marginBottom: 'var(--space-2)',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: '8px 12px',
    color: 'var(--color-neutral-600)',
    textDecoration: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 150ms',
  },
  navLinkActive: {
    background: 'var(--color-primary)',
    color: 'var(--color-neutral-0)',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(237,28,36,.25)',
  },
  navIcon: {
    fontSize: '15px',
    flexShrink: 0,
  },
  main: {
    marginLeft: 'var(--sidenav-width)',
    padding: 'calc(var(--topbar-height) + 24px) 24px 24px',
    minHeight: '100vh',
  },
};

export default Layout;
