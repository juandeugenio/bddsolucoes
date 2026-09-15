import React, { useState, useEffect } from 'react';
import api from '../api.js';
import PhosphorIcon from './PhosphorIcon.jsx';
import TecladoNumerico from './TecladoNumerico.jsx';
import { useToast } from './Toast.jsx';
import { money } from './Money.jsx';

const freqOptions = [
  { value: 2, label: 'Todo mês' },
  { value: 0, label: 'Uma vez' },
  { value: 1, label: 'Toda semana' },
  { value: 3, label: 'Todo ano' },
];

// Métodos fixos do sistema (rótulos exibidos; o backend cria/busca carteira por nome).
const DEFAULT_METHODS = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Débito em conta'];

function methodToWalletKind(method) {
  if (method === 'Cartão de crédito') return 0;
  if (method === 'Cartão de débito') return 0;
  if (method === 'Débito em conta') return 2;
  return 4; // Pix / customizados
}

function walletKindToMethod(kind) {
  switch (kind) {
    case 0: return 'Cartão de crédito';
    case 1: return 'Dinheiro';
    case 2: return 'Débito em conta';
    case 4: return 'Pix';
    default: return 'Pix';
  }
}

export default function FormDespesa({ tx, wallets, categories, cards, members, defaultDate, onClose, onSaved }) {
  const isEdit = Boolean(tx?.Id);
  const { showToast } = useToast();

  const [kind, setKind] = useState(tx?.Kind ?? 1);
  const [rawAmount, setRawAmount] = useState(tx ? String(tx.Amount).replace('.', ',') : '');
  const [showKeypad, setShowKeypad] = useState(false);
  const [payerMemberId, setPayerMemberId] = useState(tx?.PayerMemberId || '');
  const [categoryId, setCategoryId] = useState(tx?.CategoryId || '');
  const [method, setMethod] = useState(() => {
    // Edição: usa o método gravado na transação (PaymentMethodName).
    if (tx?.PaymentMethodName) return tx.PaymentMethodName;
    return 'Pix';
  });
  const [cardId, setCardId] = useState(tx?.CardId || '');
  const [installments, setInstallments] = useState(1);
  const [date, setDate] = useState(defaultDate ? new Date(defaultDate) : new Date());
  const [isPaid, setIsPaid] = useState(tx?.IsPaid ?? true);
  const [paidDate, setPaidDate] = useState(tx?.PaidDate || new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState(tx?.Obs || '');
  const [note, setNote] = useState(tx?.Note || '');
  const [frequency, setFrequency] = useState(2);
  const [duration, setDuration] = useState('0');
  const [customMonths, setCustomMonths] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [customMethods, setCustomMethods] = useState([]);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');

  useEffect(() => {
    api.get('/payment-methods')
      .then((r) => setCustomMethods((r.methods || []).map((m) => m.Name)))
      .catch(() => {});
  }, []);

  const amount = parseFloat(rawAmount.replace(',', '.')) || 0;
  const methodKind = methodToWalletKind(method);
  // Cartão de crédito abre o campo CARTÃO e parcelamento; débito não.
  const isCardMethod = method === 'Cartão de crédito' || Boolean(cardId);
  const cardNameForMethod = (cards.find((c) => c.Id === cardId)?.Name) || (cards.length > 0 ? cards[0].Name : 'Cartão de Crédito');

  // Métodos exibidos: os 4 fixos + os criados pelo usuário.
  const methodItems = [...DEFAULT_METHODS, ...customMethods.filter((n) => !DEFAULT_METHODS.includes(n))];

  const addCustomMethod = async () => {
    const name = newMethodName.trim();
    if (!name) return;
    try {
      await api.post('/payment-methods', { name });
      setCustomMethods((prev) => [...prev, name]);
      setMethod(name);
      setNewMethodName('');
      setShowAddMethod(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const removeCustomMethod = async (name) => {
    try {
      const list = await api.get('/payment-methods');
      const target = (list.methods || []).find((m) => m.Name === name);
      if (target) await api.del(`/payment-methods/${target.Id}`);
      setCustomMethods((prev) => prev.filter((n) => n !== name));
      if (method === name) setMethod('Pix');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const prevDate = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
  };
  const nextDate = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d);
  };

  const dateLabel = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      setError('Informe um valor válido.');
      setShowKeypad(true);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        amount,
        kind,
        note: note || null,
        categoryId: categoryId || null,
        payerMemberId: payerMemberId || null,
        method: method,
        methodKind: methodToWalletKind(method),
        paymentMethodName: method,
        cardName: isCardMethod ? (cards.find((c) => c.Id === cardId)?.Name || cardNameForMethod) : null,
        date: date.toISOString(),
        isPaid,
        paidDate: isPaid ? paidDate : null,
        obs: isPaid ? obs : null,
        installments: isCardMethod && installments > 1 ? installments : 1,
        isRecurring: frequency !== 1 && !isEdit,
        frequency: frequency === 1 ? 2 : frequency,
        startDate: date.toISOString(),
      };

      if (isEdit) {
        // Na edição, preserva o walletId original da transação (não recria).
        const editBody = { ...body };
        delete editBody.method;
        delete editBody.methodKind;
        delete editBody.cardName;
        editBody.walletId = tx?.WalletId || null;
        editBody.cardId = tx?.CardId || null;
        await api.put(`/transactions/${tx.Id}`, editBody);
      } else {
        await api.post('/transactions', body);
      }
      showToast(isEdit ? 'Transação atualizada' : 'Transação adicionada');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const availableCategories = categories.filter((c) => c.Type === kind);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <button onClick={onClose} title="Fechar" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <PhosphorIcon name="x" size={24} />
        </button>
        <div className="segmented-control-container">
          <button className={`segmented-control-btn ${kind === 1 ? 'active' : ''}`} onClick={() => setKind(1)}>Despesa</button>
          <button className={`segmented-control-btn ${kind === 0 ? 'active' : ''}`} onClick={() => setKind(0)}>Renda</button>
        </div>
        <div style={{ width: 24 }} />
      </div>

      {/* Valor */}
      <div className="text-center py-2" onClick={() => setShowKeypad(!showKeypad)} style={{ cursor: 'pointer' }}>
        <span style={{ fontSize: '1.6rem', color: '#8C85AA' }}>R$</span>{' '}
        <span className="fw-bold" style={{ fontSize: '3.6rem', letterSpacing: '-1px', color: amount ? '#fff' : '#8C85AA' }}>
          {rawAmount || '0'}
        </span>
        <div className="small" style={{ color: '#8C85AA', marginTop: 2 }}>Clique para alterar o valor</div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* QUEM PAGOU? */}
      {members.length > 0 && (
        <div className="mb-3">
          <div className="text-uppercase small fw-semibold mb-2" style={{ color: '#8C85AA', letterSpacing: '0.5px' }}>
            {kind === 1 ? 'QUEM PAGOU?' : 'QUEM RECEBEU?'}
          </div>
          <div className="row g-2">
            {members.map((m) => (
              <div key={m.Id} className="col-4">
                <div className={`edit-payer-card ${payerMemberId === m.Id ? 'active' : ''}`} onClick={() => setPayerMemberId(m.Id)}>
                  <div className="avatar-circle mx-auto mb-2" style={{ width: 44, height: 44, background: '#3D2D63', border: '2px solid #9675FF' }}>
                    {String(m.Name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="small fw-semibold text-white">{m.Name}</div>
                </div>
              </div>
            ))}
            <div className="col-4">
              <div className={`edit-payer-card ${!payerMemberId ? 'active' : ''}`} onClick={() => setPayerMemberId('')}>
                <div className="avatar-circle mx-auto mb-2" style={{ width: 44, height: 44, background: '#00B2FE', border: '2px solid #00B2FE' }}>
                  <PhosphorIcon name="users" size={20} style={{ color: '#fff' }} />
                </div>
                <div className="small fw-semibold text-white">Compartilhado</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORIA */}
      <div className="mb-3">
        <div className="text-uppercase small fw-semibold mb-2" style={{ color: '#8C85AA', letterSpacing: '0.5px' }}>Categoria</div>
        {availableCategories.length > 0 ? (
          <div className="category-two-rows-container">
            {availableCategories.map((c) => (
              <button key={c.Id} className={`edit-pill-btn ${categoryId === c.Id ? 'active' : ''}`} onClick={() => setCategoryId(c.Id)}>
                <PhosphorIcon name={c.Icon || 'tag-simple'} size={16} style={{ color: c.Color }} />
                <span>{c.Name}</span>
              </button>
            ))}
            <a href="/categories" className="edit-categories-btn" title="Editar categorias">
              <PhosphorIcon name="gear" size={18} style={{ color: '#9675FF' }} />
            </a>
          </div>
        ) : (
          <div className="small" style={{ color: '#6F688F' }}>Nenhuma categoria disponível.</div>
        )}
      </div>

      {/* MÉTODO DE PAGAMENTO */}
      <div className="mb-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="text-uppercase small fw-semibold" style={{ color: '#8C85AA', letterSpacing: '0.5px' }}>
            MÉTODO DE PAGAMENTO (OPCIONAL)
          </div>
          <button className="btn btn-sm rounded-pill px-3 py-1 fw-semibold" style={{ backgroundColor: 'rgba(150,117,255,0.15)', color: '#9675FF', border: 'none', fontSize: '0.75rem' }} onClick={() => setShowAddMethod(true)}>
            + Novo
          </button>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {methodItems.map((m) => (
            <div key={m} className="d-flex align-items-center">
              <button
                className={`edit-pill-btn ${method === m ? 'active' : ''}`}
                onClick={() => setMethod(m)}
                style={{ borderTopRightRadius: customMethods.includes(m) ? 0 : undefined, borderBottomRightRadius: customMethods.includes(m) ? 0 : undefined }}
              >
                <span>{m}</span>
              </button>
              {customMethods.includes(m) && (
                <button
                  className="btn btn-sm p-1 border-0 d-flex align-items-center justify-content-center"
                  style={{ color: '#FF5C4D', background: 'rgba(255,92,77,0.12)', borderTopRightRadius: 18, borderBottomRightRadius: 18, height: 36, marginLeft: -4 }}
                  title="Excluir método"
                  onClick={() => removeCustomMethod(m)}
                >
                  <PhosphorIcon name="x" size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {showAddMethod && (
          <div className="card p-3 mt-2 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 16 }}>
            <div className="text-uppercase small fw-semibold mb-2" style={{ color: '#8C85AA', letterSpacing: '0.5px' }}>Novo método de pagamento</div>
            <input
              className="input"
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder="Ex: Boleto, Cheque..."
              autoFocus
            />
            <div className="d-flex gap-2 justify-content-end mt-2">
              <button className="btn btn-sm text-white-50" style={{ background: 'none', border: 'none' }} onClick={() => { setShowAddMethod(false); setNewMethodName(''); }}>Cancelar</button>
              <button className="btn btn-sm rounded-pill px-3 fw-semibold text-white" style={{ backgroundColor: '#9675FF', border: 'none' }} onClick={addCustomMethod}>Adicionar</button>
            </div>
          </div>
        )}
      </div>

      {/* PARCELAMENTO NO CARTÃO */}
      {isCardMethod && kind === 1 && (
        <div className="card p-3 mb-3 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 22 }}>
          <div className="text-uppercase small fw-semibold mb-2" style={{ color: '#8C85AA', letterSpacing: '0.5px' }}>Parcelamento no cartão</div>
          <select className="select" value={installments} onChange={(e) => setInstallments(parseInt(e.target.value, 10))}>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? '1x (À vista na fatura)' : `${n}x de ${money(Math.round((amount / n) * 100) / 100)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* DATA */}
      <div className="card p-3 mb-3 border-0 d-flex align-items-center justify-content-between" style={{ backgroundColor: '#1D1735', borderRadius: 22 }}>
        <div>
          <div className="text-uppercase small fw-semibold" style={{ color: '#8C85AA', letterSpacing: '0.5px', marginBottom: 4 }}>
            Data de início
          </div>
          <div className="fw-bold text-white">{dateLabel}</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="edit-pill-btn" onClick={prevDate}><PhosphorIcon name="caret-left" size={14} /></button>
          <button className="edit-pill-btn" onClick={nextDate}><PhosphorIcon name="caret-right" size={14} /></button>
        </div>
      </div>

      {/* STATUS */}
      {kind === 1 && !isCardMethod && (
        <div className="card p-3 mb-3 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 22 }}>
          <div className="text-uppercase small fw-semibold mb-2" style={{ color: '#8C85AA', letterSpacing: '0.5px' }}>Status do pagamento</div>
          <div className="segmented-control-container mb-2">
            <button className={`segmented-control-btn ${isPaid ? 'active' : ''}`} onClick={() => setIsPaid(true)}>
              <PhosphorIcon name="check" size={14} /> Pago
            </button>
            <button className={`segmented-control-btn ${!isPaid ? 'active' : ''}`} onClick={() => setIsPaid(false)}>
              <PhosphorIcon name="clock" size={14} /> Pendente
            </button>
          </div>
          {isPaid && (
            <>
              <div className="small fw-semibold mb-1" style={{ color: '#8C85AA' }}>PAGO EM</div>
              <input className="input mb-2" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
              <div className="small fw-semibold mb-1" style={{ color: '#8C85AA' }}>OBSERVAÇÃO</div>
              <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="pago dia 15, transferência..." />
            </>
          )}
        </div>
      )}

      {/* NOTA */}
      <div className="card p-3 mb-3 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 22 }}>
        <div className="text-uppercase small fw-semibold mb-2" style={{ color: '#8C85AA', letterSpacing: '0.5px' }}>Nota</div>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Adicionar uma nota..." />
      </div>

      {/* FREQUÊNCIA */}
      <div className="card p-3 mb-3 border-0" style={{ backgroundColor: '#1D1735', borderRadius: 22 }}>
        <div className="text-uppercase small fw-semibold mb-2" style={{ color: '#8C85AA', letterSpacing: '0.5px' }}>Com que frequência?</div>
        <select className="select" value={frequency} onChange={(e) => setFrequency(parseInt(e.target.value, 10))}>
          {freqOptions.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        {frequency !== 1 && !isEdit && (
          <>
            <div className="text-uppercase small fw-semibold mb-2 mt-3" style={{ color: '#8C85AA', letterSpacing: '0.5px' }}>Por quanto tempo?</div>
            <select className="select" value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="0">Sem limite</option>
              <option value="1">1 mês</option>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
              <option value="24">24 meses</option>
              <option value="custom">Outros</option>
            </select>
            {duration === 'custom' && (
              <div className="d-flex align-items-center gap-2 mt-2">
                <input className="input" type="number" value={customMonths} onChange={(e) => setCustomMonths(e.target.value)} placeholder="Quantos meses" />
                <span className="small text-muted">meses</span>
              </div>
            )}
          </>
        )}
      </div>

      <button
        className="btn w-100 py-3 text-white fw-bold border-0"
        style={{
          background: 'linear-gradient(135deg, #9675FF 0%, #7E52FF 100%)',
          borderRadius: 24,
          boxShadow: '0 8px 24px rgba(150,117,255,0.4)',
          fontSize: '1.05rem',
        }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Salvando...' : 'Salvar'}
      </button>

      {isEdit && (
        <button
          className="w-100 mt-3 d-flex align-items-center justify-content-center gap-2"
          style={{ background: 'none', border: 'none', color: '#FF5C4D', cursor: 'pointer' }}
          onClick={async () => {
            try {
              await api.del(`/transactions/${tx.Id}`);
              showToast('Transação excluída');
              onSaved();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }}
        >
          <PhosphorIcon name="trash" size={16} /> Excluir
        </button>
      )}

      {showKeypad && <TecladoNumerico initial={rawAmount} onDone={(val) => { setRawAmount(val); setShowKeypad(false); }} />}
    </div>
  );
}