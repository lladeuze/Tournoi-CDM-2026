'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Match = { id: string; home_team: string; away_team: string; kickoff_at: string; status: string };
type Prediction = { match_id: string; predicted_home_score: number; predicted_away_score: number; predicted_first_scorer: string | null; points: number };

export default function PredictionsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return setMessage('Connecte-toi pour encoder tes pronostics.');
      setUserId(user.id);

      const [{ data: matchesData }, { data: predictionsData }] = await Promise.all([
        supabase.from('matches').select('*').order('kickoff_at', { ascending: true }),
        supabase.from('predictions').select('*').eq('user_id', user.id),
      ]);
      setMatches(matchesData || []);
      const byMatch: Record<string, Prediction> = {};
      (predictionsData || []).forEach((p: Prediction) => { byMatch[p.match_id] = p; });
      setPredictions(byMatch);
    }
    load();
  }, []);

  function update(matchId: string, field: keyof Prediction, value: string) {
    setPredictions((current) => ({
      ...current,
      [matchId]: {
        match_id: matchId,
        predicted_home_score: field === 'predicted_home_score' ? Number(value) : current[matchId]?.predicted_home_score ?? 0,
        predicted_away_score: field === 'predicted_away_score' ? Number(value) : current[matchId]?.predicted_away_score ?? 0,
        predicted_first_scorer: field === 'predicted_first_scorer' ? value : current[matchId]?.predicted_first_scorer ?? '',
        points: current[matchId]?.points ?? 0,
      },
    }));
  }

  async function save(match: Match) {
    if (!userId) return;
    if (new Date(match.kickoff_at).getTime() <= Date.now()) return setMessage('Trop tard : le match a déjà commencé.');
    const p = predictions[match.id];
    if (!p) return setMessage('Encode un score avant de sauver.');

    const { error } = await supabase.from('predictions').upsert({
      user_id: userId,
      match_id: match.id,
      predicted_home_score: p.predicted_home_score,
      predicted_away_score: p.predicted_away_score,
      predicted_first_scorer: p.predicted_first_scorer || null,
    }, { onConflict: 'user_id,match_id' });

    setMessage(error ? error.message : 'Prono sauvegardé.');
  }

  return (
    <main className="container">
      <h1>Mes pronostics</h1>
      {message && <p className={message.includes('sauvegardé') ? 'success' : 'error'}>{message}</p>}
      <div className="grid">
        {matches.map((match) => {
          const locked = new Date(match.kickoff_at).getTime() <= Date.now();
          const p = predictions[match.id];
          return (
            <div className="card" key={match.id}>
              <p className="small">{new Date(match.kickoff_at).toLocaleString('fr-BE')}</p>
              <h2>{match.home_team} - {match.away_team}</h2>
              <div className="grid">
                <div><label>{match.home_team}</label><input disabled={locked} type="number" value={p?.predicted_home_score ?? 0} onChange={(e) => update(match.id, 'predicted_home_score', e.target.value)} /></div>
                <div><label>{match.away_team}</label><input disabled={locked} type="number" value={p?.predicted_away_score ?? 0} onChange={(e) => update(match.id, 'predicted_away_score', e.target.value)} /></div>
              </div>
              <label>Premier buteur</label>
              <input disabled={locked} value={p?.predicted_first_scorer ?? ''} onChange={(e) => update(match.id, 'predicted_first_scorer', e.target.value)} placeholder="Ex: Mbappé" />
              <p className="small">Points actuels : {p?.points ?? 0}</p>
              <button disabled={locked} onClick={() => save(match)}>{locked ? 'Verrouillé' : 'Sauvegarder'}</button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
