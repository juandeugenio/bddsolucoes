import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatDate } from '../format.js';

export default function SettingsRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/exchange');
      setRates(result);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exchange', { fromCurrency: from, toCurrency: to, rate: Number(rate), date });
      setRate('');
      showToast('Taxa adicionada');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.del(`/exchange/${id}`);
      showToast('Taxa removida');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <a href="/settings" className="small" style={{ color: '#9675FF' }}>← Configurações</a>
      <h2 className="fw-bold text-white mb-3" style={{ fontSize: '1.4rem' }}>Taxas de câmbio</h2>

      <form onSubmit={add} className="card p-4 border-0 mb-4" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
        <div className="row g-2">
          <div className="col-3">
            <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>De</label>
            <input className="input" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="USD" maxLength={3} />
          </div>
          <div className="col-3">
            <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Para</label>
            <input className="input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="EUR" maxLength={3} />
          </div>
          <div className="col-3">
            <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Taxa</label>
            <input className="input" type="number" step="0.00000001" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div className="col-3">
            <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Data</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {error && <div className="alert alert-danger mt-2">{error}</div>}
        <button className="btn btn-success w-100 mt-3">Adicionar</button>
      </form>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
          <table className="table table-sm align-middle">
            <thead>
              <tr><th>De</th><th>Para</th><th>Taxa</th><th>Data</th><th></th></tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.Id}>
                  <td className="text-white">{r.FromCurrency}</td>
                  <td className="text-white">{r.ToCurrency}</td>
                  <td className="text-white">{Number(r.Rate).toFixed(8).replace(/0+$/, '')}</td>
                  <td className="text-white">{formatDate(r.Date)}</td>
                  <td><button className="btn btn-outline-secondary btn-sm" style={{ color: '#FF5C4D' }} onClick={() => remove(r.Id)}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rates.length === 0 && (
            <div className="text-center py-4" style={{ color: '#8C85AA' }}>
              Nenhuma taxa cadastrada. Adicione taxas para habilitar a conversão entre moedas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}