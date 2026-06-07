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
  match_label: string | null;
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .order('kickoff_at', { ascending: true })
      .then(({ data }) => setMatches(data || []));
  }, []);

  return (
    <main className="container">
      <h1>Matchs</h1>
      <div className="grid">
        {matches.map((match) => (
          <div className="card" key={match.id}>
            <p className="small">{new Date(match.kickoff_at).toLocaleString('fr-BE')}</p>
            <h2>{match.home_team} - {match.away_team}</h2>
            <p>Score : {match.home_score ?? '-'} - {match.away_score ?? '-'}</p>
            <p className="small">Premier buteur : {match.first_scorer || '-'}</p>
            <span className="badge">{match.status}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
