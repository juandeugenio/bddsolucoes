import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!tokenParam) {
      setError('Link de redefinição inválido.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, token: tokenParam, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#120E24', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="text-center mb-4">
          <img src="/images/icon.svg" alt="BDD" style={{ width: 64, height: 64, borderRadius: 16 }} />
          <h1 className="fw-bold text-white mt-3" style={{ fontSize: '1.4rem' }}>Definir nova senha</h1>
          <p style={{ color: '#8C85AA', fontSize: '0.9rem' }}>Escolha uma nova senha para sua conta</p>
        </div>

        <div className="card p-4 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 26 }}>
          {done ? (
            <>
              <div className="settings-squircle mx-auto mb-3" style={{ backgroundColor: '#23382D', color: '#2ED573' }}>
                <PhosphorIcon name="check" size={24} />
              </div>
              <h3 className="text-white fw-bold mb-2 text-center" style={{ fontSize: '1.1rem' }}>Senha redefinida!</h3>
              <p className="small mb-4 text-center" style={{ color: '#8C85AA' }}>Sua senha foi alterada com sucesso. Faça login com a nova senha.</p>
              <button className="btn w-100 py-3 text-white fw-bold border-0" style={{ background: 'linear-gradient(135deg,#9675FF 0%,#7E52FF 100%)', borderRadius: 18 }} onClick={() => navigate('/login')}>
                Ir para o login
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group mb-3">
                <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>E-mail</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="seu@email.com" />
              </div>
              <div className="form-group mb-3">
                <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Nova senha</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="form-group mb-3">
                <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Confirmar nova senha</label>
                <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} placeholder="Repita a senha" />
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <button className="btn w-100 py-3 text-white fw-bold border-0" style={{ background: 'linear-gradient(135deg,#9675FF 0%,#7E52FF 100%)', borderRadius: 18 }} disabled={loading}>
                <PhosphorIcon name="key" size={16} /> {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
              <div className="text-center mt-3 small" style={{ color: '#8C85AA' }}>
                <Link to="/login" style={{ color: '#9675FF' }}>Voltar para o login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}