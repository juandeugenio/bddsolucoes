import React from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import PhosphorIcon from './PhosphorIcon.jsx';
import TenantSwitcher from './TenantSwitcher.jsx';
import { usePwa } from '../sync.js';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  usePwa();

  const isAdmin = user?.role === 'Admin';

  const isAccountPage =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/account');

  const isActive = (to) => {
    if (to === '/dashboard') return location.pathname === '/' || location.pathname.startsWith('/dashboard');
    if (to === '/analytics') return location.pathname.startsWith('/analytics');
    return location.pathname.startsWith(to);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isAccountPage) {
    return <main style={{ minHeight: '100vh', width: '100%', background: '#120E24' }}><Outlet /></main>;
  }

  return (
    <div className="desktop-layout">
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div className="desktop-sidebar-brand">
          <img src="/images/icon.svg" alt="BDD" />
          <span>
            <span className="d-flex flex-column">
              <span>BDD</span>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>Soluções Financeiras</span>
            </span>
          </span>
        </div>
        <TenantSwitcher />
        <nav className="desktop-sidebar-nav">
          <NavLink to="/dashboard" className={`desktop-sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}>
            <PhosphorIcon name="house" size={22} />
            <span>Visão Geral</span>
          </NavLink>
          <NavLink to="/transactions" className={`desktop-sidebar-link ${isActive('/transactions') ? 'active' : ''}`}>
            <PhosphorIcon name="list" size={22} />
            <span>Movimentos</span>
          </NavLink>
          <a href="/transactions?new=1" className="desktop-sidebar-fab-btn">
            <PhosphorIcon name="plus" size={20} />
            <span>Nova Transação</span>
          </a>
          <NavLink to="/analytics" className={`desktop-sidebar-link ${isActive('/analytics') ? 'active' : ''}`}>
            <PhosphorIcon name="chart-bar" size={22} />
            <span>Gráficos</span>
          </NavLink>
          <NavLink to="/settings" className={`desktop-sidebar-link ${isActive('/settings') ? 'active' : ''}`}>
            <PhosphorIcon name="gear" size={22} />
            <span>Configurações</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/users" className={`desktop-sidebar-link ${isActive('/admin/users') ? 'active' : ''}`}>
              <PhosphorIcon name="shield-check" size={22} />
              <span>Usuários</span>
            </NavLink>
          )}
        </nav>
      </aside>

      {/* Mobile Container Viewport */}
      <div className="app-viewport">
        <header className="mobile-brand-bar">
          <img src="/images/icon.svg" alt="BDD" className="mobile-brand-logo" />
          <span className="mobile-brand-text">
            <span className="mobile-brand-name">BDD</span>
            <span className="mobile-brand-tag">Soluções Financeiras</span>
          </span>
          <button
            onClick={handleLogout}
            title="Sair da conta"
            style={{
              marginLeft: 'auto',
              background: 'rgba(255,71,87,0.12)',
              color: '#FF4757',
              border: '1px solid rgba(255,71,87,0.2)',
              borderRadius: 10,
              width: 36,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <PhosphorIcon name="sign-out" size={18} />
          </button>
        </header>
        <main className="app-main-content">
          <article className="px-3 pt-3 pb-5">
            <Outlet />
          </article>
        </main>

        <nav className="bottom-nav">
          <NavLink to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            <PhosphorIcon name="house" size={24} />
            <span>Visão Geral</span>
          </NavLink>
          <NavLink to="/transactions" className={isActive('/transactions') ? 'active' : ''}>
            <PhosphorIcon name="list" size={24} />
            <span>Movimentos</span>
          </NavLink>
          <a href="/transactions?new=1" className="bottom-nav-fab-btn" title="Nova Transação">
            <div className="bottom-nav-fab">
              <PhosphorIcon name="plus" size={28} />
            </div>
          </a>
          <NavLink to="/analytics" className={isActive('/analytics') ? 'active' : ''}>
            <PhosphorIcon name="chart-bar" size={24} />
            <span>Gráficos</span>
          </NavLink>
          <NavLink to="/settings" className={isActive('/settings') ? 'active' : ''}>
            <PhosphorIcon name="gear" size={24} />
            <span>Configurações</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}