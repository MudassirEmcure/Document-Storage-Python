import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

function CompanyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', code: '', is_active: true });
  const isEdit = Boolean(id);

  useEffect(() => { if (isEdit) loadCompany(); }, [id]);

  const loadCompany = async () => {
    try {
      const res = await api.get('/masters/companies');
      const company = res.data.find(c => c.id === id);
      if (company) setForm({ name: company.name, code: company.code, is_active: company.is_active });
    } catch (err) { toast.error('Failed to load company'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.patch(`/masters/companies/${id}`, form);
        toast.success('Company updated');
      } else {
        await api.post('/masters/companies', { name: form.name, code: form.code });
        toast.success('Company created');
      }
      navigate('/companies');
    } catch (err) { toast.error(err.response?.data?.detail || 'Operation failed'); }
  };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">{isEdit ? 'Edit Company' : 'New Company'}</h1></div>
      <div className="card" style={{ maxWidth: '500px' }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Company name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Code * (unique)</label>
              <input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. COMP001" required />
            </div>
            {isEdit && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                  <span>Active</span>
                </label>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" type="submit">{isEdit ? 'Update' : 'Create'}</button>
              <button className="btn btn-outline" type="button" onClick={() => navigate('/companies')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CompanyFormPage;
