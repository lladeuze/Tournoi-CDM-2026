'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Match = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  first_scorer: string | null;
  status: string;
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [message, setMessage] = useState('');
  const [newMatch, setNewMatch] = useState({
    home_team: '',
    away_team: '',
    kickoff_at: '',
  });

  async function load() {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      return setMessage(`Erreur utilisateur: ${userError.message}`);
    }

    const user = userData.user;

    if (!user) {
      return setMessage('Connecte-toi avec ton compte admin.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return setMessage(
        `Erreur profil: ${profileError.message} | user=${user.id} | email=${user.email}`
      );
    }

    if (!profile?.is_admin) {
      return setMessage(
        `Accès refusé | user=${user.id} | email=${user.email} | profile=${JSON.stringify(profile)}`
      );
    }

    setIsAdmin(true);
    setMessage('');

    const { data, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff_at', { ascending: true });

    if (matchesError) {
      return setMessage(`Erreur matchs: ${matchesError.message}`);
    }

    setMatches(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addMatch() {
    const { error } = await supabase
      .from('matches')
      .insert({ ...newMatch, status: 'scheduled' });

    setMessage(error ? error.message : 'Match ajouté.');
    setNewMatch({ home_team: '', away_team: '', kickoff_at: '' });
    load();
  }

  async function updateMatch(match: Match) {
    const { error } = await supabase
      .from('matches')
      .update({
        home_score: match.home_score,
        away_score: match.away_score,
        first_scorer: match.first_scorer,
        status: match.status,
      })
      .eq('id', match.id);

    if (!error) {
      await supabase.rpc('recalculate_points_for_match', {
        match_uuid: match.id,
      });
    }

    setMessage(error ? error.message : 'Résultat sauvegardé et points recalculés.');
    load();
  }

  function edit(id: string, field: keyof Match, value: string) {
    setMatches((rows) =>
      rows.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]: field.includes('score')
                ? value === ''
                  ? null
                  : Number(value)
                : value,
            }
          : m
      )
    );
  }

  return (
    <main className="container">
      <h1>Admin</h1>

      {message && (
        <p className={message.includes('sauvegardé') || message.includes('ajouté') ? 'success' : 'error'}>
          {message}
        </p>
      )}

      {isAdmin && (
        <>
          <div className="card">
            <h2>Ajouter un match</h2>

            <div className="grid">
              <div>
                <label>Équipe domicile</label>
                <input
                  value={newMatch.home_team}
                  onChange={(e) =>
                    setNewMatch({ ...newMatch, home_team: e.target.value })
                  }
                />
              </div>

              <div>
                <label>Équipe extérieur</label>
                <input
                  value={newMatch.away_team}
                  onChange={(e) =>
                    setNewMatch({ ...newMatch, away_team: e.target.value })
                  }
                />
              </div>

              <div>
                <label>Date / heure</label>
                <input
                  type="datetime-local"
                  value={newMatch.kickoff_at}
                  onChange={(e) =>
                    setNewMatch({ ...newMatch, kickoff_at: e.target.value })
                  }
                />
              </div>
            </div>

            <button style={{ marginTop: 12 }} onClick={addMatch}>
              Ajouter
            </button>
          </div>

          {matches.map((match) => (
            <div className="card" key={match.id}>
              <h2>
                {match.home_team} - {match.away_team}
              </h2>

              <div className="grid">
                <div>
                  <label>Score {match.home_team}</label>
                  <input
                    type="number"
                    value={match.home_score ?? ''}
                    onChange={(e) =>
                      edit(match.id, 'home_score', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Score {match.away_team}</label>
                  <input
                    type="number"
                    value={match.away_score ?? ''}
                    onChange={(e) =>
                      edit(match.id, 'away_score', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Premier buteur</label>
                  <input
                    value={match.first_scorer ?? ''}
                    onChange={(e) =>
                      edit(match.id, 'first_scorer', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Statut</label>
                  <select
                    value={match.status}
                    onChange={(e) => edit(match.id, 'status', e.target.value)}
                  >
                    <option value="scheduled">scheduled</option>
                    <option value="live">live</option>
                    <option value="finished">finished</option>
                  </select>
                </div>
              </div>

              <button style={{ marginTop: 12 }} onClick={() => updateMatch(match)}>
                Sauvegarder résultat
              </button>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
