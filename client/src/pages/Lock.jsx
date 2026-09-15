import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';

export default function Lock() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings/pin/verify', { pin });
      localStorage.setItem('bdd.unlocked', '1');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#120E24', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="text-center mb-4">
          <img src="/images/icon.svg" alt="BDD" style={{ width: 64, height: 64, borderRadius: 16 }} />
          <h1 className="fw-bold text-white mt-3" style={{ fontSize: '1.4rem' }}>Desbloquear</h1>
          <p style={{ color: '#8C85AA', fontSize: '0.9rem' }}>Digite seu PIN para continuar</p>
        </div>

        <div className="card p-4 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 26 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <input
                className="input"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoFocus
                style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.5em', padding: '14px' }}
              />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <button
              className="btn w-100 py-3 text-white fw-bold border-0"
              style={{ background: 'linear-gradient(135deg,#9675FF 0%,#7E52FF 100%)', borderRadius: 18 }}
            >
              <PhosphorIcon name="lock" size={16} /> Desbloquear
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}