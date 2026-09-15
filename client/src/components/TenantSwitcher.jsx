import React, { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import PhosphorIcon from './PhosphorIcon.jsx';

export default function TenantSwitcher() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [activeId, setActiveId] = useState(user?.activeTenantId || null);

  useEffect(() => {
    api.get('/tenants/list').then((t) => {
      setTenants(t || []);
      if (t && t.length > 0 && !t.some((x) => x.Id === activeId)) {
        setActiveId(t[0].Id);
      }
    }).catch(() => {});
  }, []);

  if (tenants.length === 0) {
    return (
      <div className="nav-item px-3 mt-2">
        <span className="small text-muted d-flex align-items-center gap-2">
          <PhosphorIcon name="house" size={14} /> Minhas Finanças
        </span>
      </div>
    );
  }

  const onChanged = async (e) => {
    const target = e.target.value;
    if (!target || target === activeId) return;
    try {
      await api.post('/tenants/switch', { tenantId: target });
      window.location.href = '/dashboard';
    } catch { /* ignora */ }
  };

  if (tenants.length === 1) {
    return (
      <div className="nav-item px-3 mt-2">
        <span className="small text-muted d-flex align-items-center gap-2">
          <PhosphorIcon name="house" size={14} /> {tenants[0].Name}
        </span>
      </div>
    );
  }

  return (
    <div className="nav-item px-3 mt-2">
      <select
        className="input"
        style={{ padding: '8px 10px', fontSize: '0.82rem', borderRadius: 10, cursor: 'pointer' }}
        value={activeId || ''}
        onChange={onChanged}
        title="Alternar espaço"
      >
        {tenants.map((t) => (
          <option key={t.Id} value={t.Id}>{t.Name}</option>
        ))}
      </select>
    </div>
  );
}