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
        <div style={styles.logoWrap}>
          <span style={styles.logo}>Document Storage</span>
        </div>
        <p style={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine}></span>
        </div>

        <button className="btn btn-dark btn-lg" onClick={loginWithSSO} style={{ width: '100%' }}>
          🔐 Sign in with Microsoft SSO
        </button>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
          <a href="/reset-password" style={{ fontSize: '12px', fontWeight: 500 }}>Forgot password?</a>
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
    background: 'var(--color-neutral-100)',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    background: 'var(--color-neutral-0)',
    padding: 'var(--space-8)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--color-neutral-200)',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: 'var(--space-1)',
  },
  logo: {
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--color-primary)',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--color-neutral-500)',
    marginBottom: 'var(--space-6)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    margin: 'var(--space-5) 0',
  },
  dividerLine: { flex: 1, height: '1px', background: 'var(--color-neutral-200)' },
  dividerText: { fontSize: '11px', color: 'var(--color-neutral-500)', fontWeight: 500 },
};

export default LoginPage;
