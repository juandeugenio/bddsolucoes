import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  return <div className="loading-screen"><div className="spinner" /></div>;
}