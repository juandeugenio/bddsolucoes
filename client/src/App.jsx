import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Recurring from './pages/Recurring.jsx';
import Categories from './pages/Categories.jsx';
import Wallets from './pages/Wallets.jsx';
import Split from './pages/Split.jsx';
import SplitDetail from './pages/SplitDetail.jsx';
import Share from './pages/Share.jsx';
import Settings from './pages/Settings.jsx';
import SettingsCards from './pages/SettingsCards.jsx';
import SettingsLimits from './pages/SettingsLimits.jsx';
import SettingsRates from './pages/SettingsRates.jsx';
import Analytics from './pages/Analytics.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import Lock from './pages/Lock.jsx';
import Home from './pages/Home.jsx';
import InviteAccept from './pages/InviteAccept.jsx';
import SettingsMethods from './pages/SettingsMethods.jsx';
import Onboarding from './pages/Onboarding.jsx';
import TransactionsImport from './pages/TransactionsImport.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import AccessDenied from './pages/AccessDenied.jsx';
import RegisterConfirmation from './pages/RegisterConfirmation.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/confirm-email" element={<RegisterConfirmation />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="/home" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/invite/:token" element={<Protected><InviteAccept /></Protected>} />
        <Route path="/lock" element={<Protected><Lock /></Protected>} />

        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/import" element={<TransactionsImport />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/split" element={<Split />} />
          <Route path="/split/:id" element={<SplitDetail />} />
          <Route path="/share" element={<Share />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/cards" element={<SettingsCards />} />
          <Route path="/settings/limits" element={<SettingsLimits />} />
          <Route path="/settings/methods" element={<SettingsMethods />} />
          <Route path="/settings/rates" element={<SettingsRates />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/:tab" element={<Analytics />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ToastProvider>
  );
}