import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import api from '../services/api';

function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    try {
      const res = await api.get('/masters/companies');
      setCompanies(res.data);
    } catch (err) {
      toast.error('Failed to load companies');
    }
  };

  const confirmDelete = (company) => setDeleteModal({ open: true, item: company });

  const handleDelete = async () => {
    const item = deleteModal.item;
    setDeleteModal({ open: false, item: null });
    try {
      await api.delete(`/masters/companies/${item.id}`);
      toast.success(`Deleted: ${item.name}`);
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const isAdmin = user?.role === 'admin';
  const canCreate = user?.role === 'admin' || user?.role === 'user';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Companies</h1>
        {canCreate && <Link to="/companies/new" className="btn btn-primary">+ Add Company</Link>}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Status</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: '500', color: '#2c2c2c' }}>{c.name}</td>
                <td><code style={{ background: '#f5f5f5', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem' }}>{c.code}</code></td>
                <td><span className={`badge ${c.is_active ? 'badge-active' : 'badge-inactive'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                {isAdmin && (
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <Link to={`/companies/${c.id}/edit`} className="btn btn-dark btn-sm">Edit</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => confirmDelete(c)}>Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {companies.length === 0 && (
              <tr><td colSpan={isAdmin ? 4 : 3}><div className="empty-state"><div className="empty-state-icon">🏢</div><div className="empty-state-text">No companies yet</div></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        title="Delete Company"
        footer={<><button className="btn btn-outline" onClick={() => setDeleteModal({ open: false, item: null })}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}
      >
        <p>Are you sure you want to delete <strong>"{deleteModal.item?.name}"</strong>?</p>
        <p style={{ color: '#9e9e9e', fontSize: '0.85rem', marginTop: '0.5rem' }}>This can only succeed if no documents are linked to this company.</p>
      </Modal>
    </div>
  );
}

export default CompaniesPage;
