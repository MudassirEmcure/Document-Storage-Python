import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithSSO } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoIcon}>DS</div>
        <h2 style={styles.title}>Document Storage</h2>
        <p style={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine}></span>
        </div>

        <button
          className="btn btn-dark btn-lg"
          onClick={loginWithSSO}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          🔐 Sign in with Microsoft SSO
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <a href="/reset-password" style={{ color: '#c0392b', fontSize: '0.85rem', textDecoration: 'none' }}>
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f5f5f5',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    background: '#fff',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  logoIcon: {
    width: '50px',
    height: '50px',
    background: '#c0392b',
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1.2rem',
    color: '#fff',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#2c2c2c',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#9e9e9e',
    marginBottom: '1.5rem',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '1.25rem 0',
  },
  dividerLine: { flex: 1, height: '1px', background: '#eee' },
  dividerText: { fontSize: '0.78rem', color: '#bdbdbd' },
};

export default LoginPage;
