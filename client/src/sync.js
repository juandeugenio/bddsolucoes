import { useEffect, useRef } from 'react';
import { useAuth } from './auth.jsx';
import api from './api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function subscribePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    const { publicKey } = await api.get('/settings/push/public-key');
    if (!publicKey) return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await api.post('/push/subscribe', {
      endpoint: sub.endpoint,
      keys: sub.toJSON().keys,
    });
  } catch {
    // melhor esforço (sem permissão/SW indisponível)
  }
}

export function usePwa() {
  const { user } = useAuth();
  const lastVersion = useRef(null);

  useEffect(() => {
    // Service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    if (user) {
      subscribePush();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const poll = async () => {
      try {
        const data = await api.get('/sync/tenant-version');
        if (lastVersion.current === null) {
          lastVersion.current = data.version;
        } else if (data.version !== lastVersion.current) {
          lastVersion.current = data.version;
          window.location.reload();
          return;
        }
      } catch {
        // ignora
      }
      if (!stopped) {
        setTimeout(poll, 5000);
      }
    };

    poll();
    return () => {
      stopped = true;
    };
  }, [user]);
}