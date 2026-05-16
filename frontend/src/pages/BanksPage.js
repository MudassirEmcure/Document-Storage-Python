import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import api from '../services/api';

function BanksPage() {
  const { user } = useAuth();
  const [banks, setBanks] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });

  useEffect(() => { loadBanks(); }, []);
  const loadBanks = async () => { try { const res = await api.get('/masters/banks'); setBanks(res.data); } catch { toast.error('Failed to load banks'); } };
  const confirmDelete = (item) => setDeleteModal({ open: true, item });
  const handleDelete = async () => { const item = deleteModal.item; setDeleteModal({ open: false, item: null }); try { await api.delete(`/masters/banks/${item.id}`); toast.success(`Deleted: ${item.name}`); loadBanks(); } catch (err) { toast.error(err.response?.data?.detail || 'Delete failed'); } };

  const isAdmin = user?.role === 'admin';
  const canCreate = user?.role === 'admin' || user?.role === 'user';

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Banks</h1>{canCreate && <Link to="/banks/new" className="btn btn-primary">+ Add Bank</Link>}</div>
      <div className="table-container">
        <table className="table"><thead><tr><th>Name</th><th>Code</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
          <tbody>
            {banks.map(b => (<tr key={b.id}><td style={{ fontWeight: '500', color: '#2c2c2c' }}>{b.name}</td><td><code style={{ background: '#f5f5f5', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem' }}>{b.code}</code></td><td><span className={`badge ${b.is_active ? 'badge-active' : 'badge-inactive'}`}>{b.is_active ? 'Active' : 'Inactive'}</span></td>{isAdmin && (<td><div style={{ display: 'flex', gap: '0.3rem' }}><Link to={`/banks/${b.id}/edit`} className="btn btn-dark btn-sm">Edit</Link><button className="btn btn-danger btn-sm" onClick={() => confirmDelete(b)}>Delete</button></div></td>)}</tr>))}
            {banks.length === 0 && <tr><td colSpan={isAdmin ? 4 : 3}><div className="empty-state"><div className="empty-state-icon">🏦</div><div className="empty-state-text">No banks yet</div></div></td></tr>}
          </tbody>
        </table>
      </div>
      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, item: null })} title="Delete Bank" footer={<><button className="btn btn-outline" onClick={() => setDeleteModal({ open: false, item: null })}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <p>Are you sure you want to delete <strong>"{deleteModal.item?.name}"</strong>?</p>
      </Modal>
    </div>
  );
}
export default BanksPage;
