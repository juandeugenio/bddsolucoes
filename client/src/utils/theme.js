const KEY = 'bdd.theme';

export function getTheme() {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
  return 'dark';
}

export function applyTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch (e) { /* ignore */ }

  if (theme === 'light') {
    document.body.classList.add('theme-light');
    document.body.classList.remove('theme-dark');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-bs-theme', 'light');
  } else if (theme === 'auto') {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    document.body.classList.toggle('theme-light', prefersLight);
    document.body.classList.remove('theme-dark');
    document.documentElement.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
    document.documentElement.setAttribute('data-bs-theme', prefersLight ? 'light' : 'dark');
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.remove('theme-dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  }
}

export function initTheme() {
  applyTheme(getTheme());
}