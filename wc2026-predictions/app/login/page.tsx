'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type AuthMode = 'signin' | 'signup' | 'reset';

type ConnectedUser = {
  id: string;
  email: string;
  username: string;
};

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectedUser, setConnectedUser] = useState<ConnectedUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkConnectedUser();
  }, []);

  function isSuccessMessage(text: string) {
    return (
      text.includes('créé') ||
      text.includes('connecté') ||
      text.includes('envoyé') ||
      text.includes('Déconnecté')
    );
  }

  async function checkConnectedUser() {
    setCheckingSession(true);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setConnectedUser(null);
      setCheckingSession(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', user.id)
      .maybeSingle();

    setConnectedUser({
      id: user.id,
      email: profile?.email || user.email || '',
      username: profile?.username || user.email || 'Utilisateur',
    });

    setCheckingSession(false);
  }

  async function signUp() {
    setMessage('');

    if (!email || !password) {
      setMessage('Email et mot de passe obligatoires.');
      return;
    }

    if (password.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim() || cleanEmail.split('@')[0];

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Compte créé. Vérifie tes emails si Supabase demande une confirmation.');
    await checkConnectedUser();
  }

  async function signIn() {
    setMessage('');

    if (!email || !password) {
      setMessage('Email/pseudo et mot de passe obligatoires.');
      return;
    }

    setLoading(true);

    let loginEmail = email.trim();
    const isEmail = loginEmail.includes('@');

    if (!isEmail) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', loginEmail)
        .single();

      if (profileError || !profile?.email) {
        setLoading(false);
        setMessage('Pseudo introuvable.');
        return;
      }

      loginEmail = profile.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Connecté.');
    await checkConnectedUser();
  }

  async function resetPassword() {
    setMessage('');

    if (!email) {
      setMessage('Entre ton adresse email pour réinitialiser le mot de passe.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== 'undefined'
          ? `${window.location.origin}/profile`
          : undefined,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Email de réinitialisation envoyé.');
  }

  async function signOut() {
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signOut();

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setConnectedUser(null);
    setMessage('Déconnecté.');
  }

  if (checkingSession) {
    return (
      <main className="container">
        <div className="card" style={{ maxWidth: 560, margin: '32px auto' }}>
          <p className="small">Vérification de la session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 560, margin: '32px auto' }}>
        <span className="badge">🏆 WC 2026 Predictions</span>

        {connectedUser ? (
          <>
            <h1 style={{ marginBottom: 8 }}>Déjà connecté</h1>

            <p className="small">
              Vous êtes actuellement connecté sous le nom{' '}
              <strong>{connectedUser.username}</strong>.
            </p>

            <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/predictions';
                }}
              >
                Aller aux pronostics
              </button>

              <button
                type="button"
                className="secondary"
                onClick={signOut}
                disabled={loading}
              >
                {loading ? 'Déconnexion...' : 'Se déconnecter'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ marginBottom: 8 }}>
              {mode === 'signin' && 'Connexion'}
              {mode === 'signup' && 'Créer un compte'}
              {mode === 'reset' && 'Réinitialiser le mot de passe'}
            </h1>

            <p className="small">
              {mode === 'signin' &&
                'Connecte-toi pour encoder tes pronostics et suivre ton classement.'}
              {mode === 'signup' &&
                'Crée ton compte pour rejoindre le jeu de pronostics.'}
              {mode === 'reset' &&
                'Entre ton email et tu recevras un lien pour modifier ton mot de passe.'}
            </p>

            <div
              style={{
                display: 'flex',
                gap: 8,
                margin: '22px 0',
                padding: 6,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <button
                type="button"
                className={mode === 'signin' ? '' : 'secondary'}
                onClick={() => {
                  setMode('signin');
                  setMessage('');
                }}
                style={{ flex: 1 }}
              >
                Se connecter
              </button>

              <button
                type="button"
                className={mode === 'signup' ? '' : 'secondary'}
                onClick={() => {
                  setMode('signup');
                  setMessage('');
                }}
                style={{ flex: 1 }}
              >
                Créer un compte
              </button>
            </div>

            {mode === 'signup' && (
              <>
                <label>Pseudo</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Louis"
                />
              </>
            )}

            <label>Email ou pseudo</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com ou Louis"
            />

            {mode !== 'reset' && (
              <>
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </>
            )}

            <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
              {mode === 'signin' && (
                <button type="button" onClick={signIn} disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              )}

              {mode === 'signup' && (
                <button type="button" onClick={signUp} disabled={loading}>
                  {loading ? 'Création...' : 'Créer mon compte'}
                </button>
              )}

              {mode === 'reset' && (
                <button type="button" onClick={resetPassword} disabled={loading}>
                  {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                </button>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                marginTop: 18,
              }}
            >
              {mode !== 'reset' ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setMode('reset');
                    setMessage('');
                  }}
                >
                  Mot de passe oublié ?
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setMode('signin');
                    setMessage('');
                  }}
                >
                  Retour à la connexion
                </button>
              )}
            </div>
          </>
        )}

        {message && (
          <p className={isSuccessMessage(message) ? 'success' : 'error'}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
