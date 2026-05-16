import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', entity_type: '', date_from: '', date_to: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pageSize = 50;

  useEffect(() => { loadLogs(); }, [page]);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.items);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load audit logs'); }
  };

  const handleFilter = () => { setPage(1); loadLogs(); };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      const res = await api.get(`/audit-logs/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_logs.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit logs exported');
    } catch { toast.error('Export failed'); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => setFiltersOpen(!filtersOpen)}>🔍 Filters</button>
          <button className="btn btn-success" onClick={handleExport}>📥 Export CSV</button>
        </div>
      </div>

      {filtersOpen && (
        <div className="card" style={{ marginBottom: '1.25rem' }}><div className="card-body" style={{ padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label className="form-label" style={{ fontSize: '0.72rem' }}>Action</label>
              <select className="form-select" value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} style={{ minWidth: '170px' }}>
                <option value="">All</option>
                <option value="USER_LOGIN">USER_LOGIN</option><option value="USER_LOGOUT">USER_LOGOUT</option><option value="USER_CREATED">USER_CREATED</option><option value="USER_BLOCKED">USER_BLOCKED</option>
                <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option><option value="DOCUMENT_DOWNLOADED">DOCUMENT_DOWNLOADED</option><option value="DOCUMENT_SOFT_DELETED">DOCUMENT_SOFT_DELETED</option>
                <option value="COMPANY_CREATED">COMPANY_CREATED</option><option value="BANK_CREATED">BANK_CREATED</option><option value="FACILITY_CREATED">FACILITY_CREATED</option>
              </select>
            </div>
            <div><label className="form-label" style={{ fontSize: '0.72rem' }}>Entity</label>
              <select className="form-select" value={filters.entity_type} onChange={e => setFilters({ ...filters, entity_type: e.target.value })} style={{ minWidth: '120px' }}>
                <option value="">All</option><option value="user">User</option><option value="document">Document</option><option value="company">Company</option><option value="bank">Bank</option><option value="facility">Facility</option>
              </select>
            </div>
            <div><label className="form-label" style={{ fontSize: '0.72rem' }}>From</label><input className="form-input" type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} /></div>
            <div><label className="form-label" style={{ fontSize: '0.72rem' }}>To</label><input className="form-input" type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} /></div>
            <button className="btn btn-primary" onClick={handleFilter}>Apply</button>
          </div>
        </div></div>
      )}

      <div className="table-container">
        <table className="table"><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map(log => (<tr key={log.id}>
              <td style={{ fontSize: '0.78rem', color: '#9e9e9e', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
              <td style={{ fontSize: '0.85rem' }}>{log.actor_email || '—'}</td>
              <td><code style={{ background: '#f5f5f5', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>{log.action}</code></td>
              <td style={{ fontSize: '0.78rem' }}>{log.entity_type || '—'}</td>
              <td style={{ fontSize: '0.78rem', color: '#9e9e9e', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.metadata_ ? JSON.stringify(log.metadata_) : '—'}</td>
            </tr>))}
            {logs.length === 0 && <tr><td colSpan="5"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">No audit logs</div></div></td></tr>}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && <div className="pagination"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button></div>}
    </div>
  );
}
export default AuditLogsPage;
