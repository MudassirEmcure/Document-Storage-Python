import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

function UploadDocumentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill || {};

  const [companies, setCompanies] = useState([]);
  const [banks, setBanks] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [form, setForm] = useState({
    company_id: prefill.company_id || '',
    bank_id: prefill.bank_id || '',
    facility_id: prefill.facility_id || '',
  });
  // Each file entry: { file: File, expiry_date: string }
  const [fileEntries, setFileEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => { loadMasters(); }, []);

  const loadMasters = async () => {
    try {
      const [compRes, bankRes, facRes] = await Promise.all([
        api.get('/masters/companies'),
        api.get('/masters/banks'),
        api.get('/masters/facilities'),
      ]);
      setCompanies(compRes.data);
      setBanks(bankRes.data);
      setFacilities(facRes.data);
    } catch (err) {
      toast.error('Failed to load master data');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newEntries = Array.from(e.dataTransfer.files).map(file => ({
        file,
        expiry_date: '',
      }));
      setFileEntries(prev => [...prev, ...newEntries]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newEntries = Array.from(e.target.files).map(file => ({
        file,
        expiry_date: '',
      }));
      setFileEntries(prev => [...prev, ...newEntries]);
      e.target.value = '';
    }
  };

  const removeFile = (index) => {
    setFileEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateExpiryDate = (index, date) => {
    setFileEntries(prev => prev.map((entry, i) => i === index ? { ...entry, expiry_date: date } : entry));
  };

  const setAllExpiryDates = (date) => {
    setFileEntries(prev => prev.map(entry => ({ ...entry, expiry_date: date })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (fileEntries.length === 0) {
      toast.warning('Please select at least one file to upload');
      return;
    }
    if (!form.company_id || !form.bank_id || !form.facility_id) {
      toast.warning('Please select Company, Bank, and Facility');
      return;
    }

    // Validate all expiry dates are set
    const missingExpiry = fileEntries.findIndex(entry => !entry.expiry_date);
    if (missingExpiry !== -1) {
      toast.warning(`Please set expiry date for "${fileEntries[missingExpiry].file.name}"`);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('company_id', form.company_id);
    formData.append('bank_id', form.bank_id);
    formData.append('facility_id', form.facility_id);

    fileEntries.forEach(entry => {
      formData.append('files', entry.file);
      formData.append('expiry_dates', entry.expiry_date);
    });

    try {
      const res = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const count = Array.isArray(res.data) ? res.data.length : 1;
      toast.success(`${count} document${count > 1 ? 's' : ''} uploaded successfully!`);
      navigate('/documents');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Show pre-fill info
  const prefillInfo = prefill.company_id ? (() => {
    const comp = companies.find(c => c.id === prefill.company_id);
    const bank = banks.find(b => b.id === prefill.bank_id);
    const fac = facilities.find(f => f.id === prefill.facility_id);
    if (comp && bank && fac) return `${comp.name} › ${bank.name} › ${fac.name}`;
    return null;
  })() : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload Documents</h1>
      </div>

      <div className="card" style={{ maxWidth: '750px' }}>
        <div className="card-body">
          {prefillInfo && (
            <div style={styles.prefillBanner}>
              📍 Uploading to: <strong>{prefillInfo}</strong>
            </div>
          )}
          <p style={{ color: '#757575', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Select files to upload. Document names are captured from file names. Set an expiry date for each document.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Company / Bank / Facility selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Company *</label>
                <select className="form-select" value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })} required>
                  <option value="">Select</option>
                  {companies.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bank *</label>
                <select className="form-select" value={form.bank_id} onChange={e => setForm({ ...form, bank_id: e.target.value })} required>
                  <option value="">Select</option>
                  {banks.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Facility *</label>
                <select className="form-select" value={form.facility_id} onChange={e => setForm({ ...form, facility_id: e.target.value })} required>
                  <option value="">Select</option>
                  {facilities.filter(f => f.is_active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>

            {/* File Drop Zone */}
            <div className="form-group">
              <label className="form-label">Files * (max 100 MB each)</label>
              <div
                style={{ ...styles.dropZone, ...(dragActive ? styles.dropZoneActive : {}) }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <span style={{ fontSize: '2rem' }}>📁</span>
                <p style={{ margin: '0.4rem 0 0', color: '#757575', fontSize: '0.85rem' }}>
                  Drag & drop files here, or <span style={{ color: '#c0392b', fontWeight: '600' }}>click to browse</span>
                </p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* File List with per-file expiry date */}
            {fileEntries.length > 0 && (
              <div style={styles.fileList}>
                <div style={styles.fileListHeader}>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                    {fileEntries.length} file{fileEntries.length > 1 ? 's' : ''} selected
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="date"
                      style={styles.bulkDateInput}
                      onChange={(e) => { if (e.target.value) setAllExpiryDates(e.target.value); }}
                      title="Set expiry date for all files"
                    />
                    <span style={{ fontSize: '0.7rem', color: '#9e9e9e' }}>Set all</span>
                    <button type="button" style={styles.clearAll} onClick={() => setFileEntries([])}>Clear all</button>
                  </div>
                </div>

                {fileEntries.map((entry, idx) => (
                  <div key={idx} style={styles.fileItem}>
                    <div style={styles.fileItemLeft}>
                      <span style={styles.fileItemName}>
                        {entry.file.name.replace(/\.[^/.]+$/, '')}
                      </span>
                      <span style={styles.fileItemMeta}>
                        {entry.file.name} · {formatSize(entry.file.size)}
                      </span>
                    </div>
                    <div style={styles.fileItemRight}>
                      <input
                        type="date"
                        value={entry.expiry_date}
                        onChange={(e) => updateExpiryDate(idx, e.target.value)}
                        style={styles.expiryInput}
                        required
                        title="Expiry date"
                      />
                      <button type="button" style={styles.fileRemove} onClick={() => removeFile(idx)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={loading || fileEntries.length === 0}
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
            >
              {loading ? '⏳ Uploading...' : `⬆️ Upload ${fileEntries.length > 0 ? fileEntries.length + ' Document' + (fileEntries.length > 1 ? 's' : '') : ''}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  prefillBanner: {
    background: '#fff5f5',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '0.7rem 1rem',
    fontSize: '0.85rem',
    color: '#2c2c2c',
    marginBottom: '1rem',
  },
  dropZone: {
    border: '2px dashed #e0e0e0',
    borderRadius: '12px',
    padding: '2rem 1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: '#fafafa',
  },
  dropZoneActive: {
    borderColor: '#c0392b',
    background: '#fff5f5',
  },
  fileList: {
    border: '1px solid #eee',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  fileListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    background: '#f5f5f5',
    borderBottom: '1px solid #eee',
  },
  bulkDateInput: {
    padding: '0.25rem 0.4rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.75rem',
  },
  clearAll: {
    background: 'none',
    border: 'none',
    color: '#c0392b',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    borderBottom: '1px solid #f5f5f5',
    gap: '0.75rem',
  },
  fileItemLeft: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  fileItemName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#2c2c2c',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileItemMeta: {
    fontSize: '0.72rem',
    color: '#9e9e9e',
  },
  fileItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
  },
  expiryInput: {
    padding: '0.35rem 0.5rem',
    border: '1.5px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '0.8rem',
    width: '140px',
  },
  fileRemove: {
    background: 'none',
    border: 'none',
    color: '#c0392b',
    fontSize: '1.1rem',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
};

export default UploadDocumentPage;
