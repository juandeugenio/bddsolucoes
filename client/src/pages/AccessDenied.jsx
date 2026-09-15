import React from 'react';
import { useNavigate } from 'react-router-dom';
import PhosphorIcon from '../components/PhosphorIcon.jsx';

export default function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#120E24', padding: 20 }}>
      <div className="card p-4 border-0 text-center" style={{ backgroundColor: '#1D1735', borderRadius: 26, maxWidth: 380, width: '100%' }}>
        <div className="settings-squircle mx-auto mb-3" style={{ backgroundColor: 'rgba(255,71,87,0.15)', color: '#FF4757' }}>
          <PhosphorIcon name="shield-check" size={26} />
        </div>
        <h3 className="text-white fw-bold mb-2" style={{ fontSize: '1.2rem' }}>Acesso negado</h3>
        <p className="small mb-4" style={{ color: '#8C85AA' }}>
          Você não tem permissão para acessar esta página. Se acha que isso é um erro, entre em contato com o suporte.
        </p>
        <button className="btn btn-outline-secondary w-100" onClick={() => navigate('/dashboard')}>
          Voltar para o painel
        </button>
      </div>
    </div>
  );
}