import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, expiring30: 0, expired: 0 });
  const [hierarchy, setHierarchy] = useState([]);
  const [drillLevel, setDrillLevel] = useState('companies'); // companies | banks | facilities | documents
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [filteredDocs, setFilteredDocs] = useState([]);

  useEffect(() => {
    loadDashboard();
    loadHierarchy();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/documents?page=1&page_size=50');
      const docs = res.data.items;
      const total = res.data.total;

      const today = new Date().toISOString().split('T')[0];
      const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      const expired = docs.filter(d => d.expiry_date < today).length;
      const expiring30 = docs.filter(d => d.expiry_date >= today && d.expiry_date <= thirtyDays).length;

      setStats({ total, expiring30, expired });
    } catch (err) {
      console.error('Failed to load dashboard', err);
    }
  };

  const loadHierarchy = async () => {
    try {
      const res = await api.get('/documents/hierarchy');
      setHierarchy(res.data);
    } catch (err) {
      console.error('Failed to load hierarchy', err);
    }
  };

  const handleCompanyClick = (company) => {
    setSelectedCompany(company);
    setDrillLevel('banks');
  };

  const handleBankClick = (bank) => {
    setSelectedBank(bank);
    setDrillLevel('facilities');
  };

  const handleFacilityClick = async (facility) => {
    setSelectedFacility(facility);
    setDrillLevel('documents');
    // Load documents filtered by company + bank + facility
    try {
      const res = await api.get('/documents?page=1&page_size=100');
      const docs = res.data.items.filter(d =>
        d.company_id === selectedCompany.id &&
        d.bank_id === selectedBank.id &&
        d.facility_id === facility.id
      );
      setFilteredDocs(docs);
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  };

  const resetToCompanies = () => {
    setDrillLevel('companies');
    setSelectedCompany(null);
    setSelectedBank(null);
    setSelectedFacility(null);
    setFilteredDocs([]);
  };

  const resetToBanks = () => {
    setDrillLevel('banks');
    setSelectedBank(null);
    setSelectedFacility(null);
    setFilteredDocs([]);
  };

  const resetToFacilities = () => {
    setDrillLevel('facilities');
    setSelectedFacility(null);
    setFilteredDocs([]);
  };

  const canUpload = user?.role === 'admin' || user?.role === 'user';

  const handlePreview = (doc) => {
    api.get(`/documents/${doc.id}/preview`, { responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: doc.mime_type });
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .catch(() => alert('Preview not available for this file type'));
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
    } catch (err) {
      alert('Download failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        {canUpload && (
          <Link to="/documents/upload" className="btn btn-primary">
            ⬆️ Upload Documents
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary)' }}>📄</div>
          <div>
            <div className="kpi-value">{stats.total}</div>
            <div className="kpi-label">Total Documents</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(255,162,30,.1)', color: '#f97316' }}>⚠️</div>
          <div>
            <div className="kpi-value" style={{ color: '#f97316' }}>{stats.expiring30}</div>
            <div className="kpi-label">Expiring in 30 Days</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(239,68,68,.1)', color: 'var(--color-error)' }}>🚨</div>
          <div>
            <div className="kpi-value" style={{ color: 'var(--color-error)' }}>{stats.expired}</div>
            <div className="kpi-label">Expired</div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className={drillLevel === 'companies' ? 'breadcrumb-current' : 'breadcrumb-item'} onClick={resetToCompanies}>
          Companies
        </span>
        {selectedCompany && (
          <>
            <span className="breadcrumb-separator">›</span>
            <span className={drillLevel === 'banks' ? 'breadcrumb-current' : 'breadcrumb-item'} onClick={resetToBanks}>
              {selectedCompany.name}
            </span>
          </>
        )}
        {selectedBank && (
          <>
            <span className="breadcrumb-separator">›</span>
            <span className={drillLevel === 'facilities' ? 'breadcrumb-current' : 'breadcrumb-item'} onClick={resetToFacilities}>
              {selectedBank.name}
            </span>
          </>
        )}
        {selectedFacility && (
          <>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{selectedFacility.name}</span>
          </>
        )}
      </div>

      {/* Drill-down Content */}
      {drillLevel === 'companies' && (
        <div>
          <h3 className="section-title">Companies ({hierarchy.length})</h3>
          {hierarchy.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <div className="empty-state-text">No companies with documents yet</div>
            </div>
          ) : (
            <div className="hierarchy-grid">
              {hierarchy.map(comp => (
                <div key={comp.id} className="hierarchy-card" onClick={() => handleCompanyClick(comp)}>
                  <div className="hierarchy-card-title">{comp.name}</div>
                  <div className="hierarchy-card-code">{comp.code}</div>
                  <div className="hierarchy-card-count">
                    {comp.doc_count} document{comp.doc_count !== 1 ? 's' : ''} · {comp.banks.length} bank{comp.banks.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {drillLevel === 'banks' && selectedCompany && (
        <div>
          <h3 className="section-title">Banks under {selectedCompany.name} ({selectedCompany.banks.length})</h3>
          <div className="hierarchy-grid">
            {selectedCompany.banks.map(bank => (
              <div key={bank.id} className="hierarchy-card" onClick={() => handleBankClick(bank)}>
                <div className="hierarchy-card-title">{bank.name}</div>
                <div className="hierarchy-card-code">{bank.code}</div>
                <div className="hierarchy-card-count">
                  {bank.doc_count} document{bank.doc_count !== 1 ? 's' : ''} · {bank.facilities.length} facilit{bank.facilities.length !== 1 ? 'ies' : 'y'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {drillLevel === 'facilities' && selectedBank && (
        <div>
          <h3 className="section-title">Facilities under {selectedBank.name} ({selectedBank.facilities.length})</h3>
          <div className="hierarchy-grid">
            {selectedBank.facilities.map(fac => (
              <div key={fac.id} className="hierarchy-card" onClick={() => handleFacilityClick(fac)}>
                <div className="hierarchy-card-title">{fac.name}</div>
                <div className="hierarchy-card-code">{fac.code}</div>
                <div className="hierarchy-card-count">
                  {fac.doc_count} document{fac.doc_count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {drillLevel === 'documents' && selectedFacility && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="section-title">Documents ({filteredDocs.length})</h3>
            {canUpload && (
              <Link
                to="/documents/upload"
                state={{
                  prefill: {
                    company_id: selectedCompany.id,
                    bank_id: selectedBank.id,
                    facility_id: selectedFacility.id,
                  }
                }}
                className="btn btn-primary btn-sm"
              >
                ⬆️ Upload Here
              </Link>
            )}
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>File</th>
                  <th>Expiry Date</th>
                  <th>Uploaded By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map(doc => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: '500', color: '#2c2c2c' }}>{doc.document_name}</td>
                    <td style={{ fontSize: '0.8rem' }}>{doc.file_name}</td>
                    <td>
                      <span className={`badge ${new Date(doc.expiry_date) < new Date() ? 'badge-inactive' : 'badge-active'}`}>
                        {doc.expiry_date}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{doc.uploader_name || doc.uploader_email}</td>
                    <td>
                      <button className="btn btn-dark btn-sm" onClick={() => handlePreview(doc)} title="Preview" style={{marginRight:'0.3rem'}}>👁</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleDownload(doc)}>↓ Download</button>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr><td colSpan="5"><div className="empty-state"><div className="empty-state-text">No documents found</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--color-neutral-500)',
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    marginBottom: 'var(--space-4)',
  },
};

export default DashboardPage;
