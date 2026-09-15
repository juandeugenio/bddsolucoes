import React, { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';
import { applyTheme, getTheme } from '../utils/theme.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import Modal from '../components/Modal.jsx';
import { useNavigate } from 'react-router-dom';

function SectionHeader({ children }) {
  return <div className="settings-section-header">{children}</div>;
}

function SettingsItem({ icon, iconBg, iconColor, title, sub, value, onClick, right }) {
  return (
    <button className="settings-item" onClick={onClick}>
      <div className="settings-squircle" style={{ backgroundColor: iconBg, color: iconColor }}>
        <PhosphorIcon name={icon} size={20} />
      </div>
      <div className="flex-grow-1">
        <div className="fw-semibold text-white">{title}</div>
        {sub && <div className="small" style={{ color: '#8C85AA' }}>{sub}</div>}
      </div>
      {value !== undefined && value !== null && <span style={{ color: '#8C85AA', fontSize: '0.9rem' }}>{value}</span>}
      {right}
      <PhosphorIcon name="caret-right" size={16} style={{ color: '#6F688F' }} />
    </button>
  );
}

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [controlMode, setControlMode] = useState(0);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitValue, setLimitValue] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState(getTheme());
  const [showCoupleModal, setShowCoupleModal] = useState(false);
  const [showSingleMemberModal, setShowSingleMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [infoModal, setInfoModal] = useState({ title: '', body: '' });
  const [showExportPdfModal, setShowExportPdfModal] = useState(false);
  const [exportAllMonths, setExportAllMonths] = useState(false);
  const [exportMonth, setExportMonth] = useState(String(new Date().getMonth() + 1));
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));
  const [memberEditState, setMemberEditState] = useState({});

  useEffect(() => {
    api.get('/settings/profile').then((p) => {
      setProfile(p);
      setNotifications(p.notificationsEnabled);
    }).catch(() => {});
    api.get('/tenants/members').then(setMembers).catch(() => {});
    api.get('/tenants/control-mode').then((m) => setControlMode(m.controlMode)).catch(() => {});
    api.get('/categories/limits').then((d) => {
      setLimitValue(d.overall ? String(d.overall) : '');
    }).catch(() => {});
  }, []);

  const toggleNotifications = async () => {
    const next = !notifications;
    setNotifications(next);
    try {
      await api.put('/settings/profile', { notificationsEnabled: next });
      showToast('Preferência salva');
    } catch (err) {
      showToast(err.message, 'error');
      setNotifications(!next);
    }
  };

  const saveLimit = async () => {
    try {
      await api.post('/categories/overall-limit', { amount: parseFloat(String(limitValue).replace(',', '.')) || 0 });
      setShowLimitModal(false);
      showToast('Limite salvo');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const updateMemberField = (id, field, value) => {
    setMembers((prev) => prev.map((m) => (m.Id === id ? { ...m, [field]: value } : m)));
  };

  const saveAllMembers = async () => {
    try {
      for (const m of members) {
        await api.put(`/settings/members/${m.Id}`, { name: m.Name, email: m.Email });
      }
      setShowCoupleModal(false);
      showToast('Membros atualizados');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const saveSingleMember = async () => {
    if (!editingMember) return;
    try {
      await api.put(`/settings/members/${editingMember.Id}`, { name: memberEditState.name, email: memberEditState.email });
      setShowSingleMemberModal(false);
      showToast('Membro atualizado');
      api.get('/tenants/members').then(setMembers).catch(() => {});
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const setCurrency = async (c) => {
    try {
      await api.put('/settings/profile', { defaultCurrency: c });
      setProfile({ ...profile, defaultCurrency: c });
      updateUser({ defaultCurrency: c });
      setShowCurrencyModal(false);
      showToast('Moeda atualizada');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const setTimezone = async (tz) => {
    try {
      await api.put('/settings/profile', { timezone: tz });
      await api.post('/tenants/timezone', { timezone: tz });
      setProfile({ ...profile, timezone: tz });
      setShowTimezoneModal(false);
      showToast('Fuso atualizado');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const memberAvatars = ['#9675FF', '#00B2FE'];

  return (
    <div>
      <h2 className="fw-bold text-white mb-4" style={{ fontSize: '1.8rem' }}>Configurações</h2>

      {/* 1. CONTA E CASAL */}
      <SectionHeader>Conta e Casal</SectionHeader>
      <div className="settings-card-group">
        <button className="settings-item w-100" onClick={() => setShowCoupleModal(true)}>
          <div className="settings-squircle" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}>
            <PhosphorIcon name="users" size={20} />
          </div>
          <div className="flex-grow-1">
            <div className="fw-semibold text-white">Editar Dados dos Membros do Casal</div>
            <div className="small" style={{ color: '#8C85AA' }}>{members.length} membro(s) · clique para editar</div>
          </div>
          <PhosphorIcon name="caret-right" size={16} style={{ color: '#6F688F' }} />
        </button>
        <div className="settings-divider" />
        {members.map((m, i) => (
          <div key={m.Id}>
            <button
              className="settings-item w-100"
              onClick={() => {
                setEditingMember(m);
                setMemberEditState({ name: m.Name || '', email: m.Email || '' });
                setShowSingleMemberModal(true);
              }}
            >
              <div className="avatar-circle" style={{ width: 38, height: 38, background: memberAvatars[i % 2] || '#9675FF' }}>
                {String(m.Name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-grow-1">
                <div className="fw-bold text-white">{m.Name || m.Email}</div>
                <div className="small" style={{ color: '#8C85AA' }}>{m.Email}</div>
              </div>
              <PhosphorIcon name="caret-right" size={16} style={{ color: '#6F688F' }} />
            </button>
            {i < members.length - 1 && <div className="settings-divider" />}
          </div>
        ))}
        {members.length === 0 && (
          <div className="settings-item"><div className="small" style={{ color: '#8C85AA' }}>Nenhum membro.</div></div>
        )}

        <div className="settings-divider" />
        <div className="settings-item" style={{ cursor: 'pointer' }} onClick={toggleNotifications}>
          <div className="settings-squircle" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}>
            <PhosphorIcon name="share-network" size={20} />
          </div>
          <div className="flex-grow-1">
            <div className="fw-semibold text-white">Compartilhar as novas transações</div>
            <div className="small" style={{ color: '#8C85AA' }}>Pré-seleciona a conta conjunta ao adicionar uma despesa ou receita</div>
          </div>
          <div className={`sweet-toggle-switch ${notifications ? 'on' : ''}`} />
        </div>

        <div className="settings-divider" />
        {members.length >= 2 && (
        <div className="p-3 px-4">
          <div className="d-flex gap-2 mb-3">
            <button
              className={`btn btn-sm flex-fill ${controlMode === 0 ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={async () => { await api.post('/tenants/control-mode', { controlMode: 0 }); setControlMode(0); }}
            >
              Divisão
            </button>
            <button
              className={`btn btn-sm flex-fill ${controlMode === 1 ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={async () => { await api.post('/tenants/control-mode', { controlMode: 1 }); setControlMode(1); }}
            >
              Conjunta
            </button>
          </div>
          {controlMode === 0 ? (
            <div>
              <div className="slider-division-track">
                <div className="slider-division-thumb" />
              </div>
              <div className="d-flex justify-content-between px-1 mt-2">
                {members.slice(0, 2).map((m, i) => (
                  <div key={m.Id} className="d-flex align-items-center gap-2">
                    <div className="avatar-circle" style={{ width: 32, height: 32, background: memberAvatars[i % 2] || '#9675FF', fontSize: '0.75rem' }}>
                      {String(m.Name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="small fw-semibold" style={{ color: memberAvatars[i % 2] }}>{i === 0 ? '50%' : '50%'}</span>
                  </div>
                ))}
              </div>
              <div className="small mt-2" style={{ color: '#8C85AA' }}>
                Cada um tem seu dinheiro; despesas do casal são divididas entre vocês.
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="d-flex align-items-center justify-content-center gap-3 mb-2">
                {members.slice(0, 2).map((m, i) => (
                  <div key={m.Id} className="avatar-circle" style={{ width: 38, height: 38, background: memberAvatars[i % 2] || '#9675FF' }}>
                    {String(m.Name || '?').charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <div className="fw-bold text-white mb-1">Conjunta</div>
              <div className="small" style={{ color: '#8C85AA' }}>
                Tudo junto: um caixa único para o casal, sem divisão ou acertos.
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* 2. LIMITES E CATEGORIAS */}
      <SectionHeader>Limites e Categorias</SectionHeader>
      <div className="settings-card-group">
        <SettingsItem
          icon="sliders"
          iconBg="#2D234D"
          iconColor="#9675FF"
          title="Limite de Gastos Mensal"
          value={limitValue ? `R$ ${limitValue}` : 'R$ 0'}
          onClick={() => setShowLimitModal(true)}
        />
        <div className="settings-divider" />
        <SettingsItem icon="star" iconBg="#38291F" iconColor="#FF9500" title="Limites de gastos por categoria" onClick={() => (window.location.href = '/settings/limits')} />
        <div className="settings-divider" />
        <SettingsItem icon="squares-four" iconBg="#23382D" iconColor="#2ED573" title="Editar Categorias" onClick={() => (window.location.href = '/categories')} />
        <div className="settings-divider" />
        <SettingsItem icon="credit-card" iconBg="#1A344A" iconColor="#00B2FE" title="Métodos de pagamento" right={<span className="badge" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}>GERENCIAR</span>} onClick={() => (window.location.href = '/settings/methods')} />
        <div className="settings-divider" />
        <SettingsItem icon="credit-card" iconBg="#2D234D" iconColor="#9675FF" title="Cartões de crédito" right={<span className="badge" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}>GERENCIAR</span>} onClick={() => (window.location.href = '/settings/cards')} />
        <div className="settings-divider" />
        <SettingsItem icon="arrows-clockwise" iconBg="#2D234D" iconColor="#9675FF" title="Transações recorrentes" right={<span className="badge" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}>GERENCIAR</span>} onClick={() => (window.location.href = '/recurring')} />
        <div className="settings-divider" />
        <SettingsItem icon="currency-dollar" iconBg="#1A344A" iconColor="#00B2FE" title="Moeda Padrão" value={profile?.defaultCurrency || 'R$'} onClick={() => setShowCurrencyModal(true)} />
        <div className="settings-divider" />
        <SettingsItem icon="globe" iconBg="#23382D" iconColor="#2ED573" title="Fuso horário" value={profile?.timezone || 'America/Sao_Paulo'} onClick={() => setShowTimezoneModal(true)} />
      </div>

      {/* 3. DADOS E BACKUP */}
      <SectionHeader>Dados e Backup</SectionHeader>
      <div className="settings-card-group">
        <a className="settings-item" href="/api/reports/transactions.csv" target="_blank" rel="noreferrer">
          <div className="settings-squircle" style={{ backgroundColor: '#23382D', color: '#2ED573' }}><PhosphorIcon name="download-simple" size={20} /></div>
          <div className="flex-grow-1">
            <div className="fw-semibold text-white">Exportar Movimentos (CSV)</div>
            <div className="small" style={{ color: '#8C85AA' }}>Baixar arquivo de extrato de despesas e receitas</div>
          </div>
          <PhosphorIcon name="caret-right" size={16} style={{ color: '#2ED573' }} />
        </a>
        <div className="settings-divider" />
        <a className="settings-item" href="/api/reports/backup.json" target="_blank" rel="noreferrer">
          <div className="settings-squircle" style={{ backgroundColor: '#1A344A', color: '#00B2FE' }}><PhosphorIcon name="database" size={20} /></div>
          <div className="flex-grow-1">
            <div className="fw-semibold text-white">Backup Completo (JSON)</div>
            <div className="small" style={{ color: '#8C85AA' }}>Exportar todos os dados do casal para segurança</div>
          </div>
          <PhosphorIcon name="caret-right" size={16} style={{ color: '#00B2FE' }} />
        </a>
        <div className="settings-divider" />
        <a className="settings-item" onClick={(e) => { e.preventDefault(); setShowExportPdfModal(true); }} href="#">
          <div className="settings-squircle" style={{ backgroundColor: '#3B233D', color: '#FF4757' }}><PhosphorIcon name="file-pdf" size={20} /></div>
          <div className="flex-grow-1">
            <div className="fw-semibold text-white">Exportar Relatório (PDF)</div>
            <div className="small" style={{ color: '#8C85AA' }}>Relatório financeiro com extrato analítico e balanço</div>
          </div>
          <PhosphorIcon name="caret-right" size={16} style={{ color: '#FF4757' }} />
        </a>
      </div>

      {/* 4. PREFERÊNCIAS DO APP */}
      <SectionHeader>Preferências do App</SectionHeader>
      <div className="settings-card-group">
        <div className="settings-item" style={{ cursor: 'pointer' }} onClick={toggleNotifications}>
          <div className="settings-squircle" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}><PhosphorIcon name="bell" size={20} /></div>
          <div className="flex-grow-1">
            <div className="fw-semibold text-white">Notificações por atividade</div>
            <div className="small" style={{ color: '#8C85AA' }}>Receber alertas instantâneos de novas transações do parceiro</div>
          </div>
          <div className={`sweet-toggle-switch ${notifications ? 'on' : ''}`} />
        </div>
        <div className="settings-divider" />
        <div className="settings-item" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div className="d-flex align-items-center gap-3">
            <div className="settings-squircle" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}><PhosphorIcon name="palette" size={20} /></div>
            <div className="flex-grow-1">
              <div className="fw-semibold text-white">Aparência do App</div>
              <div className="small" style={{ color: '#8C85AA' }}>Alternar entre modo Claro, Escuro ou Automático</div>
            </div>
          </div>
          <div className="theme-pill-selector w-100">
            {[
              { v: 'light', label: 'Claro', icon: 'sun' },
              { v: 'dark', label: 'Escuro', icon: 'moon' },
              { v: 'auto', label: 'Sistema', icon: 'device-mobile' },
            ].map((t) => (
              <button
                key={t.v}
                className={`theme-pill-btn ${theme === t.v ? 'active' : ''}`}
                onClick={() => {
                  setTheme(t.v);
                  applyTheme(t.v);
                  showToast('Tema atualizado');
                }}
              >
                <PhosphorIcon name={t.icon} size={14} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. INFORMAÇÕES E SUPORTE */}
      <SectionHeader>Informações e Suporte</SectionHeader>
      <div className="settings-card-group">
        <SettingsItem icon="star" iconBg="#383120" iconColor="#E5B842" title="Escrever uma Avaliação" onClick={() => setInfoModal({ title: 'Escrever uma Avaliação', body: 'Sua opinião é muito importante! Avalie o BDD Soluções Financeiras na loja de aplicativos.' })} />
        <div className="settings-divider" />
        <SettingsItem icon="question" iconBg="#2D234D" iconColor="#9675FF" title="Suporte e Ajuda" onClick={() => setInfoModal({ title: 'Suporte ao Cliente', body: 'Dúvidas ou problemas? Entre em contato com nosso time pelo e-mail suporte@bddfinanceiro.com.br' })} />
      </div>

      {/* 6. LEGAL E TERMOS */}
      <SectionHeader>Legal e Termos</SectionHeader>
      <div className="settings-card-group">
        <SettingsItem icon="scales" iconBg="#2D234D" iconColor="#9675FF" title="Termos de Uso" onClick={() => setInfoModal({ title: 'Termos de Uso', body: 'O BDD Soluções Financeiras assegura a privacidade dos seus dados bancários e a segurança das suas informações financeiras compartilhadas.' })} />
        <div className="settings-divider" />
        <SettingsItem icon="shield-check" iconBg="#23382D" iconColor="#2ED573" title="Política de Privacidade" onClick={() => setInfoModal({ title: 'Política de Privacidade', body: 'Seus dados de despesas, rendas e faturas são encriptados e armazenados em infraestrutura segura com isolamento de tenant.' })} />
      </div>

      {/* 6.5 ADMINISTRAÇÃO (somente admins) */}
      {user?.role === 'Admin' && (
        <>
          <SectionHeader>Administração</SectionHeader>
          <div
            onClick={() => navigate('/admin/users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '18px 20px',
              borderRadius: 24,
              marginBottom: 24,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(229,184,66,0.18) 0%, rgba(150,117,255,0.12) 100%)',
              border: '1px solid rgba(229,184,66,0.4)',
              boxShadow: '0 4px 16px rgba(229,184,66,0.12)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #E5B842 0%, #B8860B 100%)',
                color: '#18122B',
                flexShrink: 0,
              }}
            >
              <PhosphorIcon name="shield-check" size={24} />
            </div>
            <div className="flex-grow-1">
              <div className="fw-bold text-white" style={{ fontSize: '1rem' }}>Painel Administrativo</div>
              <div className="small" style={{ color: '#C0B7E8' }}>Gerenciar usuários e assinaturas Pro</div>
            </div>
            <span className="badge rounded-pill px-3 py-1" style={{ background: '#E5B842', color: '#18122B', fontSize: '0.68rem', fontWeight: 700 }}>
              ADMIN
            </span>
          </div>
        </>
      )}

      {/* 7. CONTA E SESSÃO */}
      <SectionHeader>Conta e Sessão</SectionHeader>
      <div className="settings-card-group">
        <button className="settings-item" onClick={async () => { await logout(); navigate('/login'); }}>
          <div className="settings-squircle" style={{ backgroundColor: 'rgba(255,71,87,0.15)', color: '#FF4757' }}><PhosphorIcon name="sign-out" size={20} /></div>
          <div className="flex-grow-1"><div className="fw-semibold" style={{ color: '#FF4757' }}>Sair da Conta</div></div>
        </button>
      </div>

      <div className="text-center mt-4 mb-5">
        <div className="small mb-3" style={{ color: '#6B6282' }}>BDD Soluções Financeiras v1.2.0 (Build 2026)</div>
      </div>

      {/* Modais */}
      <Modal open={showCurrencyModal} title="Selecione a Moeda Padrão" onClose={() => setShowCurrencyModal(false)}>
        {[
          { v: 'R$', label: 'Real Brasileiro (R$)' },
          { v: '$', label: 'Dólar Americano ($)' },
          { v: '€', label: 'Euro (€)' },
        ].map((c) => (
          <div key={c.v} className="settings-item" style={{ cursor: 'pointer' }} onClick={() => setCurrency(c.v)}>
            <div className="flex-grow-1 fw-semibold text-white">{c.label}</div>
            {(profile?.defaultCurrency || 'R$') === c.v && <PhosphorIcon name="check" size={18} style={{ color: '#2ED573' }} />}
          </div>
        ))}
      </Modal>

      <Modal open={showTimezoneModal} title="Selecione o Fuso Horário" onClose={() => setShowTimezoneModal(false)}>
        {['America/Sao_Paulo', 'America/New_York', 'Europe/Lisbon', 'Europe/London'].map((tz) => (
          <div key={tz} className="settings-item" style={{ cursor: 'pointer' }} onClick={() => setTimezone(tz)}>
            <div className="flex-grow-1 fw-semibold text-white">{tz}</div>
            {(profile?.timezone || 'America/Sao_Paulo') === tz && <PhosphorIcon name="check" size={18} style={{ color: '#2ED573' }} />}
          </div>
        ))}
      </Modal>

      <Modal open={showLimitModal} title="Limite de Gastos Mensal" onClose={() => setShowLimitModal(false)}>
        <div className="mb-3 small" style={{ color: '#8C85AA' }}>Digite o valor do seu limite de gastos mensal geral.</div>
        <div className="form-group mb-3">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Valor do Limite (R$)</label>
          <input className="input" inputMode="decimal" value={limitValue} onChange={(e) => setLimitValue(e.target.value)} placeholder="Ex: 5000,00" />
        </div>
        <div className="d-flex gap-2 justify-content-end">
          <button className="btn btn-outline-secondary" onClick={() => setShowLimitModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={saveLimit}>Salvar</button>
        </div>
      </Modal>

      {/* Modal Editar Dados dos Membros do Casal */}
      <Modal open={showCoupleModal} title="Editar Dados dos Membros do Casal" onClose={() => setShowCoupleModal(false)}>
        {members.map((m, i) => (
          <div key={m.Id} className="card p-3 mb-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 18, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="fw-bold text-white mb-2" style={{ fontSize: '0.95rem' }}>Participante {i + 1}</div>
            <div className="mb-3">
              <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Nome Completo</label>
              <input className="input" value={m.Name || ''} onChange={(e) => updateMemberField(m.Id, 'Name', e.target.value)} />
            </div>
            <div>
              <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>E-mail</label>
              <input className="input" type="email" value={m.Email || ''} onChange={(e) => updateMemberField(m.Id, 'Email', e.target.value)} />
            </div>
          </div>
        ))}
        <div className="d-flex gap-2 justify-content-end">
          <button className="btn btn-outline-secondary" onClick={() => setShowCoupleModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={saveAllMembers}>Salvar</button>
        </div>
      </Modal>

      {/* Modal Editar Membro */}
      <Modal open={showSingleMemberModal} title="Editar Membro" onClose={() => setShowSingleMemberModal(false)}>
        {editingMember && (
          <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 18, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="mb-3">
              <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Nome Completo</label>
              <input className="input" value={memberEditState.name || ''} onChange={(e) => setMemberEditState({ ...memberEditState, name: e.target.value })} />
            </div>
            <div>
              <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>E-mail</label>
              <input className="input" type="email" value={memberEditState.email || ''} onChange={(e) => setMemberEditState({ ...memberEditState, email: e.target.value })} />
            </div>
          </div>
        )}
        <div className="d-flex gap-2 justify-content-end mt-3">
          <button className="btn btn-outline-secondary" onClick={() => setShowSingleMemberModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={saveSingleMember}>Salvar</button>
        </div>
      </Modal>

      {/* Modal Info */}
      <Modal open={Boolean(infoModal.title)} title={infoModal.title} onClose={() => setInfoModal({ title: '', body: '' })}>
        <p className="small mb-4" style={{ color: '#8C85AA', lineHeight: 1.5 }}>{infoModal.body}</p>
        <div className="text-end">
          <button className="btn rounded-pill px-4 text-white fw-bold" style={{ background: 'linear-gradient(135deg,#9675FF,#7E52FF)' }} onClick={() => setInfoModal({ title: '', body: '' })}>Entendi</button>
        </div>
      </Modal>

      {/* Modal Exportar PDF */}
      <Modal open={showExportPdfModal} title="Exportar Relatório em PDF" onClose={() => setShowExportPdfModal(false)}>
        <div className="small mb-3" style={{ color: '#8C85AA' }}>Escolha o mês de referência para o extrato analítico</div>
        <div className="p-3 mb-3 rounded-4 d-flex align-items-center" style={{ backgroundColor: '#161129', border: '1px solid rgba(255,255,255,0.06)' }}>
          <input type="checkbox" checked={exportAllMonths} onChange={(e) => setExportAllMonths(e.target.checked)} style={{ width: 44, height: 22, accentColor: '#9675FF' }} />
          <label className="text-white ms-2 fw-semibold small" style={{ cursor: 'pointer' }}>Exportar histórico completo (Todos os Tempos)</label>
        </div>
        {!exportAllMonths && (
          <div className="row g-2 mb-3">
            <div className="col-7">
              <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Mês de Referência</label>
              <select className="select" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)}>
                {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="col-5">
              <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Ano</label>
              <select className="select" value={exportYear} onChange={(e) => setExportYear(e.target.value)}>
                {[new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="d-flex gap-2 justify-content-end">
          <button className="btn btn-outline-secondary" onClick={() => setShowExportPdfModal(false)}>Cancelar</button>
          <button className="btn rounded-pill px-4 text-white fw-bold d-inline-flex align-items-center gap-2" style={{ background: 'linear-gradient(135deg,#FF4757,#FF6B81)' }} onClick={() => {
            const url = exportAllMonths ? '/api/reports/transactions.pdf?all=true' : `/api/reports/transactions.pdf?year=${exportYear}&month=${exportMonth}`;
            window.open(url, '_blank');
            setShowExportPdfModal(false);
          }}>
            <PhosphorIcon name="download-simple" size={16} /> Gerar PDF
          </button>
        </div>
      </Modal>
    </div>
  );
}