'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type LeaderboardRow = {
  user_id: string;
  username: string;
  total_points: number;
  predictions_count: number;
  exact_scores_count: number;
  correct_results_count: number;
  first_scorers_count: number;
  champion_bonus_points: number;
  best_player_points?: number | null;
  top_scorer_points?: number | null;
  top_assist_points?: number | null;
  best_goalkeeper_points?: number | null;
  tournament_bonus_points?: number | null;
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
  const [openedUserId, setOpenedUserId] = useState<string | null>(null);

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
        if (Array.isArray(row.leagues)) return row.leagues[0] || null;
        return row.leagues;
      })
      .filter(Boolean) as League[];

    setRows((leaderboardData || []) as LeaderboardRow[]);
    setLeagues(normalizedLeagues);
    setSelectedLeagueId(normalizedLeagues.length > 0 ? normalizedLeagues[0].id : 'global');

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

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.points += row.total_points || 0;
        acc.matchPronos += row.predictions_count || 0;
        acc.tournamentPronos += getTournamentPredictionCount(row);
        return acc;
      },
      { points: 0, matchPronos: 0, tournamentPronos: 0 }
    );
  }, [filteredRows]);

  function medal(index: number) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  }

  function getTournamentPoints(row: LeaderboardRow) {
    return (
      row.tournament_bonus_points ??
      (row.champion_bonus_points || 0) +
        (row.best_player_points || 0) +
        (row.top_scorer_points || 0) +
        (row.top_assist_points || 0) +
        (row.best_goalkeeper_points || 0)
    );
  }

  function getTournamentPredictionCount(row: LeaderboardRow) {
    let count = 0;

    if ((row.champion_bonus_points || 0) > 0) count += 1;
    if ((row.best_player_points || 0) > 0) count += 1;
    if ((row.top_scorer_points || 0) > 0) count += 1;
    if ((row.top_assist_points || 0) > 0) count += 1;
    if ((row.best_goalkeeper_points || 0) > 0) count += 1;

    return count;
  }

  function toggleDetail(userId: string) {
    setOpenedUserId((current) => (current === userId ? null : userId));
  }

  return (
    <main className="container">
      <style jsx>{`
        .leaderboard-card {
          overflow: hidden;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 22px;
        }

        .summary-box {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 23, 42, 0.72);
          border-radius: 16px;
          padding: 14px 16px;
        }

        .summary-label {
          color: #bfdbfe;
          font-size: 0.88rem;
          margin-bottom: 6px;
        }

        .summary-value {
          color: white;
          font-size: 1.6rem;
          font-weight: 900;
          line-height: 1;
        }

        .table-scroll {
          overflow-x: auto;
          overflow-y: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          -webkit-overflow-scrolling: touch;
        }

        .leaderboard-table {
          width: 100%;
          min-width: 980px;
          border-collapse: separate;
          border-spacing: 0;
        }

        .leaderboard-table th {
          position: sticky;
          top: 0;
          z-index: 3;
          background: #071527;
          color: #facc15;
          text-align: left;
          font-size: 0.78rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 14px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
          white-space: nowrap;
        }

        .leaderboard-table td {
          padding: 14px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(8, 20, 36, 0.92);
          white-space: nowrap;
          vertical-align: middle;
        }

        .leaderboard-table tbody tr:hover td {
          background: rgba(15, 35, 61, 0.96);
        }

        .sticky-rank {
          position: sticky;
          left: 0;
          z-index: 2;
          width: 78px;
          min-width: 78px;
          text-align: center;
          box-shadow: 10px 0 16px rgba(0, 0, 0, 0.18);
        }

        .sticky-player {
          position: sticky;
          left: 78px;
          z-index: 2;
          width: 180px;
          min-width: 180px;
          box-shadow: 10px 0 16px rgba(0, 0, 0, 0.18);
        }

        th.sticky-rank,
        th.sticky-player {
          z-index: 5;
          background: #071527;
        }

        td.sticky-rank,
        td.sticky-player {
          background: #081a2f;
        }

        .rank-badge {
          font-weight: 900;
          font-size: 1rem;
        }

        .player-name {
          font-weight: 900;
          color: white;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        .points-pill-leaderboard {
          display: inline-flex;
          min-width: 48px;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid rgba(250, 204, 21, 0.58);
          color: #facc15;
          font-weight: 950;
          font-size: 1.05rem;
          background: rgba(250, 204, 21, 0.08);
        }

        .stat-blue {
          color: #38bdf8;
          font-weight: 900;
        }

        .stat-green {
          color: #4ade80;
          font-weight: 900;
        }

        .stat-purple {
          color: #c084fc;
          font-weight: 900;
        }

        .stat-gold {
          color: #facc15;
          font-weight: 900;
        }

        .detail-row td {
          background: rgba(2, 10, 22, 0.96) !important;
          white-space: normal;
        }

        .detail-panel {
          display: grid;
          grid-template-columns: repeat(5, minmax(130px, 1fr));
          gap: 10px;
        }

        .detail-item {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 12px;
          background: rgba(15, 23, 42, 0.82);
        }

        .detail-title {
          color: #bfdbfe;
          font-size: 0.78rem;
          margin-bottom: 5px;
        }

        .detail-value {
          font-size: 1.1rem;
          font-weight: 900;
        }

        .table-hint {
          display: none;
        }

        @media (max-width: 760px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }

          .table-hint {
            display: block;
            margin: -6px 0 12px;
            color: #bfdbfe;
            font-size: 0.85rem;
          }

          .leaderboard-table {
            min-width: 900px;
          }

          .sticky-rank {
            width: 58px;
            min-width: 58px;
          }

          .sticky-player {
            left: 58px;
            width: 132px;
            min-width: 132px;
          }

          .player-name {
            max-width: 104px;
          }

          .leaderboard-table th,
          .leaderboard-table td {
            padding: 12px 10px;
            font-size: 0.9rem;
          }

          .detail-panel {
            grid-template-columns: repeat(2, minmax(120px, 1fr));
          }
        }
      `}</style>

      <h1>
        🏆{' '}
        {selectedLeagueId === 'global'
          ? 'Classement global'
          : `Classement — ${selectedLeague?.name || 'Ligue'}`}
      </h1>

      {message && <p className="error">{message}</p>}
      {loading && <p className="small">Chargement du classement...</p>}

      {!loading && (
        <div className="card">
          <h2>Filtrer le classement</h2>

          <label>Ligue</label>

          <select
            value={selectedLeagueId}
            onChange={(e) => {
              setSelectedLeagueId(e.target.value);
              setOpenedUserId(null);
            }}
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

      {!loading && filteredRows.length > 0 && (
        <section className="card leaderboard-card">
          <h2>Classement complet</h2>

          <div className="summary-grid">
            <div className="summary-box">
              <div className="summary-label">Total points</div>
              <div className="summary-value">{totals.points}</div>
            </div>

            <div className="summary-box">
              <div className="summary-label">Pronos matchs</div>
              <div className="summary-value">{totals.matchPronos}</div>
            </div>

            <div className="summary-box">
              <div className="summary-label">Pronos tournoi gagnants</div>
              <div className="summary-value">{totals.tournamentPronos}</div>
            </div>
          </div>

          <p className="table-hint">Glisse le tableau vers la gauche/droite pour voir toutes les colonnes.</p>

          <div className="table-scroll">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="sticky-rank">Rang</th>
                  <th className="sticky-player">Joueur</th>
                  <th>⭐ Points</th>
                  <th>🎯 Scores exacts</th>
                  <th>⚽ Buteurs trouvés</th>
                  <th>✅ Bons résultats</th>
                  <th>🏆 Pronos tournoi</th>
                  <th>📋 Pronos matchs</th>
                  <th>Détail</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((player, index) => {
                  const isOpen = openedUserId === player.user_id;
                  const tournamentPoints = getTournamentPoints(player);

                  return (
                    <FragmentRow
                      key={player.user_id}
                      player={player}
                      index={index}
                      isOpen={isOpen}
                      tournamentPoints={tournamentPoints}
                      medal={medal}
                      toggleDetail={toggleDetail}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

type FragmentRowProps = {
  player: LeaderboardRow;
  index: number;
  isOpen: boolean;
  tournamentPoints: number;
  medal: (index: number) => string;
  toggleDetail: (userId: string) => void;
};

function FragmentRow({
  player,
  index,
  isOpen,
  tournamentPoints,
  medal,
  toggleDetail,
}: FragmentRowProps) {
  return (
    <>
      <tr>
        <td className="sticky-rank">
          <span className="rank-badge">{medal(index)}</span>
        </td>

        <td className="sticky-player">
          <div className="player-name">{player.username}</div>
        </td>

        <td>
          <span className="points-pill-leaderboard">{player.total_points}</span>
        </td>

        <td>
          <span className="stat-blue">{player.exact_scores_count}</span>
        </td>

        <td>
          <span className="stat-green">{player.first_scorers_count}</span>
        </td>

        <td>
          <span className="stat-purple">{player.correct_results_count}</span>
        </td>

        <td>
          <span className="stat-gold">+{tournamentPoints} pts</span>
        </td>

        <td>{player.predictions_count}</td>

        <td>
          <button type="button" className="secondary" onClick={() => toggleDetail(player.user_id)}>
            {isOpen ? 'Masquer' : 'Voir le détail'}
          </button>
        </td>
      </tr>

      {isOpen && (
        <tr className="detail-row">
          <td className="sticky-rank" />
          <td className="sticky-player">
            <strong>Détail</strong>
          </td>
          <td colSpan={7}>
            <div className="detail-panel">
              <div className="detail-item">
                <div className="detail-title">Champion</div>
                <div className="detail-value">+{player.champion_bonus_points ?? 0} pts</div>
              </div>

              <div className="detail-item">
                <div className="detail-title">Meilleur joueur</div>
                <div className="detail-value">+{player.best_player_points ?? 0} pts</div>
              </div>

              <div className="detail-item">
                <div className="detail-title">Meilleur buteur</div>
                <div className="detail-value">+{player.top_scorer_points ?? 0} pts</div>
              </div>

              <div className="detail-item">
                <div className="detail-title">Meilleur passeur</div>
                <div className="detail-value">+{player.top_assist_points ?? 0} pts</div>
              </div>

              <div className="detail-item">
                <div className="detail-title">Meilleur gardien</div>
                <div className="detail-value">+{player.best_goalkeeper_points ?? 0} pts</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
