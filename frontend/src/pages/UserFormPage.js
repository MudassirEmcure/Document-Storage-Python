import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

function UserFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', role: 'user', password: '', employee_id: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      toast.success('User created successfully');
      navigate('/users');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Creation failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Create User</h1>
      </div>

      <div className="card" style={{ maxWidth: '500px' }}>
        <div className="card-body">
          <p style={{ color: '#757575', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            If no password is provided, default is <strong>Emcure@12345</strong>.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Enter username" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@emcure.com" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input className="form-input" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Leave blank for Emcure@12345" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" type="submit">Create User</button>
              <button className="btn btn-outline" type="button" onClick={() => navigate('/users')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserFormPage;
