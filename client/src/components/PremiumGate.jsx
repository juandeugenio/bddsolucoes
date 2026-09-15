import React, { useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import PhosphorIcon from './PhosphorIcon.jsx';
import Modal from './Modal.jsx';

export default function PremiumGate({ children }) {
  const { user } = useAuth();
  const isPro = user?.plan === 1;
  const [showModal, setShowModal] = useState(false);

  if (isPro) return children;

  return (
    <div>
      <div className="premium-gate-card">
        <span className="premium-badge-glow">
          <PhosphorIcon name="crown" size={14} /> RECURSO EXCLUSIVO PRO
        </span>
        <h4 className="premium-title">Ative o Plano Pro</h4>
        <p className="premium-desc">
          Este recurso é exclusivo para assinantes do Plano Pro. Assine por apenas R$ 60,00/ano para o casal (ambos utilizam sem custo adicional!).
        </p>
        <div className="premium-features-grid">
          <div className="premium-feature-item"><strong>R$ 60,00 / ano</strong> para o casal (ambos acessam)</div>
          <div className="premium-feature-item">Faturas detalhadas estilo App de Banco (Nubank)</div>
          <div className="premium-feature-item">Exportação ilimitada em PDF e CSV</div>
          <div className="premium-feature-item">Gráficos por categoria e histórico completo</div>
        </div>
        <button className="btn-gradient-pro" onClick={() => setShowModal(true)}>
          <PhosphorIcon name="lightning" size={16} /> Assinar Plano Pro — R$ 60,00/ano
        </button>
      </div>

      <Modal open={showModal} title="Assinatura Plano Pro" onClose={() => setShowModal(false)}>
        <UpgradeModalBody user={user} />
      </Modal>
    </div>
  );
}

function UpgradeModalBody({ user }) {
  const [copied, setCopied] = useState('');
  const [pix, setPix] = useState({ email: '', copiaECola: '' });

  React.useEffect(() => {
    api.get('/settings/pix').then(setPix).catch(() => {});
  }, []);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-3">
        <div className="settings-squircle" style={{ backgroundColor: '#2D234D', color: '#E5B842' }}>
          <PhosphorIcon name="crown" size={22} />
        </div>
        <div>
          <div className="fw-bold text-white">Assinatura Plano Pro</div>
          <div className="small" style={{ color: '#8C85AA' }}>R$ 60,00 / ano para o casal</div>
        </div>
      </div>

      {copied && <div className="alert alert-success">Código copiado!</div>}

      <div className="d-flex align-items-center justify-content-center mb-3">
        <div style={{ border: '4px solid #9675FF', borderRadius: 12, padding: 10, backgroundColor: '#fff' }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pix.copiaECola || '')}`}
            alt="QR Code PIX"
            width={180}
            height={180}
            style={{ display: 'block' }}
          />
        </div>
      </div>
      <div className="text-center small mb-1" style={{ color: '#8C85AA' }}>Escaneie pelo aplicativo do seu banco</div>
      <div className="text-center mb-3">
        <span className="badge rounded-pill" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}>Valor: R$ 60,00</span>
      </div>

      <div className="mb-2">
        <div className="small fw-semibold mb-1" style={{ color: '#8C85AA' }}>Chave PIX (E-mail):</div>
        <div className="d-flex align-items-center gap-2">
          <span className="text-white" style={{ fontSize: '0.9rem' }}>{pix.email || '—'}</span>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => copy(pix.email, 'chave')}>Copiar Chave</button>
        </div>
      </div>
      <div className="mb-3">
        <div className="small fw-semibold mb-1" style={{ color: '#8C85AA' }}>PIX Copia e Cola (Pré-preenchido R$ 60,00):</div>
        <div className="d-flex align-items-center gap-2">
          <input className="input" readOnly value={pix.copiaECola || ''} style={{ fontSize: '0.75rem' }} />
          <button className="btn btn-primary btn-sm flex-shrink-0" onClick={() => copy(pix.copiaECola, 'codigo')}>Copiar</button>
        </div>
      </div>

      <div className="p-3 mb-3" style={{ borderLeft: '3px solid #9675FF', backgroundColor: 'rgba(150,117,255,0.08)', borderRadius: 12 }}>
        <div className="small" style={{ color: '#C0B7E8' }}>
          <strong>Conta a ser ativada:</strong> {user?.email}<br />
          Após realizar o PIX de R$ 60,00, a equipe ativará o plano Pro para a sua conta e o seu cônjuge terá acesso imediato sem custos extras.
        </div>
      </div>

      <div className="text-center small" style={{ color: '#8C85AA' }}>
        Dúvidas? Envie o comprovante para {pix.email || 'suporte@bddfinanceiro.com.br'}
      </div>
    </div>
  );
}