import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

function UserEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', email: '', role: 'user', password: '',
    employee_id: '', first_name: '', last_name: '',
    designation: '', department: '', division: '', office_location: '',
    is_blocked: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUser(); }, [id]);

  const loadUser = async () => {
    try {
      const res = await api.get(`/users/${id}`);
      const u = res.data;
      setForm({
        username: u.username || '',
        email: u.email || '',
        role: u.role || 'user',
        password: '',
        employee_id: u.employee_id || '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        designation: u.designation || '',
        department: u.department || '',
        division: u.division || '',
        office_location: u.office_location || '',
        is_blocked: u.is_blocked || false,
      });
    } catch (err) {
      toast.error('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Build payload with only changed fields
    const payload = {};
    if (form.username) payload.username = form.username;
    if (form.email) payload.email = form.email;
    payload.role = form.role;
    if (form.password) payload.password = form.password;
    payload.employee_id = form.employee_id;
    payload.first_name = form.first_name;
    payload.last_name = form.last_name;
    payload.designation = form.designation;
    payload.department = form.department;
    payload.division = form.division;
    payload.office_location = form.office_location;
    payload.is_blocked = form.is_blocked;

    try {
      await api.patch(`/users/${id}`, payload);
      toast.success('User updated successfully');
      navigate('/users');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#757575' }}>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Edit User</h1>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input className="form-input" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Division</label>
                <input className="form-input" value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Office Location</label>
                <input className="form-input" value={form.office_location} onChange={e => setForm({ ...form, office_location: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_blocked} onChange={e => setForm({ ...form, is_blocked: e.target.checked })} />
                <span style={{ fontSize: '0.85rem', color: form.is_blocked ? '#c0392b' : '#424242' }}>
                  {form.is_blocked ? 'User is BLOCKED' : 'User is Active'}
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" type="submit">Save Changes</button>
              <button className="btn btn-outline" type="button" onClick={() => navigate('/users')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserEditPage;
