import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [state, setState] = useState('loading'); // loading | error | ok
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await api.post('/tenants/invite/accept', { token });
        setState('ok');
      } catch (err) {
        setState('error');
        setError(err.message);
      }
    })();
  }, [token]);

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#120E24', padding: 20 }}>
      <div className="card p-4 border-0 text-center" style={{ backgroundColor: '#1D1735', borderRadius: 26, maxWidth: 380, width: '100%' }}>
        <img src="/images/icon.svg" alt="BDD" style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px', display: 'block' }} />
        {state === 'loading' && (
          <>
            <div className="spinner-border mx-auto mb-3" />
            <div className="text-white fw-semibold">Aceitando convite...</div>
          </>
        )}
        {state === 'ok' && (
          <>
            <div className="settings-squircle mx-auto mb-3" style={{ backgroundColor: '#23382D', color: '#2ED573' }}>
              <PhosphorIcon name="check" size={24} />
            </div>
            <h3 className="text-white fw-bold mb-2" style={{ fontSize: '1.2rem' }}>Convite aceito!</h3>
            <p className="small mb-4" style={{ color: '#8C85AA' }}>
              Você agora faz parte do espaço compartilhado. Vamos levar você para o painel.
            </p>
            <button className="btn btn-primary w-100" onClick={() => navigate('/dashboard')}>
              Ir para o painel
            </button>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="settings-squircle mx-auto mb-3" style={{ backgroundColor: 'rgba(255,71,87,0.15)', color: '#FF4757' }}>
              <PhosphorIcon name="warning-circle" size={24} />
            </div>
            <h3 className="text-white fw-bold mb-2" style={{ fontSize: '1.2rem' }}>Não foi possível aceitar</h3>
            <p className="small mb-4" style={{ color: '#FF9F94' }}>{error}</p>
            <button className="btn btn-outline-secondary w-100" onClick={() => navigate('/dashboard')}>
              Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
}