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

  // Colonnes optionnelles si elles existent dans ta vue leaderboard.
  awards_bonus_points?: number | null;
  awards_total_points?: number | null;
  best_player_points?: number | null;
  top_scorer_points?: number | null;
  top_assist_points?: number | null;
  top_assister_points?: number | null;
  best_goalkeeper_points?: number | null;
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

    if (normalizedLeagues.length > 0) {
      setSelectedLeagueId((current) =>
        current === 'global' ? normalizedLeagues[0].id : current
      );
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

  const rankingStats = useMemo(() => {
    const tournamentPredictionsCount = filteredRows.length * 5;
    const matchPredictionsCount = filteredRows.reduce(
      (sum, player) => sum + (player.predictions_count ?? 0),
      0
    );

    return {
      playersCount: filteredRows.length,
      matchPredictionsCount,
      tournamentPredictionsCount,
      totalPredictionsCount: matchPredictionsCount + tournamentPredictionsCount,
    };
  }, [filteredRows]);

  function medal(index: number) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  }

  function rankLabel(index: number) {
    if (index < 3) return medal(index);
    return `#${index + 1}`;
  }

  function getInitials(username: string) {
    return (username || '?')
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function getAwardPoints(player: LeaderboardRow) {
    return (
      player.awards_bonus_points ??
      player.awards_total_points ??
      (player.best_player_points ?? 0) +
        (player.top_scorer_points ?? 0) +
        (player.top_assist_points ?? player.top_assister_points ?? 0) +
        (player.best_goalkeeper_points ?? 0)
    );
  }

  function getTournamentPredictionPoints(player: LeaderboardRow) {
    return (player.champion_bonus_points ?? 0) + getAwardPoints(player);
  }

  function getMatchPredictionPoints(player: LeaderboardRow) {
    return Math.max(
      0,
      (player.total_points ?? 0) - getTournamentPredictionPoints(player)
    );
  }

  function renderDetailsContent(player: LeaderboardRow) {
    const awardPoints = getAwardPoints(player);
    const topAssistPoints = player.top_assist_points ?? player.top_assister_points ?? 0;

    return (
      <div className="detail-panel">
        <div className="detail-header">
          <div>
            <p className="eyebrow">Détail des points</p>
            <h3>{player.username}</h3>
          </div>

          <div className="total-chip">{player.total_points} pts</div>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <span>⭐ Points matchs</span>
            <strong>{getMatchPredictionPoints(player)} pts</strong>
            <small>{player.predictions_count} prono(s) match</small>
          </div>

          <div className="detail-card">
            <span>🏆 Champion</span>
            <strong>+{player.champion_bonus_points ?? 0} pts</strong>
            <small>Pronostic champion du monde</small>
          </div>

          <div className="detail-card">
            <span>🎖️ Trophées individuels</span>
            <strong>+{awardPoints} pts</strong>
            <small>Joueur, buteur, passeur, gardien</small>
          </div>
        </div>

        <div className="detail-list">
          <div>
            <span>🎯 Scores exacts</span>
            <strong>{player.exact_scores_count}</strong>
          </div>
          <div>
            <span>✅ Bons résultats</span>
            <strong>{player.correct_results_count}</strong>
          </div>
          <div>
            <span>⚽ Premiers buteurs trouvés</span>
            <strong>{player.first_scorers_count}</strong>
          </div>
          <div>
            <span>⭐ Meilleur joueur</span>
            <strong>+{player.best_player_points ?? 0} pts</strong>
          </div>
          <div>
            <span>🥅 Meilleur buteur</span>
            <strong>+{player.top_scorer_points ?? 0} pts</strong>
          </div>
          <div>
            <span>🎁 Meilleur passeur</span>
            <strong>+{topAssistPoints} pts</strong>
          </div>
          <div>
            <span>🧤 Meilleur gardien</span>
            <strong>+{player.best_goalkeeper_points ?? 0} pts</strong>
          </div>
        </div>
      </div>
    );
  }

  function renderDetailsRow(player: LeaderboardRow) {
    return (
      <tr className="details-row">
        <td colSpan={8}>{renderDetailsContent(player)}</td>
      </tr>
    );
  }

  return (
    <main className="container">
      <h1>
        🏆{' '}
        {selectedLeagueId === 'global'
          ? 'Classement global'
          : `Classement — ${selectedLeague?.name || 'Ligue'}`}
      </h1>

      {message && <p className="error">{message}</p>}
      {loading && <p className="small">Chargement du classement...</p>}

      {!loading && (
        <div className="card filter-card">
          <div>
            <p className="eyebrow">Classement</p>
            <h2>Filtrer le classement</h2>
          </div>

          <div className="filter-control">
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
        </div>
      )}

      {!loading && filteredRows.length === 0 && (
        <div className="card">
          <p>Aucun classement disponible pour cette sélection.</p>
        </div>
      )}

      {!loading && podium.length > 0 && (
        <section className="podium-grid">
          {podium.map((player, index) => {
            const isFirst = index === 0;
            const tournamentPoints = getTournamentPredictionPoints(player);

            return (
              <div
                key={player.user_id}
                className={`podium-card ${isFirst ? 'first' : ''}`}
              >
                <div className="podium-medal">{medal(index)}</div>
                <div className="avatar">{getInitials(player.username)}</div>
                <p className="rank-text">#{index + 1}</p>
                <h2>{player.username}</h2>
                <p className="podium-points">{player.total_points} pts</p>

                <div className="podium-mini-stats">
                  <span>🎯 {player.exact_scores_count}</span>
                  <span>✅ {player.correct_results_count}</span>
                  <span>⚽ {player.first_scorers_count}</span>
                </div>

                {tournamentPoints > 0 && (
                  <p className="small">🏆 Pronos tournoi : +{tournamentPoints}</p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {!loading && filteredRows.length > 0 && (
        <section className="card leaderboard-card">
          <div className="leaderboard-title">
            <div>
              <p className="eyebrow">Vue détaillée</p>
              <h2>Classement complet</h2>
            </div>
            <span className="players-count">{rankingStats.playersCount} joueur(s)</span>
          </div>

          <div className="stats-grid">
            <div className="stat-card blue">
              <span className="stat-icon">📋</span>
              <div>
                <p>Total pronos</p>
                <strong>{rankingStats.totalPredictionsCount}</strong>
                <small>Tous pronostics confondus</small>
              </div>
            </div>

            <div className="stat-card green">
              <span className="stat-icon">📅</span>
              <div>
                <p>Pronos matchs</p>
                <strong>{rankingStats.matchPredictionsCount}</strong>
                <small>Pronostics de résultats</small>
              </div>
            </div>

            <div className="stat-card purple">
              <span className="stat-icon">🎯</span>
              <div>
                <p>Pronos tournoi</p>
                <strong>{rankingStats.tournamentPredictionsCount}</strong>
                <small>Champion + trophées</small>
              </div>
            </div>
          </div>

          <div className="desktop-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Joueur</th>
                  <th>⭐ Points</th>
                  <th>🎯 Scores exacts</th>
                  <th>⚽ Buteurs trouvés</th>
                  <th>✅ Bons résultats</th>
                  <th>🏆 Pronos tournoi</th>
                  <th>Détail</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((player, index) => {
                  const isOpen = openedUserId === player.user_id;
                  const tournamentPoints = getTournamentPredictionPoints(player);

                  return (
                    <Fragment key={player.user_id}>
                      <tr className={`rank-row rank-${index + 1}`}>
                        <td className="rank-cell">
                          <span>{rankLabel(index)}</span>
                          {index < 3 && <small>{index + 1}</small>}
                        </td>

                        <td>
                          <div className="player-cell">
                            <div className="avatar small-avatar">{getInitials(player.username)}</div>
                            <strong>{player.username}</strong>
                          </div>
                        </td>

                        <td>
                          <span className="points-box">{player.total_points}</span>
                        </td>

                        <td><span className="metric blue-text">{player.exact_scores_count}</span></td>
                        <td><span className="metric green-text">{player.first_scorers_count}</span></td>
                        <td><span className="metric purple-text">{player.correct_results_count}</span></td>
                        <td><span className="tournament-points">+{tournamentPoints} pts</span></td>

                        <td>
                          <button
                            type="button"
                            className="detail-button"
                            onClick={() => setOpenedUserId(isOpen ? null : player.user_id)}
                          >
                            {isOpen ? 'Masquer' : 'Voir le détail'}
                            <span>{isOpen ? '⌃' : '⌄'}</span>
                          </button>
                        </td>
                      </tr>

                      {isOpen && renderDetailsRow(player)}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mobile-list">
            {filteredRows.map((player, index) => {
              const isOpen = openedUserId === player.user_id;
              const tournamentPoints = getTournamentPredictionPoints(player);

              return (
                <div key={player.user_id} className={`mobile-player-card rank-${index + 1}`}>
                  <div className="mobile-player-header">
                    <div className="rank-badge">{rankLabel(index)}</div>

                    <div className="avatar">{getInitials(player.username)}</div>

                    <div className="mobile-player-name">
                      <strong>{player.username}</strong>
                      <span>{player.total_points} pts</span>
                    </div>
                  </div>

                  <div className="mobile-metrics">
                    <div>
                      <small>Scores exacts</small>
                      <strong>{player.exact_scores_count}</strong>
                    </div>
                    <div>
                      <small>Buteurs</small>
                      <strong>{player.first_scorers_count}</strong>
                    </div>
                    <div>
                      <small>Bons résultats</small>
                      <strong>{player.correct_results_count}</strong>
                    </div>
                    <div>
                      <small>Tournoi</small>
                      <strong>+{tournamentPoints}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="detail-button mobile-button"
                    onClick={() => setOpenedUserId(isOpen ? null : player.user_id)}
                  >
                    {isOpen ? 'Masquer le détail' : 'Voir le détail'}
                    <span>{isOpen ? '⌃' : '⌄'}</span>
                  </button>

                  {isOpen && renderDetailsContent(player)}
                </div>
              );
            })}
          </div>

          <div className="legend-box">
            <span>ℹ️</span>
            <p>
              <strong>Scores exacts</strong> : nombre de scores exacts trouvés ·{' '}
              <strong>Buteurs trouvés</strong> : nombre de premiers buteurs trouvés ·{' '}
              <strong>Bons résultats</strong> : nombre de bons résultats issus du match ·{' '}
              <strong>Pronos tournoi</strong> : points bonus champion et trophées.
            </p>
          </div>
        </section>
      )}

      <style jsx>{`
        .filter-card,
        .leaderboard-title,
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-control {
          min-width: min(100%, 360px);
        }

        .eyebrow {
          margin: 0 0 4px 0;
          color: #93c5fd;
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .podium-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          align-items: end;
          margin-top: 24px;
          margin-bottom: 32px;
        }

        .podium-card {
          position: relative;
          overflow: hidden;
          padding: 22px;
          border-radius: 22px;
          text-align: center;
          background:
            radial-gradient(circle at top, rgba(59, 130, 246, 0.28), transparent 34%),
            rgba(15, 23, 42, 0.86);
          border: 1px solid rgba(96, 165, 250, 0.22);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
        }

        .podium-card.first {
          border-color: rgba(250, 204, 21, 0.78);
          transform: scale(1.04);
          box-shadow: 0 0 40px rgba(250, 204, 21, 0.18);
        }

        .podium-medal {
          font-size: 42px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .avatar {
          width: 48px;
          height: 48px;
          margin: 0 auto;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: white;
          font-weight: 900;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(124, 58, 237, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.10);
        }

        .small-avatar {
          width: 38px;
          height: 38px;
          margin: 0;
          font-size: 0.9rem;
        }

        .rank-text {
          margin: 10px 0 4px 0;
          color: #cbd5e1;
          font-weight: 800;
        }

        .podium-card h2 {
          margin: 0 0 8px 0;
        }

        .podium-points {
          margin: 0;
          color: #facc15;
          font-size: 2rem;
          font-weight: 950;
        }

        .podium-mini-stats {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin: 14px 0;
          flex-wrap: wrap;
        }

        .podium-mini-stats span {
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          font-size: 0.82rem;
          font-weight: 800;
        }

        .leaderboard-card {
          border-color: rgba(96, 165, 250, 0.22);
          background:
            radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 28%),
            rgba(15, 23, 42, 0.88);
        }

        .players-count,
        .total-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 8px 12px;
          color: #bfdbfe;
          background: rgba(59, 130, 246, 0.13);
          border: 1px solid rgba(96, 165, 250, 0.25);
          font-weight: 900;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: 18px 0 22px 0;
        }

        .stat-card {
          display: flex;
          gap: 14px;
          align-items: center;
          min-height: 96px;
          padding: 16px;
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.38);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .stat-card.blue { border-color: rgba(59, 130, 246, 0.36); }
        .stat-card.green { border-color: rgba(34, 197, 94, 0.34); }
        .stat-card.purple { border-color: rgba(168, 85, 247, 0.34); }

        .stat-icon {
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          font-size: 1.45rem;
          background: rgba(59, 130, 246, 0.20);
        }

        .stat-card.green .stat-icon { background: rgba(34, 197, 94, 0.20); }
        .stat-card.purple .stat-icon { background: rgba(168, 85, 247, 0.20); }

        .stat-card p,
        .stat-card small {
          margin: 0;
          color: #cbd5e1;
        }

        .stat-card strong {
          display: block;
          margin: 2px 0;
          color: white;
          font-size: 1.85rem;
          line-height: 1;
        }

        .desktop-table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 18px;
        }

        .leaderboard-table {
          width: 100%;
          min-width: 920px;
          border-collapse: separate;
          border-spacing: 0;
          overflow: hidden;
        }

        .leaderboard-table th {
          padding: 16px 14px;
          text-align: left;
          color: #e2e8f0;
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: rgba(2, 6, 23, 0.28);
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
          white-space: nowrap;
        }

        .rank-row td {
          padding: 18px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.32);
        }

        .rank-row:hover td {
          background: rgba(30, 64, 175, 0.18);
        }

        .rank-row.rank-1 td:first-child { box-shadow: inset 5px 0 0 #facc15; }
        .rank-row.rank-2 td:first-child { box-shadow: inset 5px 0 0 #cbd5e1; }
        .rank-row.rank-3 td:first-child { box-shadow: inset 5px 0 0 #fb923c; }

        .rank-cell {
          width: 80px;
          text-align: center;
          font-weight: 950;
        }

        .rank-cell span {
          display: block;
          font-size: 1.3rem;
        }

        .rank-cell small {
          color: #cbd5e1;
          font-weight: 900;
        }

        .player-cell {
          display: flex;
          gap: 12px;
          align-items: center;
          min-width: 160px;
        }

        .points-box {
          display: inline-grid;
          min-width: 54px;
          min-height: 44px;
          place-items: center;
          color: #facc15;
          font-size: 1.25rem;
          font-weight: 950;
          border-radius: 10px;
          border: 1px solid rgba(250, 204, 21, 0.50);
          background: rgba(2, 6, 23, 0.40);
        }

        .metric {
          font-size: 1.18rem;
          font-weight: 950;
        }

        .blue-text { color: #38bdf8; }
        .green-text { color: #4ade80; }
        .purple-text { color: #c084fc; }

        .tournament-points {
          color: #f59e0b;
          font-size: 1.02rem;
          font-weight: 950;
          white-space: nowrap;
        }

        .detail-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 132px;
          padding: 10px 14px;
          border-radius: 12px;
          color: white;
          font-weight: 900;
          border: 1px solid rgba(96, 165, 250, 0.42);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.42), rgba(30, 41, 59, 0.88));
          cursor: pointer;
        }

        .detail-button:hover {
          border-color: rgba(147, 197, 253, 0.78);
          transform: translateY(-1px);
        }

        .details-row td {
          padding: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 23, 0.24);
        }

        .detail-panel {
          margin: 14px;
          padding: 18px;
          border-radius: 18px;
          background:
            radial-gradient(circle at top right, rgba(34, 197, 94, 0.10), transparent 32%),
            rgba(2, 6, 23, 0.48);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }

        .detail-panel h3 {
          margin: 0;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .detail-card {
          padding: 14px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.10);
        }

        .detail-card span,
        .detail-card small {
          display: block;
          color: #cbd5e1;
        }

        .detail-card strong {
          display: block;
          margin: 6px 0;
          font-size: 1.35rem;
          color: white;
        }

        .detail-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
        }

        .detail-list div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.50);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .detail-list span {
          color: #cbd5e1;
        }

        .detail-list strong {
          color: white;
          white-space: nowrap;
        }

        .mobile-list {
          display: none;
        }

        .legend-box {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-top: 18px;
          padding: 14px 16px;
          border-radius: 16px;
          color: #cbd5e1;
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.10);
        }

        .legend-box p {
          margin: 0;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .stats-grid,
          .detail-grid {
            grid-template-columns: 1fr;
          }

          .desktop-table-wrap {
            display: none;
          }

          .mobile-list {
            display: grid;
            gap: 14px;
          }

          .mobile-player-card {
            position: relative;
            overflow: hidden;
            padding: 16px;
            border-radius: 18px;
            background: rgba(15, 23, 42, 0.72);
            border: 1px solid rgba(96, 165, 250, 0.18);
          }

          .mobile-player-card.rank-1 { border-color: rgba(250, 204, 21, 0.62); }
          .mobile-player-card.rank-2 { border-color: rgba(203, 213, 225, 0.52); }
          .mobile-player-card.rank-3 { border-color: rgba(251, 146, 60, 0.52); }

          .mobile-player-header {
            display: grid;
            grid-template-columns: auto auto 1fr;
            gap: 12px;
            align-items: center;
          }

          .rank-badge {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border-radius: 12px;
            color: white;
            font-weight: 950;
            background: rgba(2, 6, 23, 0.42);
            border: 1px solid rgba(255, 255, 255, 0.10);
          }

          .mobile-player-name strong,
          .mobile-player-name span {
            display: block;
          }

          .mobile-player-name span {
            margin-top: 3px;
            color: #facc15;
            font-weight: 950;
            font-size: 1.2rem;
          }

          .mobile-metrics {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin: 14px 0;
          }

          .mobile-metrics div {
            padding: 12px;
            border-radius: 14px;
            background: rgba(2, 6, 23, 0.34);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .mobile-metrics small,
          .mobile-metrics strong {
            display: block;
          }

          .mobile-metrics small {
            color: #cbd5e1;
            font-size: 0.76rem;
          }

          .mobile-metrics strong {
            margin-top: 4px;
            color: white;
            font-size: 1.2rem;
          }

          .mobile-button {
            width: 100%;
          }

          .detail-panel {
            margin: 14px 0 0 0;
            padding: 14px;
          }

          .detail-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .filter-card,
          .leaderboard-title,
          .detail-header {
            align-items: stretch;
          }

          .podium-card.first {
            transform: none;
          }

          .stats-grid {
            gap: 10px;
          }

          .stat-card {
            min-height: auto;
            padding: 14px;
          }

          .stat-icon {
            width: 46px;
            height: 46px;
            flex-basis: 46px;
          }

          .stat-card strong {
            font-size: 1.55rem;
          }

          .mobile-metrics {
            grid-template-columns: 1fr;
          }

          .legend-box {
            display: block;
          }

          .legend-box span {
            display: block;
            margin-bottom: 8px;
          }
        }
      `}</style>
    </main>
  );
}
