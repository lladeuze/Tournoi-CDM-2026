'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

/** Registers the service worker and surfaces an "install app" banner. */
export default function Pwa() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Secure-context only (https / localhost) — fails silently otherwise.
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      try {
        if (!localStorage.getItem('wc-install-dismissed')) setShow(true);
      } catch {
        setShow(true);
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () =>
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (!show || !deferred) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Installer l’application">
      <span>Installer l’app WC 2026 sur ton écran d’accueil ?</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setShow(false);
            setDeferred(null);
          }}
        >
          Installer
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setShow(false);
            try {
              localStorage.setItem('wc-install-dismissed', '1');
            } catch {}
          }}
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
