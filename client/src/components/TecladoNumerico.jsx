import React from 'react';

// Avalia uma expressão aritmética simples (+, -, *, /) SEM eval.
// Retorna o resultado ou null se a expressão for inválida.
function evaluate(expr) {
  const tokens = String(expr).replace(/÷/g, '/').replace(/×/g, '*').match(/\d+(?:\.\d+)?|[-+*/()]/g);
  if (!tokens) return null;

  const output = [];
  const ops = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const apply = (op) => {
    const b = output.pop();
    const a = output.pop();
    if (a === undefined || b === undefined) throw new Error('expressão inválida');
    let r;
    switch (op) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '*': r = a * b; break;
      case '/':
        if (b === 0) throw new Error('divisão por zero');
        r = a / b;
        break;
      default: throw new Error('operador inválido');
    }
    output.push(r);
  };

  try {
    for (const t of tokens) {
      if (/^\d/.test(t)) {
        output.push(parseFloat(t));
      } else if (t === '(') {
        ops.push(t);
      } else if (t === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') apply(ops.pop());
        if (!ops.length || ops.pop() !== '(') return null;
      } else if (precedence[t] !== undefined) {
        while (ops.length && precedence[ops[ops.length - 1]] >= precedence[t]) apply(ops.pop());
        ops.push(t);
      } else {
        return null; // token desconhecido
      }
    }
    while (ops.length) apply(ops.pop());
    const result = output[output.length - 1];
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

export default function TecladoNumerico({ onDone, initial = '' }) {
  const [expr, setExpr] = React.useState(initial || '');

  const press = (k) => {
    if (k === 'C') { setExpr(''); return; }
    if (k === '⌫') { setExpr((e) => e.slice(0, -1)); return; }
    if (k === '=') {
      const result = evaluate(expr);
      if (result !== null) setExpr(String(result));
      return;
    }
    setExpr((e) => e + k);
  };

  const keys = [
    ['1', '2', '3', '÷'],
    ['4', '5', '6', '×'],
    ['7', '8', '9', '-'],
    [',', '0', '⌫', '+'],
  ];

  return (
    <div className="keypad-bottom-sheet">
      <div className="keypad-handle" />
      <div className="keypad-grid">
        {keys.flat().map((k, i) => {
          const isOp = ['÷', '×', '-', '+'].includes(k);
          return (
            <button key={i} className={`keypad-btn ${isOp ? 'op-btn' : ''}`} onClick={() => press(k)}>
              {k === '⌫' ? (
                <svg width="26" height="26" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M216,32H77.3a16.1,16.1,0,0,0-13.7,7.9L20.1,112a16,16,0,0,0,0,16l43.5,72.1A16.1,16.1,0,0,0,77.3,208H216a16,16,0,0,0,16-16V48A16,16,0,0,0,216,32ZM128,160a8,8,0,0,1-5.7-13.7L139.7,128l-17.4-18.3a8,8,0,0,1,11.3-11.3L151,116.7l18.3-18.3a8,8,0,0,1,11.3,11.3L162.3,128l17.4,18.3a8,8,0,0,1,0,11.3A8,8,0,0,1,176,168a8,8,0,0,1-5.7-2.3L152,148.3l-18.3,18.3A8,8,0,0,1,128,160Z" />
                </svg>
              ) : (
                k
              )}
            </button>
          );
        })}
      </div>
      <div className="keypad-action-row">
        <button className="keypad-action-btn c-btn" onClick={() => press('C')}>C</button>
        <button className="keypad-action-btn eq-btn" onClick={() => press('=')}>=</button>
        <button className="keypad-action-btn done-btn" onClick={() => onDone(expr)}>Concluído</button>
      </div>
    </div>
  );
}