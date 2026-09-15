import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatDate } from '../format.js';

export default function Share() {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [controlMode, setControlMode] = useState(0);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const [m, i, mode] = await Promise.all([
        api.get('/tenants/members'),
        api.get('/tenants/invites'),
        api.get('/tenants/control-mode'),
      ]);
      setMembers(m);
      setInvites(i);
      setControlMode(mode.controlMode);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/tenants/invites', { email });
      setEmail('');
      setSuccess('Convite criado! Copie o link abaixo e envie para a pessoa.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('Revogar este convite? O link deixará de funcionar.')) return;
    try {
      await api.post(`/tenants/invites/${id}/revoke`);
      showToast('Convite revogado');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <h2 className="fw-bold text-white mb-1" style={{ fontSize: '1.4rem' }}>Compartilhar</h2>
      <p className="text-muted mb-4">Compartilhe suas finanças com outras pessoas (ex.: casal).</p>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row g-3">
        <div className="col-lg-5">
          {/* Participantes */}
          <div className="card p-3 border-0 mb-3" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
            <h6 className="fw-bold text-white mb-2">Participantes</h6>
            <div className="d-flex flex-column">
              {members.map((m) => (
                <div key={m.Id} className="d-flex justify-content-between align-items-center py-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span className="text-white">{m.Email}</span>
                  <div>
                    {m.Role === 0 && <span className="badge rounded-pill me-2" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}>dono</span>}
                    <span className="small" style={{ color: '#8C85AA' }}>entrou em {formatDate(m.JoinedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Forma de controle */}
          <div className="card p-3 border-0 mb-3" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
            <h6 className="fw-bold text-white mb-2">Forma de controle</h6>
            <div className="d-flex flex-column gap-2 mb-3">
              <label className="d-flex align-items-start gap-2 p-3" style={{ border: `1px solid ${controlMode === 0 ? '#9675FF' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, cursor: 'pointer', backgroundColor: controlMode === 0 ? 'rgba(150,117,255,0.08)' : 'transparent' }}>
                <input type="radio" checked={controlMode === 0} onChange={() => setControlModeLocal(0, load)} style={{ accentColor: '#9675FF', marginTop: 2 }} />
                <div>
                  <div className="fw-semibold text-white">Divisão</div>
                  <div className="small" style={{ color: '#8C85AA' }}>Cada um tem seu dinheiro; despesas do casal são divididas entre vocês.</div>
                </div>
              </label>
              <label className="d-flex align-items-start gap-2 p-3" style={{ border: `1px solid ${controlMode === 1 ? '#00B2FE' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, cursor: 'pointer', backgroundColor: controlMode === 1 ? 'rgba(0,178,254,0.08)' : 'transparent' }}>
                <input type="radio" checked={controlMode === 1} onChange={() => setControlModeLocal(1, load)} style={{ accentColor: '#00B2FE', marginTop: 2 }} />
                <div>
                  <div className="fw-semibold text-white">Conjunta</div>
                  <div className="small" style={{ color: '#8C85AA' }}>Tudo junto: um caixa único para o casal, sem divisão ou acertos.</div>
                </div>
              </label>
            </div>

            <h6 className="fw-bold text-white mb-2">Convites</h6>
            <form onSubmit={invite} className="d-flex gap-2 mb-2">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail da pessoa" />
              <button className="btn btn-primary flex-shrink-0"><PhosphorIcon name="plus" size={16} /></button>
            </form>
            {invites.length === 0 ? (
              <div className="small" style={{ color: '#8C85AA' }}>Nenhum convite pendente.</div>
            ) : (
              <div className="d-flex flex-column">
                {invites.map((i) => (
                  <div key={i.Id} className="d-flex align-items-center justify-content-between py-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div>
                      <div className="text-white small">{i.Email}</div>
                      <div className="small" style={{ color: '#8C85AA' }}>expira {formatDate(i.ExpiresAt)}</div>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/invite/${i.Token}`).then(() => showToast('Link copiado'));
                      }}>Copiar link</button>
                      <button className="btn btn-outline-secondary btn-sm" style={{ color: '#FF5C4D' }} onClick={() => revoke(i.Id)}>Revogar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Como funciona */}
        <div className="col-lg-7">
          <div className="card p-4 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
            <h6 className="fw-bold text-white mb-3">Como funciona</h6>
            <ol className="mb-0" style={{ color: '#C0B7E8', fontSize: '0.9rem', paddingLeft: 20, lineHeight: 1.9 }}>
              <li>Digite o e-mail da pessoa e clique em Convidar.</li>
              <li>Copie o link do convite e envie para ela (o envio automático por e-mail será habilitado quando configurar o SMTP).</li>
              <li>Ao aceitar, a pessoa passa a ver e editar os mesmos dados: contas, categorias, transações e limites.</li>
              <li>A forma de controle escolhida define o resumo do casal: Divisão (cada um com seu dinheiro e acertos) ou Conjunta (tudo junto, sem divisão).</li>
              <li>Para alternar entre espaços (se participa de mais de um), use o seletor no menu.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

async function setControlModeLocal(mode, load) {
  await api.post('/tenants/control-mode', { controlMode: mode });
  load();
}