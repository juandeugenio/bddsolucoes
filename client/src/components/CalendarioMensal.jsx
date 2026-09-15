import React, { useState } from 'react';
import { money } from './Money.jsx';
import PhosphorIcon from './PhosphorIcon.jsx';

export default function CalendarioMensal({ year, month, transactions, onSelectDay, onTogglePaid }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const weekHeader = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const byDay = {};
  for (const t of transactions) {
    const day = new Date(t.Date).getDate();
    (byDay[day] = byDay[day] || []).push(t);
  }

  const selectDay = (day) => {
    setSelectedDay(day);
    if (onSelectDay) onSelectDay(day);
  };

  return (
    <div className="calendar-card-container">
      <div className="calendar-week-header">
        {weekHeader.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="calendar-day-grid">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} style={{ minHeight: 54 }} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const items = byDay[day] || [];
          let net = 0;
          for (const t of items) {
            net += t.Kind === 0 ? Number(t.Amount) : t.Kind === 1 ? -Number(t.Amount) : 0;
          }
          const isToday = `${year}-${month - 1}-${day}` === todayStr;
          return (
            <div
              key={day}
              className={`calendar-day-cell ${selectedDay === day ? 'selected' : ''} ${isToday ? 'today-outline' : ''}`}
              onClick={() => selectDay(day)}
            >
              <div className="calendar-day-number">{day}</div>
              {items.length > 0 && (
                <div className={`calendar-day-net ${net >= 0 ? 'income' : 'expense'}`}>
                  {net >= 0 ? '+' : '-'}{compactMoney(Math.abs(net))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lista do dia selecionado */}
      {selectedDay && byDay[selectedDay] && (
        <div className="mt-3">
          <div className="d-flex align-items-center justify-content-between px-2 mb-2">
            <div className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>
              {selectedDay} de {new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
            </div>
            <div className="small fw-semibold">
              {dayNet(byDay[selectedDay]) >= 0 ? '+' : '-'} {money(Math.abs(dayNet(byDay[selectedDay])))}
            </div>
          </div>
          <div className="date-group-container" style={{ marginBottom: 0 }}>
            {byDay[selectedDay].map((t, i) => (
              <div key={t.Id}>
                {i > 0 && <div className="date-group-divider" />}
                <div className="date-group-item" style={{ cursor: 'default' }}>
                  <div className="category-squircle-wrapper" style={{ backgroundColor: t.CategoryColor ? `${t.CategoryColor}22` : '#2D234D', width: 42, height: 42, borderRadius: 14 }}>
                    <PhosphorIcon name={t.CategoryIcon || (t.Kind === 0 ? 'currency-dollar' : 'receipt')} size={18} style={{ color: t.CategoryColor || '#fff' }} />
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-bold text-white small">{t.Note || t.Obs || 'Sem descrição'}</div>
                    <div className="small" style={{ color: '#6F688F' }}>{t.CategoryName || 'Geral'}</div>
                  </div>
                  <div className="fw-bold" style={{ fontSize: '0.85rem', color: t.Kind === 0 ? '#3ECF8E' : t.Kind === 1 ? '#FF9F94' : '#00B2FE' }}>
                    {t.Kind === 0 ? '+' : t.Kind === 1 ? '-' : ''}{money(Math.abs(t.Amount))}
                  </div>
                  {t.Kind !== 2 && (
                    <span
                      className={`status-pill ${t.IsPaid ? 'paid' : 'pending'}`}
                      onClick={(e) => { e.stopPropagation(); onTogglePaid && onTogglePaid(t); }}
                    >
                      {t.IsPaid ? 'Pago' : 'Pendente'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDay && (!byDay[selectedDay] || byDay[selectedDay].length === 0) && (
        <div className="empty-day-dashed-card">
          <h5 className="text-white" style={{ fontSize: '1rem' }}>Nenhum movimento no dia selecionado</h5>
          <p className="small" style={{ color: '#8C85AA' }}>Não há receitas nem despesas. Use o botão abaixo para adicionar uma.</p>
          <button className="dashed-add-day-btn" onClick={() => onSelectDay && onSelectDay(selectedDay)}>
            <PhosphorIcon name="plus" size={16} /> Adicionar neste dia
          </button>
        </div>
      )}
    </div>
  );
}

function compactMoney(v) {
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)} mi`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} mil`;
  return v.toFixed(0);
}

function dayNet(items) {
  return items.reduce((s, t) => s + (t.Kind === 0 ? Number(t.Amount) : t.Kind === 1 ? -Number(t.Amount) : 0), 0);
}