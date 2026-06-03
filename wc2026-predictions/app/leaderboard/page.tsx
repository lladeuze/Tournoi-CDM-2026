'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row = { user_id: string; username: string; total_points: number; exact_scores: number; correct_results: number; first_scorers: number };

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase.from('leaderboard').select('*').order('total_points', { ascending: false }).then(({ data }) => setRows(data || []));
  }, []);

  return (
    <main className="container">
      <h1>Classement</h1>
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>Joueur</th><th>Points</th><th>Scores exacts</th><th>Buteurs</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.user_id}>
                <td>{index + 1}</td><td>{row.username}</td><td><strong>{row.total_points}</strong></td><td>{row.exact_scores}</td><td>{row.first_scorers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
