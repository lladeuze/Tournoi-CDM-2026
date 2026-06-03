'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');

  async function signUp() {
    setMessage('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return setMessage(error.message);
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, email, username: username || email.split('@')[0] });
    }
    setMessage('Compte créé. Vérifie tes emails si Supabase demande une confirmation.');
  }

  async function signIn() {
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMessage(error.message);
    window.location.href = '/predictions';
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage('Déconnecté.');
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520 }}>
        <h1>Connexion</h1>
        <label>Pseudo</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Louis" />
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
        <label>Mot de passe</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={signIn}>Se connecter</button>
          <button className="secondary" onClick={signUp}>Créer un compte</button>
          <button className="secondary" onClick={signOut}>Déconnexion</button>
        </div>
        {message && <p className={message.includes('créé') || message.includes('Déconnecté') ? 'success' : 'error'}>{message}</p>}
      </div>
    </main>
  );
}
