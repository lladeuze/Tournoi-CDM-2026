'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type League = {
  id: string;
  name: string;
  code: string;
  owner_id: string | null;
  created_at: string;
};

type LeagueMember = {
  league_id: string;
  leagues: League | League[] | null;
};

export default function LeaguesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setMessage('');

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setMessage(`Erreur utilisateur : ${userError.message}`);
      return;
    }

    const user = userData.user;

    if (!user) {
      setMessage('Connecte-toi pour gérer tes ligues.');
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from('league_members')
      .select(
        `
        league_id,
        leagues (
          id,
          name,
          code,
          owner_id,
          created_at
        )
      `
      )
      .eq('user_id', user.id);

    if (error) {
      setMessage(`Erreur ligues : ${error.message}`);
      return;
    }

    const normalizedLeagues: League[] = ((data || []) as LeagueMember[])
      .map((row) => {
        if (Array.isArray(row.leagues)) {
          return row.leagues[0] || null;
        }

        return row.leagues;
      })
      .filter(Boolean) as League[];

    setLeagues(normalizedLeagues);
  }

  function generateLeagueCode() {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map((byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .slice(0, 16);
}

  async function createLeague() {
    if (!userId) return;

    const cleanName = newLeagueName.trim();

    if (!cleanName) {
      setMessage('Indique un nom de ligue.');
      return;
    }

    const code = generateLeagueCode();

    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name: cleanName,
        code,
        owner_id: userId,
      })
      .select('*')
      .single();

    if (leagueError) {
      setMessage(`Erreur création ligue : ${leagueError.message}`);
      return;
    }

    const { error: memberError } = await supabase.from('league_members').insert({
      league_id: leagueData.id,
      user_id: userId,
    });

    if (memberError) {
      setMessage(`Ligue créée, mais erreur membre : ${memberError.message}`);
      return;
    }

    setNewLeagueName('');
    setMessage(`Ligue créée avec le code ${code}.`);
    await load();
  }

  async function joinLeague() {
    if (!userId) return;

    const cleanCode = joinCode.trim().toUpperCase();

    if (!cleanCode) {
      setMessage('Indique un code de ligue.');
      return;
    }

    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (leagueError || !leagueData) {
      setMessage('Aucune ligue trouvée avec ce code.');
      return;
    }

    const { error: memberError } = await supabase
      .from('league_members')
      .insert({
        league_id: leagueData.id,
        user_id: userId,
      });

    if (memberError) {
      if (memberError.message.includes('duplicate')) {
        setMessage('Tu es déjà membre de cette ligue.');
        return;
      }

      setMessage(`Erreur inscription ligue : ${memberError.message}`);
      return;
    }

    setJoinCode('');
    setMessage(`Tu as rejoint la ligue ${leagueData.name}.`);
    await load();
  }

  return (
    <main className="container">
      <h1>🏟️ Mes ligues</h1>

      {message && (
        <p
          className={
            message.includes('créée') || message.includes('rejoint')
              ? 'success'
              : 'error'
          }
        >
          {message}
        </p>
      )}

      <div className="grid">
        <div className="card">
          <h2>➕ Créer une ligue</h2>

          <p className="small">
            Crée une ligue pour jouer avec tes amis, collègues ou ta famille.
          </p>

          <label>Nom de la ligue</label>

          <input
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            placeholder="Ex : CDM 2026 Contest"
          />

          <button
            type="button"
            onClick={createLeague}
            style={{ marginTop: 12 }}
          >
            Créer la ligue
          </button>
        </div>

        <div className="card">
          <h2>🔑 Rejoindre une ligue</h2>

          <p className="small">
            Entre le code reçu pour rejoindre une ligue existante.
          </p>

          <label>Code de la ligue</label>

          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Ex : CDM2026"
          />

          <button type="button" onClick={joinLeague} style={{ marginTop: 12 }}>
            Rejoindre la ligue
          </button>
        </div>
      </div>

      <div className="card">
        <h2>🏆 Mes ligues</h2>

        {leagues.length === 0 ? (
          <p className="small">Tu n’es encore membre d’aucune ligue.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {leagues.map((league) => (
              <div
                key={league.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <h3 style={{ marginTop: 0 }}>{league.name}</h3>

                <p className="small" style={{ marginBottom: 0 }}>
                  Code : <strong>{league.code}</strong>
                  {league.owner_id === userId ? ' · Créateur' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
