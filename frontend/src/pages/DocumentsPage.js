import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import api from '../services/api';

function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, doc: null });
  const pageSize = 50;

  useEffect(() => { loadDocuments(); }, [page]);

  const loadDocuments = async () => {
    try {
      const res = await api.get(`/documents?page=${page}&page_size=${pageSize}`);
      setDocuments(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load documents');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadDocuments(); return; }
    try {
      const res = await api.get(`/documents/search?q=${encodeURIComponent(searchQuery)}&page=1&page_size=${pageSize}`);
      setDocuments(res.data.items);
      setTotal(res.data.total);
      setPage(1);
    } catch (err) {
      toast.error('Search failed');
    }
  };

  const handlePreview = (doc) => {
    const token = localStorage.getItem('access_token');
    const url = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}/documents/${doc.id}/preview`;
    // Open in new tab with auth token as query param won't work for bearer auth,
    // so we fetch as blob and open in a new window
    api.get(`/documents/${doc.id}/preview`, { responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: doc.mime_type });
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .catch(() => toast.error('Preview not available for this file type'));
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Downloaded: ${doc.file_name}`);
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const confirmDelete = (doc) => {
    setDeleteModal({ open: true, doc });
  };

  const handleDelete = async () => {
    const doc = deleteModal.doc;
    setDeleteModal({ open: false, doc: null });
    try {
      await api.delete(`/documents/${doc.id}`);
      toast.success(`Deleted: ${doc.document_name}`);
      loadDocuments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const canDelete = (doc) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'user' && doc.uploaded_by === user.id) return true;
    return false;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Documents</h1>
        <span style={{ fontSize: '0.85rem', color: '#757575', fontWeight: '500' }}>
          {total} document{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button className="btn btn-outline" onClick={() => setSearchOpen(!searchOpen)} style={{ marginBottom: searchOpen ? '0.75rem' : 0 }}>
          🔍 {searchOpen ? 'Hide Search' : 'Search Documents'}
        </button>
        {searchOpen && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="Search by document name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              aria-label="Search documents"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleSearch}>Search</button>
            <button className="btn btn-outline" onClick={() => { setSearchQuery(''); setPage(1); loadDocuments(); }}>Clear</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Document Name</th>
              <th>Company</th>
              <th>Bank</th>
              <th>Facility</th>
              <th>Expiry</th>
              <th>Size</th>
              <th>Uploaded By</th>
              <th>Uploaded At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.id}>
                <td style={{ fontWeight: '500', color: '#2c2c2c' }}>{doc.document_name}</td>
                <td>{doc.company_name}</td>
                <td>{doc.bank_name}</td>
                <td>{doc.facility_name}</td>
                <td>
                  <span className={`badge ${new Date(doc.expiry_date) < new Date() ? 'badge-inactive' : 'badge-active'}`}>
                    {doc.expiry_date}
                  </span>
                </td>
                <td style={{ fontSize: '0.78rem', color: '#9e9e9e' }}>{formatFileSize(doc.file_size_bytes)}</td>
                <td style={{ fontSize: '0.82rem' }}>{doc.uploader_name || doc.uploader_email || '—'}</td>
                <td style={{ fontSize: '0.78rem', color: '#757575', whiteSpace: 'nowrap' }}>{new Date(doc.uploaded_at).toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn btn-dark btn-sm" onClick={() => handlePreview(doc)} title="Preview">👁</button>
                    <button className="btn btn-success btn-sm" onClick={() => handleDownload(doc)} title="Download">↓</button>
                    {canDelete(doc) && (
                      <button className="btn btn-danger btn-sm" onClick={() => confirmDelete(doc)} title="Delete">✕</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr><td colSpan="9"><div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">No documents found</div></div></td></tr>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, doc: null })}
        title="Confirm Delete"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteModal({ open: false, doc: null })}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </>
        }
      >
        <p style={{ color: '#424242' }}>
          Are you sure you want to delete <strong>"{deleteModal.doc?.document_name}"</strong>?
        </p>
        <p style={{ color: '#9e9e9e', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          This action will soft-delete the document. It will no longer appear in listings.
        </p>
      </Modal>
    </div>
  );
}

export default DocumentsPage;
