import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function ResetPasswordConfirmPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      const res = await api.post('/auth/password-reset/confirm', { token, new_password: password });
      setSuccess(res.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed');
    }
  };

  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div className="alert alert-error">Invalid reset link. No token provided.</div>
          <a href="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoIcon}>DS</div>
        <h2 style={styles.title}>Set New Password</h2>
        <p style={styles.subtitle}>Choose a strong password for your account</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-label="New password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              aria-label="Confirm password"
            />
          </div>
          <button className="btn btn-accent btn-lg" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
            Reset Password
          </button>
        </form>
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
    background: 'linear-gradient(135deg, #f8f9fc 0%, #e2e6ef 100%)',
  },
  card: {
    background: '#fff',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(26, 58, 107, 0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    border: '1px solid #e2e6ef',
  },
  logoIcon: {
    width: '48px',
    height: '48px',
    background: '#c0392b',
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1.1rem',
    color: '#fff',
    marginBottom: '1.25rem',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#0f2548',
    marginBottom: '0.3rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#6b7489',
    marginBottom: '1.5rem',
  },
};

export default ResetPasswordConfirmPage;
