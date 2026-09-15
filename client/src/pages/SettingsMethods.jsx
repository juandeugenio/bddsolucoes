import React, { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import PhosphorIcon from '../components/PhosphorIcon.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';

const SYSTEM_DEFAULTS = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Débito em conta'];

export default function SettingsMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [infoMessage, setInfoMessage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/payment-methods');
      const custom = (result.methods || []).map((m) => ({ Id: m.Id, Name: m.Name, IsCustom: true }));
      // Fixos sempre presentes; custom não duplicam os fixos.
      const fixed = SYSTEM_DEFAULTS
        .filter((name) => !custom.some((c) => c.Name.toLowerCase() === name.toLowerCase()))
        .map((name) => ({ Id: null, Name: name, IsCustom: false }));
      setMethods([...fixed, ...custom]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setNewName('');
    setShowAddModal(true);
  };

  const saveNew = async () => {
    if (!newName.trim()) { setInfoMessage('Por favor, digite um nome para o método.'); return; }
    try {
      await api.post('/payment-methods', { name: newName.trim() });
      setInfoMessage(`Método '${newName.trim()}' criado com sucesso!`);
      setShowAddModal(false);
      load();
    } catch (err) {
      setInfoMessage(err.message);
    }
  };

  const deleteMethod = async (item) => {
    if (!item.Id) return;
    if (!confirm(`Excluir o método '${item.Name}'?`)) return;
    try {
      await api.del(`/payment-methods/${item.Id}`);
      setInfoMessage(`Método '${item.Name}' removido com sucesso!`);
      load();
    } catch (err) {
      setInfoMessage(err.message);
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <a href="/settings" className="btn btn-link text-white text-decoration-none fs-4 p-0 opacity-75" style={{ background: 'none', border: 'none' }}>&lt;</a>
        <h4 className="mb-0 text-white fw-bold" style={{ fontSize: '1.2rem', letterSpacing: '-0.2px' }}>Métodos de pagamento</h4>
        <button className="btn btn-link text-decoration-none fs-3 p-0" style={{ color: '#9675FF', background: 'none', border: 'none' }} onClick={openAdd} title="Adicionar método">+</button>
      </div>

      {infoMessage && (
        <div className="alert alert-info rounded-4 mb-3 small d-flex justify-content-between align-items-center">
          <span>{infoMessage}</span>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setInfoMessage(null)}>✕</button>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="small" style={{ color: '#8C85AA' }}>Pix, Cartão de crédito, Cartão de débito e Débito em conta são fixos.</div>
        <button className="btn btn-sm rounded-pill px-3 py-1 fw-semibold" style={{ backgroundColor: 'rgba(150,117,255,0.15)', color: '#9675FF', border: 'none', fontSize: '0.78rem' }} onClick={openAdd}>
          + Nova modalidade
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <div className="settings-card-group">
          {methods.map((item, idx) => (
            <div key={item.Id || item.Name}>
              {idx > 0 && <div className="settings-divider" />}
              <div className="settings-item justify-content-between align-items-center p-3">
                <div className="d-flex align-items-center gap-3 flex-grow-1">
                  <div className="settings-squircle" style={{ backgroundColor: item.IsCustom ? 'rgba(150,117,255,0.15)' : 'rgba(255,255,255,0.06)', color: item.IsCustom ? '#9675FF' : '#8C85AA' }}>
                    <PhosphorIcon name={item.IsCustom ? 'tag' : 'check'} size={20} />
                  </div>
                  <div>
                    <span className="fw-bold text-white">{item.Name}</span>
                    {item.IsCustom ? (
                      <div className="small" style={{ color: '#9675FF', fontSize: '0.75rem' }}>Personalizado</div>
                    ) : (
                      <div className="small" style={{ color: '#6F688F', fontSize: '0.75rem' }}>Padrão</div>
                    )}
                  </div>
                </div>
                {item.IsCustom && (
                  <button className="btn btn-sm p-1 border-0" style={{ color: '#FF5C4D', background: 'none' }} title="Excluir método" onClick={() => deleteMethod(item)}>
                    <PhosphorIcon name="trash" size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAddModal} title="Nova Modalidade de Pagamento" onClose={() => setShowAddModal(false)}>
        <div className="mb-3">
          <label className="small fw-semibold mb-1 d-block" style={{ color: '#8C85AA' }}>Nome da Modalidade</label>
          <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Vale Alimentação, Boleto, Cheque..." autoFocus />
        </div>
        {infoMessage && <div className="alert alert-danger small">{infoMessage}</div>}
        <div className="d-flex gap-2 justify-content-end">
          <button className="btn rounded-pill px-4 text-white" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} onClick={() => setShowAddModal(false)}>Cancelar</button>
          <button className="btn rounded-pill px-4 text-white fw-bold" style={{ background: 'linear-gradient(135deg,#9675FF,#7E52FF)' }} onClick={saveNew}>Criar Modalidade</button>
        </div>
      </Modal>
    </div>
  );
}