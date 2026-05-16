import React, { useState } from 'react';
import api from '../services/api';

function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.post('/auth/password-reset/request', { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'Request failed');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoIcon}>DS</div>
        <h2 style={styles.title}>Reset Password</h2>
        <p style={styles.subtitle}>Enter your email to receive a reset link</p>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email"
            />
          </div>
          <button className="btn btn-accent btn-lg" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
            Send Reset Link
          </button>
        </form>
        <div style={styles.backLink}>
          <a href="/login" style={{ color: '#1a3a6b', textDecoration: 'none', fontWeight: '500', fontSize: '0.85rem' }}>← Back to Login</a>
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
  backLink: {
    marginTop: '1.5rem',
  },
};

export default ResetPasswordPage;
