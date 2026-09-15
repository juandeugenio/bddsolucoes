import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function TransactionsImport() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const onFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const text = await file.text();
      const resp = await api.post('/transactions/import/preview', { content: text });
      setRows(resp.rows || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const doImport = async () => {
    setLoading(true);
    try {
      const resp = await api.post('/transactions/import', { content: rows });
      setResult(resp);
      setRows(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRows(null);
    setResult(null);
    setError('');
  };

  return (
    <div>
      <Link to="/transactions" className="text-decoration-none" style={{ color: '#9675FF' }}>← Transações</Link>
      <h2 className="fw-bold text-white mb-3" style={{ fontSize: '1.4rem' }}>Importar CSV</h2>
      <p className="text-muted">
        Formato esperado (cabeçalho opcional, separador <code>;</code>):{' '}
        <code>Data;Descrição;Categoria;Conta;Tipo;Valor;Moeda</code>. Valor negativo = despesa. Tipos aceitos: Despesa, Receita, Transferência.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}

      {!rows && !result && (
        <div className="card p-4 border-0" style={{ backgroundColor: '#161129', borderRadius: 20 }}>
          <label className="btn btn-outline-secondary w-100 py-3" style={{ cursor: 'pointer', textAlign: 'center' }}>
            {loading ? 'Lendo arquivo...' : '📁 Selecionar arquivo CSV'}
            <input type="file" accept=".csv,text/csv" onChange={onFileSelected} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {rows && (
        <>
          <div className="alert alert-info">
            {rows.length} linha(s) válida(s) lida(s)
          </div>
          <div className="card p-3 border-0" style={{ backgroundColor: '#161129', borderRadius: 20, overflow: 'hidden' }}>
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th>Tipo</th><th>Valor</th><th>Moeda</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    <td className="text-white">{r.date ? new Date(r.date).toLocaleDateString('pt-BR') : ''}</td>
                    <td className="text-white">{r.description}</td>
                    <td className="text-white">{r.category}</td>
                    <td className="text-white">{r.wallet}</td>
                    <td className="text-white">{r.type}</td>
                    <td className="text-white">{r.value}</td>
                    <td className="text-white">{r.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && <p className="text-muted small">Exibindo as 100 primeiras linhas.</p>}
          </div>
          <div className="d-flex gap-2 mb-3 mt-3">
            <button className="btn btn-primary" onClick={doImport} disabled={rows.length === 0 || loading}>
              Importar {rows.length} transação(ões)
            </button>
            <button className="btn btn-outline-secondary" onClick={reset}>Cancelar</button>
          </div>
        </>
      )}

      {result && (
        <>
          <div className="alert alert-success">
            Importação concluída: <strong>{result.created}</strong> criada(s), <strong>{result.skipped}</strong> ignorada(s).
          </div>
          <Link to="/transactions" className="btn btn-outline-primary">Ver transações</Link>
        </>
      )}
    </div>
  );
}