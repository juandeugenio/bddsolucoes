import React from 'react';

const icons = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6" />,
  transactions: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  recurring: <path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" />,
  categories: <path d="M12 2l9 5-9 5-9-5 9-5zm-9 10 9 5 9-5M3 17l9 5 9-5" />,
  wallets: <path d="M2 6h20v14H2zM2 10h20M16 15h4" />,
  split: <path d="M16 3h5v5M21 3l-7 7M4 21l7-7M21 3l-7 7M8 3H3v5M3 21h5" />,
  share: <path d="M12 21a9 9 0 1 1 9-9M8 14h3m-3-4h6l-3-3M14 21v-6" />,
  settings: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6a7.4 7.4 0 0 0 .1-1.2z" />,
  admin: <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm-2 6V6a2 2 0 1 1 4 0v2h-4z" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  lock: <path d="M5 11h14v10H5zM7 11V7a5 5 0 0 1 10 0v4" />,
  analytics: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
};

export default function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name] || null}
    </svg>
  );
}