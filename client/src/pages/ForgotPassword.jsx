import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
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
          <h1 className="fw-bold text-white mt-3" style={{ fontSize: '1.4rem' }}>Redefinir senha</h1>
          <p style={{ color: '#8C85AA', fontSize: '0.9rem' }}>Digite seu e-mail para receber o link</p>
        </div>

        <div className="card p-4 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 26 }}>
          {submitted ? (
            <>
              <div className="settings-squircle mx-auto mb-3" style={{ backgroundColor: '#23382D', color: '#2ED573' }}>
                <PhosphorIcon name="check" size={24} />
              </div>
              <h3 className="text-white fw-bold mb-2 text-center" style={{ fontSize: '1.1rem' }}>Verifique seu e-mail</h3>
              <p className="small mb-4 text-center" style={{ color: '#8C85AA' }}>
                Se existir uma conta com este e-mail, enviaremos um link para redefinir sua senha. Verifique também a caixa de spam.
              </p>
              <Link to="/login" className="btn btn-outline-secondary w-100 text-center">Voltar para o login</Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group mb-3">
                <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>E-mail</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="seu@email.com" />
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <button className="btn w-100 py-3 text-white fw-bold border-0" style={{ background: 'linear-gradient(135deg,#9675FF 0%,#7E52FF 100%)', borderRadius: 18 }} disabled={loading}>
                <PhosphorIcon name="paper-plane-tilt" size={16} /> {loading ? 'Enviando...' : 'Enviar link de redefinição'}
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