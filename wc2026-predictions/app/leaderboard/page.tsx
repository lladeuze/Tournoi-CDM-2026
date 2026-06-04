'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type LeaderboardRow = {
  user_id: string;
  username: string;
  total_points: number;
  predictions_count: number;
  exact_scores_count: number;
  correct_results_count: number;
  first_scorers_count: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })
      .order('exact_scores_count', { ascending: false })
      .order('correct_results_count', { ascending: false });

    if (error) {
      setMessage(`Erreur classement : ${error.message}`);
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  }

  const podium = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);

  function medal(index: number) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  }

  return (
    <main className="container">
      <h1>🏆 Classement général</h1>

      {message && <p className="error">{message}</p>}
      {loading && <p className="small">Chargement du classement...</p>}

      {!loading && rows.length === 0 && (
        <div className="card">
          <p>Aucun classement disponible pour le moment.</p>
        </div>
      )}

      {!loading && podium.length > 0 && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            alignItems: 'end',
            marginTop: 24,
            marginBottom: 32,
          }}
        >
          {podium.map((player, index) => {
            const isFirst = index === 0;

            return (
              <div
                key={player.user_id}
                className="card"
                style={{
                  textAlign: 'center',
                  border: isFirst
                    ? '2px solid rgba(250, 204, 21, 0.8)'
                    : '1px solid rgba(255,255,255,0.14)',
                  transform: isFirst ? 'scale(1.04)' : 'scale(1)',
                  boxShadow: isFirst
                    ? '0 0 35px rgba(250, 204, 21, 0.22)'
                    : 'none',
                }}
              >
                <div style={{ fontSize: 44 }}>{medal(index)}</div>

                <p className="small">
                  #{index + 1}
                </p>

                <h2 style={{ marginBottom: 8 }}>
                  {player.username}
                </h2>

                <p
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    margin: 0,
                  }}
                >
                  {player.total_points} pts
                </p>

                <p className="small" style={{ marginTop: 12 }}>
                  🎯 {player.exact_scores_count} score(s) exact(s)
                  <br />
                  ⚽ {player.first_scorers_count} buteur(s) trouvé(s)
                </p>
              </div>
            );
          })}
        </section>
      )}

      {!loading && rows.length > 0 && (
        <section className="card">
          <h2>Classement complet</h2>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: 16,
              }}
            >
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: 10 }}>Rang</th>
                  <th style={{ padding: 10 }}>Joueur</th>
                  <th style={{ padding: 10 }}>Points</th>
                  <th style={{ padding: 10 }}>Scores exacts</th>
                  <th style={{ padding: 10 }}>Bons résultats</th>
                  <th style={{ padding: 10 }}>Buteurs trouvés</th>
                  <th style={{ padding: 10 }}>Pronos</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((player, index) => (
                  <tr
                    key={player.user_id}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.10)',
                    }}
                  >
                    <td style={{ padding: 10, fontWeight: 800 }}>
                      {index < 3 ? medal(index) : `#${index + 1}`}
                    </td>

                    <td style={{ padding: 10, fontWeight: 700 }}>
                      {player.username}
                    </td>

                    <td style={{ padding: 10, fontWeight: 900 }}>
                      {player.total_points}
                    </td>

                    <td style={{ padding: 10 }}>
                      {player.exact_scores_count}
                    </td>

                    <td style={{ padding: 10 }}>
                      {player.correct_results_count}
                    </td>

                    <td style={{ padding: 10 }}>
                      {player.first_scorers_count}
                    </td>

                    <td style={{ padding: 10 }}>
                      {player.predictions_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
