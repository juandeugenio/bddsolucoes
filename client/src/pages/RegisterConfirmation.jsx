import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';

export default function RegisterConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [error, setError] = useState('');

  useEffect(() => {
    const email = searchParams.get('email');
    const token = searchParams.get('token');
    if (!email || !token) {
      // Sem parâmetros: tela genérica de "confirme seu e-mail"
      setStatus('loading');
      return;
    }
    (async () => {
      try {
        await api.get(`/auth/confirm-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
        setStatus('ok');
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    })();
  }, [searchParams]);

  const hasParams = Boolean(searchParams.get('email') && searchParams.get('token'));

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#120E24', padding: 20 }}>
      <div className="card p-4 border-0 text-center" style={{ backgroundColor: '#1D1735', borderRadius: 26, maxWidth: 380, width: '100%' }}>
        {status === 'loading' && !hasParams && (
          <>
            <div className="settings-squircle mx-auto mb-3" style={{ backgroundColor: '#2D234D', color: '#9675FF' }}>
              <PhosphorIcon name="envelope-simple" size={26} />
            </div>
            <h3 className="text-white fw-bold mb-2" style={{ fontSize: '1.2rem' }}>Confirme seu e-mail</h3>
            <p className="small mb-4" style={{ color: '#8C85AA' }}>
              Enviamos um link de confirmação para o seu e-mail. Verifique sua caixa de entrada (e o spam) para ativar sua conta.
            </p>
            <button className="btn btn-outline-secondary w-100" onClick={() => navigate('/login')}>Voltar para o login</button>
          </>
        )}
        {status === 'loading' && hasParams && (
          <div className="py-4"><div className="spinner-border mx-auto d-block" /></div>
        )}
        {status === 'ok' && (
          <>
            <div className="settings-squircle mx-auto mb-3" style={{ backgroundColor: '#23382D', color: '#2ED573' }}>
              <PhosphorIcon name="check" size={26} />
            </div>
            <h3 className="text-white fw-bold mb-2" style={{ fontSize: '1.2rem' }}>E-mail confirmado!</h3>
            <p className="small mb-4" style={{ color: '#8C85AA' }}>Sua conta está ativa. Agora você pode fazer login.</p>
            <button className="btn btn-primary w-100" onClick={() => navigate('/login')}>Ir para o login</button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="settings-squircle mx-auto mb-3" style={{ backgroundColor: 'rgba(255,71,87,0.15)', color: '#FF4757' }}>
              <PhosphorIcon name="warning-circle" size={26} />
            </div>
            <h3 className="text-white fw-bold mb-2" style={{ fontSize: '1.2rem' }}>Não foi possível confirmar</h3>
            <p className="small mb-4" style={{ color: '#FF9F94' }}>{error}</p>
            <button className="btn btn-outline-secondary w-100" onClick={() => navigate('/login')}>Voltar para o login</button>
          </>
        )}
      </div>
    </div>
  );
}