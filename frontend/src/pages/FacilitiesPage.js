import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import api from '../services/api';

function FacilitiesPage() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });

  useEffect(() => { loadFacilities(); }, []);
  const loadFacilities = async () => { try { const res = await api.get('/masters/facilities'); setFacilities(res.data); } catch { toast.error('Failed to load facilities'); } };
  const confirmDelete = (item) => setDeleteModal({ open: true, item });
  const handleDelete = async () => { const item = deleteModal.item; setDeleteModal({ open: false, item: null }); try { await api.delete(`/masters/facilities/${item.id}`); toast.success(`Deleted: ${item.name}`); loadFacilities(); } catch (err) { toast.error(err.response?.data?.detail || 'Delete failed'); } };

  const isAdmin = user?.role === 'admin';
  const canCreate = user?.role === 'admin' || user?.role === 'user';

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Facilities</h1>{canCreate && <Link to="/facilities/new" className="btn btn-primary">+ Add Facility</Link>}</div>
      <div className="table-container">
        <table className="table"><thead><tr><th>Name</th><th>Code</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
          <tbody>
            {facilities.map(f => (<tr key={f.id}><td style={{ fontWeight: '500', color: '#2c2c2c' }}>{f.name}</td><td><code style={{ background: '#f5f5f5', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem' }}>{f.code}</code></td><td><span className={`badge ${f.is_active ? 'badge-active' : 'badge-inactive'}`}>{f.is_active ? 'Active' : 'Inactive'}</span></td>{isAdmin && (<td><div style={{ display: 'flex', gap: '0.3rem' }}><Link to={`/facilities/${f.id}/edit`} className="btn btn-dark btn-sm">Edit</Link><button className="btn btn-danger btn-sm" onClick={() => confirmDelete(f)}>Delete</button></div></td>)}</tr>))}
            {facilities.length === 0 && <tr><td colSpan={isAdmin ? 4 : 3}><div className="empty-state"><div className="empty-state-icon">🏭</div><div className="empty-state-text">No facilities yet</div></div></td></tr>}
          </tbody>
        </table>
      </div>
      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, item: null })} title="Delete Facility" footer={<><button className="btn btn-outline" onClick={() => setDeleteModal({ open: false, item: null })}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <p>Are you sure you want to delete <strong>"{deleteModal.item?.name}"</strong>?</p>
      </Modal>
    </div>
  );
}
export default FacilitiesPage;
