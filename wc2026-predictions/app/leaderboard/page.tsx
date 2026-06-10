'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SkeletonCards } from '@/app/components/Skeleton';
import { IconCrown } from '@/app/components/icons';

type LeaderboardRow = {
  user_id: string;
  username: string;
  total_points: number;
  predictions_count: number;
  exact_scores_count: number;
  correct_results_count: number;
  first_scorers_count: number;
  champion_bonus_points: number;
};

type League = {
  id: string;
  name: string;
  code: string;
};

type LeagueMemberRow = {
  league_id: string;
  user_id: string;
};

type MyLeagueRow = {
  league_id: string;
  leagues: League | League[] | null;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueMembers, setLeagueMembers] = useState<LeagueMemberRow[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState('global');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    setMessage('');

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

    setCurrentUserId(user.id);

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
  .from('league_members_public')
  .select('league_id, user_id')
  .in('league_id', leagueIds);

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

  const filteredRows = useMemo(() => {
    if (selectedLeagueId === 'global') return rows;

    const allowedUserIds = new Set(
      leagueMembers
        .filter((member) => member.league_id === selectedLeagueId)
        .map((member) => member.user_id)
    );

    return rows.filter((row) => allowedUserIds.has(row.user_id));
  }, [rows, leagueMembers, selectedLeagueId]);

  const selectedLeague = useMemo(() => {
    return leagues.find((league) => league.id === selectedLeagueId) || null;
  }, [leagues, selectedLeagueId]);

  const podium = useMemo(() => filteredRows.slice(0, 3), [filteredRows]);

  const rankColors = ['#f5b519', '#c0c7d1', '#cd7f44']; // gold / silver / bronze

  function RankBadge({ index, size = 30 }: { index: number; size?: number }) {
    const top = index < 3;
    const color = top ? rankColors[index] : 'var(--surface-2)';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '50%',
          fontSize: size * 0.42,
          fontWeight: 900,
          color: top ? '#231a00' : 'var(--muted)',
          background: top
            ? `radial-gradient(circle at 30% 25%, #fff6, transparent 60%), ${color}`
            : color,
          border: top ? 'none' : '1px solid var(--border)',
          boxShadow: top ? '0 4px 12px rgba(0,0,0,0.25)' : 'none',
        }}
      >
        {index + 1}
      </span>
    );
  }

  return (
    <main className="container">
      <h1>
        {selectedLeagueId === 'global'
          ? 'Classement global'
          : `Classement — ${selectedLeague?.name || 'Ligue'}`}
      </h1>

      {message && <p className="error">{message}</p>}
      {loading && (
        <div style={{ marginTop: 16 }}>
          <SkeletonCards count={3} />
        </div>
      )}

      {!loading && (
        <div className="card" style={{ padding: 14 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span
              className="small"
              style={{ flexShrink: 0, fontWeight: 700 }}
            >
              Ligue
            </span>
            <select
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value)}
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}

              <option value="global">Classement global</option>
            </select>
          </div>

          {selectedLeagueId !== 'global' && selectedLeague && (
            <p className="small" style={{ margin: '10px 0 0' }}>
              Code : <strong>{selectedLeague.code}</strong>
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
        <section className="podium">
          {[
            { p: podium[1], rank: 2 },
            { p: podium[0], rank: 1 },
            { p: podium[2], rank: 3 },
          ]
            .filter((x) => x.p)
            .map(({ p, rank }) => (
              <div
                className="podium-col"
                key={p.user_id}
                style={{ animationDelay: `${rank * 0.06}s` }}
              >
                {rank === 1 && (
                  <span className="podium-crown">
                    <IconCrown size={22} />
                  </span>
                )}
                <div
                  className="podium-name"
                  style={
                    p.user_id === currentUserId
                      ? { color: 'var(--primary)' }
                      : undefined
                  }
                >
                  {p.username}
                </div>
                <div className="podium-pts">{p.total_points} pts</div>
                <div className={`podium-step r${rank}`}>{rank}</div>
              </div>
            ))}
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
                <tr>
                  <th>Rang</th>
                  <th>Joueur</th>
                  <th>Points</th>
                  <th className="lb-extra">Champion</th>
                  <th className="lb-extra">Scores exacts</th>
                  <th className="lb-extra">Bons résultats</th>
                  <th className="lb-extra">Buteurs</th>
                  <th className="lb-extra">Pronos</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((player, index) => (
                  <tr
                    key={player.user_id}
                    className={player.user_id === currentUserId ? 'lb-me' : ''}
                  >
                    <td style={{ fontWeight: 800 }}>
                      <RankBadge index={index} size={26} />
                    </td>

                    <td style={{ fontWeight: 700 }}>
                      {player.username}
                      {player.user_id === currentUserId && (
                        <span
                          className="badge"
                          style={{ marginLeft: 8, padding: '2px 8px' }}
                        >
                          toi
                        </span>
                      )}
                    </td>

                    <td style={{ fontWeight: 900, color: 'var(--primary)' }}>
                      {player.total_points}
                    </td>

                    <td className="lb-extra" style={{ fontWeight: 800 }}>
                      +{player.champion_bonus_points ?? 0}
                    </td>

                    <td className="lb-extra">{player.exact_scores_count}</td>

                    <td className="lb-extra">{player.correct_results_count}</td>

                    <td className="lb-extra">{player.first_scorers_count}</td>

                    <td className="lb-extra">{player.predictions_count}</td>
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
