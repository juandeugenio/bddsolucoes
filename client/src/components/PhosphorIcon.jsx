import React from 'react';

// Replica o PhosphorIcon.razor do app original:
// renderiza <i class="ph ph-{name}"> usando o CSS oficial do Phosphor (@phosphor-icons/web).
// O CSS carrega a fonte Phosphor e define o glyph de cada classe.

// Mapeia nomes do app para a classe Phosphor correspondente (igual ao IconClassMap do legado).
const ICON_MAP = {
  // UI System
  'house': 'house',
  'home': 'house',
  'list': 'list',
  'list-bullets': 'list',
  'gear': 'gear',
  'gear-six': 'gear-six',
  'settings': 'gear',
  'plus': 'plus',
  'x': 'x',
  'check': 'check',
  'check-circle': 'check-circle',
  'caret-down': 'caret-down',
  'caret-up': 'caret-up',
  'caret-left': 'caret-left',
  'caret-right': 'caret-right',
  'arrows-clockwise': 'arrows-clockwise',
  'trash': 'trash',
  'pencil-simple': 'pencil-simple',
  'sliders': 'sliders',
  'sliders-horizontal': 'sliders-horizontal',
  'star': 'star',
  'squares-four': 'squares-four',
  'credit-card': 'credit-card',
  'currency-dollar': 'currency-dollar',
  'globe': 'globe',
  'download-simple': 'download-simple',
  'database': 'database',
  'file-pdf': 'file-pdf',
  'bell': 'bell',
  'sun': 'sun',
  'moon': 'moon',
  'device-mobile': 'device-mobile',
  'question': 'question',
  'scales': 'scales',
  'shield-check': 'shield-check',
  'sign-out': 'sign-out',
  'users': 'users',
  'wallet': 'wallet',
  'bank': 'bank',
  'coins': 'coins',
  'calendar-blank': 'calendar-blank',
  'clock': 'clock',
  'note-pencil': 'note-pencil',
  'receipt': 'receipt',
  'briefcase': 'briefcase',
  'shopping-bag': 'shopping-bag',
  'warning-circle': 'warning-circle',
  'crown': 'crown',
  'lightning': 'lightning',
  'copy': 'copy',
  'qr-code': 'qr-code',
  'magnifying-glass': 'magnifying-glass',
  'heart': 'heart',
  'calendar-check': 'calendar-check',
  'tag': 'tag',
  'tag-simple': 'tag-simple',
  'envelope-simple': 'envelope-simple',
  'key': 'key',
  'lock': 'lock',
  'paper-plane-tilt': 'paper-plane-tilt',
  'funnel-simple': 'funnel-simple',
  'dots-six-vertical': 'dots-six-vertical',
  'arrow-left': 'arrow-left',
  'arrow-right': 'arrow-right',
  'chart-bar': 'chart-bar',
  'chart-pie': 'chart-pie',
  'calendar': 'calendar',
  'user': 'user',
  'user-plus': 'user-plus',
  'user-minus': 'user-minus',
  'piggy-bank': 'piggy-bank',
  'first-aid-kit': 'first-aid-kit',
  'pizza': 'pizza',
  'coffee': 'coffee',
  'game-controller': 'game-controller',
  'music-notes': 'music-notes',
  'airplane': 'airplane',
  'car': 'car',
  'gift': 'gift',
  'trend-up': 'trend-up',
  'trend-down': 'trend-down',
  'info': 'info',
  'warning': 'warning',
  'share-network': 'share-network',
  'palette': 'palette',
  'paw-print': 'paw-print',
  'leaf': 'leaf',
  'drop': 'drop',
  'book': 'book',
  'film-strip': 'film-strip',
  'lightning-bolt': 'lightning',
  'map-pin': 'map-pin',
  'trophy': 'trophy',
  'medal': 'medal',
  'shield': 'shield',
  'chat-circle-text': 'chat-circle-text',
  'sparkle': 'sparkle',
  'smiley': 'smiley',
  'swatches': 'swatches',
  'fingerprint': 'fingerprint',
  'ruler': 'ruler',
  'target': 'target',
  'calculator': 'calculator',
  'money': 'currency-dollar',
  'bank-coin': 'bank',
  'coins-bold': 'coins',
  'percent': 'percent',
  'handshake': 'handshake',
  'tray': 'tray',
  'folder-open': 'folder-open',
  'gauge': 'gauge',
  'house-line': 'house-line',
};

export default function PhosphorIcon({ name, size = 22, className = '', style }) {
  const clean = String(name || '').toLowerCase();
  const phClass = ICON_MAP[clean] || (clean.startsWith('ph-') ? clean : clean);

  // Se o "nome" é um emoji ou texto (não uma classe Phosphor), renderiza como texto
  // (categorias padrão usam emojis, como no legado).
  if (/[^\w-]/.test(phClass) || /\p{Extended_Pictographic}/u.test(String(name || ''))) {
    return (
      <span
        className={className || undefined}
        style={{
          fontSize: size,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
        aria-hidden="true"
      >
        {name}
      </span>
    );
  }

  const cls = `ph ph-${phClass}`;
  return (
    <i
      className={`${cls} ${className}`}
      style={{
        fontSize: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        color: 'currentColor',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}