'use client';

import { useEffect, useMemo, useState } from 'react';import { supabase } from '@/lib/supabase';

type LeaderboardRow = {user_id: string;username: string;total_points: number;predictions_count: number;exact_scores_count: number;correct_results_count: number;first_scorers_count: number;champion_bonus_points: number;};

type League = {id: string;name: string;code: string;};

type LeagueMemberRow = {league_id: string;user_id: string;};

type MyLeagueRow = {league_id: string;leagues: League | League[] | null;};

export default function LeaderboardPage() {const [rows, setRows] = useState<LeaderboardRow[]>([]);const [leagues, setLeagues] = useState<League[]>([]);const [leagueMembers, setLeagueMembers] = useState<LeagueMemberRow[]>([]);const [selectedLeagueId, setSelectedLeagueId] = useState('global');

const [loading, setLoading] = useState(true);const [message, setMessage] = useState('');

useEffect(() => {loadLeaderboard();}, []);

async function loadLeaderboard() {setLoading(true);setMessage('');

const { data: userData, error: userError } = await supabase.auth.getUser();

if (userError) {
  setMessage(`Erreur utilisateur : ${userError.message}`);
  setLoading(false);
  return;
}

const user = userData.user;

if (!user) {
  setMessage('Connecte-toi pour voir le classement.');
  setLoading(false);
  return;
}

const [
  { data: leaderboardData, error: leaderboardError },
  { data: myLeaguesData, error: myLeaguesError },
] = await Promise.all([
  supabase
    .from('leaderboard')
    .select('*')
    .order('total_points', { ascending: false })
    .order('exact_scores_count', { ascending: false })
    .order('correct_results_count', { ascending: false }),

  supabase
    .from('league_members_public')
    .select(
      `
      league_id,
      leagues (
        id,
        name,
        code
      )
    `
    )
    .eq('user_id', user.id),
]);

if (leaderboardError) {
  setMessage(`Erreur classement : ${leaderboardError.message}`);
  setLoading(false);
  return;
}

if (myLeaguesError) {
  setMessage(`Erreur ligues : ${myLeaguesError.message}`);
  setLoading(false);
  return;
}

const normalizedLeagues: League[] = ((myLeaguesData || []) as MyLeagueRow[])
  .map((row) => {
    if (Array.isArray(row.leagues)) {
      return row.leagues[0] || null;
    }

    return row.leagues;
  })
  .filter(Boolean) as League[];

setRows((leaderboardData || []) as LeaderboardRow[]);
setLeagues(normalizedLeagues);

if (normalizedLeagues.length > 0) {
  setSelectedLeagueId(normalizedLeagues[0].id);
} else {
  setSelectedLeagueId('global');
}

const leagueIds = normalizedLeagues.map((league) => league.id);

if (leagueIds.length > 0) {
  
const { data: membersData, error: membersError } = await supabase

.from('league_members_public').select('league_id, user_id').in('league_id', leagueIds);

  if (membersError) {
    setMessage(`Erreur membres ligues : ${membersError.message}`);
    setLoading(false);
    return;
  }

  setLeagueMembers((membersData || []) as LeagueMemberRow[]);
} else {
  setLeagueMembers([]);
}

setLoading(false);

}

const filteredRows = useMemo(() => {if (selectedLeagueId === 'global') return rows;

const allowedUserIds = new Set(
  leagueMembers
    .filter((member) => member.league_id === selectedLeagueId)
    .map((member) => member.user_id)
);

return rows.filter((row) => allowedUserIds.has(row.user_id));

}, [rows, leagueMembers, selectedLeagueId]);

const selectedLeague = useMemo(() => {return leagues.find((league) => league.id === selectedLeagueId) || null;}, [leagues, selectedLeagueId]);

const podium = useMemo(() => filteredRows.slice(0, 3), [filteredRows]);

function medal(index: number) {if (index === 0) return '🥇';if (index === 1) return '🥈';if (index === 2) return '🥉';return '';}

return (🏆{' '}{selectedLeagueId === 'global'? 'Classement global': Classement — ${selectedLeague?.name || 'Ligue'}}

  {message && <p className="error">{message}</p>}
  {loading && <p className="small">Chargement du classement...</p>}

  {!loading && (
    <div className="card">
      <h2>Filtrer le classement</h2>

      <label>Ligue</label>

      <select
        value={selectedLeagueId}
        onChange={(e) => setSelectedLeagueId(e.target.value)}
      >
        {leagues.map((league) => (
          <option key={league.id} value={league.id}>
            🏟️ {league.name}
          </option>
        ))}

        <option value="global">🌍 Classement global</option>
      </select>

      {selectedLeagueId !== 'global' && selectedLeague && (
        <p className="small" style={{ marginTop: 10 }}>
          Code de la ligue : <strong>{selectedLeague.code}</strong>
        </p>
      )}
    </div>
  )}

  {!loading && filteredRows.length === 0 && (
    <div className="card">
      <p>Aucun classement disponible pour cette sélection.</p>
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

            <p className="small">#{index + 1}</p>

            <h2 style={{ marginBottom: 8 }}>{player.username}</h2>

            <p
              style={{
                fontSize: 32,
                fontWeight: 900,
                margin: 0,
              }}
            >
              {player.total_points} pts
            </p>

            {player.champion_bonus_points > 0 && (
              <p className="small" style={{ marginTop: 8 }}>
                🏆 Bonus champion : +{player.champion_bonus_points}
              </p>
            )}

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

  {!loading && filteredRows.length > 0 && (
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
              <th style={{ padding: 10 }}>Champion</th>
              <th style={{ padding: 10 }}>Scores exacts</th>
              <th style={{ padding: 10 }}>Bons résultats</th>
              <th style={{ padding: 10 }}>Buteurs trouvés</th>
              <th style={{ padding: 10 }}>Pronos</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((player, index) => (
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

                <td style={{ padding: 10, fontWeight: 800 }}>
                  +{player.champion_bonus_points ?? 0}
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

);}