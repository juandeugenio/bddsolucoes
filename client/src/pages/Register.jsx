import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import PhosphorIcon from '../components/PhosphorIcon.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name || email.split('@')[0], email, password);
      navigate('/dashboard');
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
          <h1 className="fw-bold text-white mt-3" style={{ fontSize: '1.4rem' }}>Criar conta</h1>
          <p style={{ color: '#8C85AA', fontSize: '0.9rem' }}>Comece a organizar suas finanças</p>
        </div>

        <div className="card p-4 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 26 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Nome</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="form-group mb-3">
              <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>E-mail</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="seu@email.com" />
            </div>
            <div className="form-group mb-3">
              <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Senha</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <button className="btn w-100 py-3 text-white fw-bold border-0" style={{ background: 'linear-gradient(135deg,#9675FF 0%,#7E52FF 100%)', borderRadius: 18 }} disabled={loading}>
              <PhosphorIcon name="user-plus" size={16} /> {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
          <div className="text-center mt-3 small" style={{ color: '#8C85AA' }}>
            Já tem conta? <Link to="/login" style={{ color: '#9675FF' }}>Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}