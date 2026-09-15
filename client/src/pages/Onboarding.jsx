import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  {
    title: 'Bem-vindo ao BDD Soluções Financeiras',
    body: 'Acompanhe entradas, despesas e saldo em um só lugar, com gráficos claros e categorias simples.',
  },
  {
    title: 'Suas finanças sob controle',
    body: 'Defina contas, limites por categoria e visualize seu resumo mensal para gastar com consciência.',
  },
  {
    title: 'Rápido, seguro e privado',
    body: 'Seus dados são seus: trava por PIN, biometria e planos flexíveis, grátis ou Pro.',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const finish = () => {
    localStorage.setItem('bdd.onboarding.done', '1');
    navigate('/login');
  };

  const s = STEPS[step];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#130F24', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#1D1735', borderRadius: 32, padding: 28, textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
        <div className="text-end mb-2">
          <button className="btn btn-link small" style={{ color: '#8C85AA', background: 'none', border: 'none', cursor: 'pointer' }} onClick={finish}>
            Pular
          </button>
        </div>

        <div className="text-center mb-4">
          {step === 0 && (
            <img src="/images/logo.svg" alt="BDD Soluções Financeiras" style={{ width: 120, height: 120 }} />
          )}
          {step === 1 && (
            <svg viewBox="0 0 240 180" style={{ width: 220 }} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="52" y="40" width="136" height="100" rx="12" fill="#EEF3FF" stroke="#5B8DEF" strokeWidth="6" />
              <line x1="52" y1="64" x2="188" y2="64" stroke="#5B8DEF" strokeWidth="6" strokeLinecap="round" />
              <rect x="70" y="88" width="30" height="34" rx="6" fill="#22C55E" />
              <rect x="116" y="76" width="52" height="46" rx="6" fill="#EF4444" />
              <circle cx="200" cy="120" r="16" fill="#A855F7" />
            </svg>
          )}
          {step === 2 && (
            <svg viewBox="0 0 240 180" style={{ width: 220 }} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="120" cy="96" r="62" fill="none" stroke="#5B8DEF" strokeWidth="8" />
              <path d="M120 66 v30 l22 14" fill="none" stroke="#A855F7" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M150 118 l70 34" stroke="#3B82F6" strokeWidth="8" strokeLinecap="round" />
              <circle cx="120" cy="34" r="12" fill="#22C55E" />
            </svg>
          )}
        </div>

        <h2 className="fw-bold text-white mb-2" style={{ fontSize: '1.3rem' }}>{s.title}</h2>
        <p style={{ color: '#8C85AA', fontSize: '0.92rem' }}>{s.body}</p>

        <div className="d-flex justify-content-center gap-2 mb-4">
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: i === step ? '#9675FF' : '#2D234D' }} />
          ))}
        </div>

        <button
          className="btn w-100 py-3 text-white fw-bold border-0"
          style={{ background: 'linear-gradient(135deg,#9675FF 0%,#7E52FF 100%)', borderRadius: 18, fontSize: '1.05rem' }}
          onClick={() => (step < 2 ? setStep(step + 1) : finish())}
        >
          {step < 2 ? 'Continuar' : 'Começar'}
        </button>
      </div>
    </div>
  );
}