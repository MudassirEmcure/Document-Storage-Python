import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import api from '../services/api';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [blockModal, setBlockModal] = useState({ open: false, user: null, action: '' });
  const [importModal, setImportModal] = useState(false);
  const [importIds, setImportIds] = useState('');
  const [importing, setImporting] = useState(false);
  const pageSize = 50;

  useEffect(() => { loadUsers(); }, [page]);

  const loadUsers = async () => {
    try {
      const res = await api.get(`/users?page=${page}&page_size=${pageSize}`);
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load users'); }
  };

  const confirmAction = (u, action) => setBlockModal({ open: true, user: u, action });

  const handleBlockAction = async () => {
    const { user: u, action } = blockModal;
    setBlockModal({ open: false, user: null, action: '' });
    try {
      await api.patch(`/users/${u.id}/${action}`);
      toast.success(`User ${action}ed: ${u.username}`);
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.detail || `${action} failed`); }
  };

  const handleImport = async () => {
    if (!importIds.trim()) { toast.warning('Enter at least one Employee ID'); return; }
    setImporting(true);
    try {
      const res = await api.post('/users/import', { employee_ids: importIds.trim(), role: 'user' });
      const count = res.data.length;
      toast.success(`${count} employee${count > 1 ? 's' : ''} imported successfully`);
      setImportModal(false);
      setImportIds('');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally { setImporting(false); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setImportModal(true)}>🔗 Import Employees</button>
          <Link to="/users/new" className="btn btn-dark">+ Create User</Link>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Emp ID</th>
              <th>Department</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: '500', color: '#2c2c2c' }}>
                  {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '—'}
                </td>
                <td style={{ fontSize: '0.8rem' }}>{u.username}</td>
                <td style={{ fontSize: '0.8rem' }}>{u.email}</td>
                <td>
                  <span style={{
                    background: u.role === 'admin' ? '#fef2f2' : u.role === 'user' ? '#f5f5f5' : '#f0fdf4',
                    color: u.role === 'admin' ? '#c0392b' : u.role === 'user' ? '#424242' : '#166534',
                    padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase',
                  }}>{u.role}</span>
                </td>
                <td style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{u.employee_id || '—'}</td>
                <td style={{ fontSize: '0.78rem', color: '#757575' }}>{u.department || '—'}</td>
                <td><span className={`badge ${u.is_blocked ? 'badge-inactive' : 'badge-active'}`}>{u.is_blocked ? 'Blocked' : 'Active'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <Link to={`/users/${u.id}/edit`} className="btn btn-dark btn-sm">Edit</Link>
                    {u.is_blocked
                      ? <button className="btn btn-success btn-sm" onClick={() => confirmAction(u, 'unblock')}>Unblock</button>
                      : <button className="btn btn-danger btn-sm" onClick={() => confirmAction(u, 'block')}>Block</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan="8"><div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-text">No users</div></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Block/Unblock Modal */}
      <Modal
        isOpen={blockModal.open}
        onClose={() => setBlockModal({ open: false, user: null, action: '' })}
        title={`${blockModal.action === 'block' ? 'Block' : 'Unblock'} User`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setBlockModal({ open: false, user: null, action: '' })}>Cancel</button>
            <button className={`btn ${blockModal.action === 'block' ? 'btn-danger' : 'btn-success'}`} onClick={handleBlockAction}>
              {blockModal.action === 'block' ? 'Block' : 'Unblock'}
            </button>
          </>
        }
      >
        <p>Are you sure you want to {blockModal.action} <strong>"{blockModal.user?.username}"</strong>?</p>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        title="Import Employees from Emcure"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setImportModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? '⏳ Importing...' : '🔗 Import'}
            </button>
          </>
        }
      >
        <p style={{ color: '#757575', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Enter Employee IDs separated by commas. All users will be imported with role <strong>User</strong> and default password <strong>Emcure@12345</strong>.
        </p>
        <div className="form-group">
          <label className="form-label">Employee IDs *</label>
          <input
            className="form-input"
            value={importIds}
            onChange={e => setImportIds(e.target.value)}
            placeholder="e.g. 93300117, 93300040, 93300055"
          />
        </div>
      </Modal>
    </div>
  );
}

export default UsersPage;
