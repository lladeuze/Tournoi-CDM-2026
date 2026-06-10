'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { teamFlagUrl as getFlagUrl } from '@/lib/flags';
import { phaseLabels } from '@/lib/phases';
import Countdown from '@/app/components/Countdown';
import EmptyState from '@/app/components/EmptyState';
import OtherPredictionsList from '@/app/components/OtherPredictionsList';
import { IconMatches } from '@/app/components/icons';

const statusMeta: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'À venir', cls: 'locked' },
  live: { label: 'En direct', cls: 'fire' },
  finished: { label: 'Terminé', cls: 'finished' },
};

type Team = {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
};

type League = {
  id: string;
  name: string;
  code: string | null;
};

type Match = {
  id: string;
  home_team: string;
  away_team: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  first_scoring_team_id: string | null;
  first_scorer: string | null;
  status: string;
  match_label: string | null;
  phase: string;
};

type OtherPrediction = {
  user_id: string;
  username: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_first_scoring_team_id: string | null;
  predicted_first_scorer: string | null;
  predicted_first_scorer_id: string | null;
};

function hasMatchStarted(kickoffAt: string) {
  return new Date(kickoffAt).getTime() <= Date.now();
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [message, setMessage] = useState('');

  const [openedMatchId, setOpenedMatchId] = useState<string | null>(null);
  const [otherPredictions, setOtherPredictions] = useState<OtherPrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

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

    const [
      { data: matchesData, error: matchesError },
      { data: teamsData, error: teamsError },
    ] = await Promise.all([
      supabase
        .from('matches')
        .select(`
          id,
          home_team,
          away_team,
          home_team_id,
          away_team_id,
          kickoff_at,
          home_score,
          away_score,
          first_scoring_team_id,
          first_scorer,
          status,
          match_label,
          phase
        `)
        .order('kickoff_at', { ascending: true }),

      supabase
        .from('teams')
        .select('id, name, code, logo_url')
        .order('name', { ascending: true }),
    ]);

    if (matchesError) {
      setMessage(`Erreur matchs : ${matchesError.message}`);
      return;
    }

    if (teamsError) {
      setMessage(`Erreur équipes : ${teamsError.message}`);
      return;
    }

    if (user) {
      const { data: leagueMembersData, error: leaguesError } = await supabase
        .from('league_members')
        .select(`
          league_id,
          leagues (
            id,
            name,
            code
          )
        `)
        .eq('user_id', user.id);

      if (leaguesError) {
        setMessage(`Erreur ligues : ${leaguesError.message}`);
        return;
      }

      const myLeagues =
        leagueMembersData
          ?.map((row: any) => row.leagues)
          .filter(Boolean) || [];

      setLeagues(myLeagues);

      if (myLeagues.length > 0) {
        setSelectedLeagueId(myLeagues[0].id);
      }
    }

    const teamsById: Record<string, Team> = {};

    (teamsData || []).forEach((team: Team) => {
      teamsById[team.id] = team;
    });

    setTeams(teamsById);
    setMatches((matchesData || []) as Match[]);
  }

  const filteredMatches = useMemo(() => {
    if (phaseFilter === 'all') return matches;
    return matches.filter((match) => match.phase === phaseFilter);
  }, [matches, phaseFilter]);

  function getTeam(teamId: string | null) {
    if (!teamId) return null;
    return teams[teamId] || null;
  }

  function getTeamName(teamId: string | null) {
    if (!teamId) return '-';
    return teams[teamId]?.name || '-';
  }

  function getFirstScoringTeam(match: Match) {
    if (!match.first_scoring_team_id) return '-';

    const firstTeam = getTeam(match.first_scoring_team_id);

    if (firstTeam) return firstTeam.name;

    if (match.first_scoring_team_id === match.home_team_id) {
      return match.home_team;
    }

    if (match.first_scoring_team_id === match.away_team_id) {
      return match.away_team;
    }

    return '-';
  }

  async function togglePredictions(match: Match) {
    if (openedMatchId === match.id) {
      setOpenedMatchId(null);
      setOtherPredictions([]);
      setLoadingPredictions(false);
      return;
    }

    if (!selectedLeagueId) {
      setMessage(
        'Aucune ligue sélectionnée. Vérifie que tu appartiens bien à une ligue.'
      );
      return;
    }

    setOpenedMatchId(match.id);
    setOtherPredictions([]);
    setLoadingPredictions(true);
    setMessage('');

    const { data, error } = await supabase.rpc(
      'get_match_predictions_for_league',
      {
        p_match_id: match.id,
        p_league_id: selectedLeagueId,
      }
    );

    setLoadingPredictions(false);

    if (error) {
      setMessage(`Erreur pronos : ${error.message}`);
      return;
    }

    setOtherPredictions((data || []) as OtherPrediction[]);
  }

  function renderTeam(team: Team | null, fallbackName: string) {
    const flagUrl = getFlagUrl(team);

    return (
      <div className="team-side">
        <div className="team-flag">
          {flagUrl ? (
            <img
              src={flagUrl}
              alt={`Drapeau ${team?.name || fallbackName}`}
              style={{
                width: 72,
                height: 48,
                objectFit: 'cover',
                borderRadius: 8,
              }}
            />
          ) : (
            <span style={{ fontSize: 36 }}>🏳️</span>
          )}
        </div>

        <div
          style={{
            fontWeight: 900,
            fontSize: '1.5rem',
            letterSpacing: '1px',
          }}
        >
          {team?.code || '---'}
        </div>

        <div className="team-code">{team?.name || fallbackName}</div>
      </div>
    );
  }

  return (
    <main className="container">
      <h1>Matchs</h1>

      {message && <p className="error">{message}</p>}

      <div className="card">
        <h2>Filtres</h2>

        <label>Phase</label>
        <select
          value={phaseFilter}
          onChange={(event) => setPhaseFilter(event.target.value)}
        >
          <option value="all">Toutes les phases</option>
          <option value="group_j1">Poules J1</option>
          <option value="group_j2">Poules J2</option>
          <option value="group_j3">Poules J3</option>
          <option value="round_of_32">16es de finale</option>
          <option value="round_of_16">8es de finale</option>
          <option value="quarter">Quarts de finale</option>
          <option value="semi">Demi-finales</option>
          <option value="final">Finale</option>
        </select>

        <div style={{ marginTop: 16 }}>
          <label>Ligue</label>
          <select
            value={selectedLeagueId}
            onChange={(event) => {
              setSelectedLeagueId(event.target.value);
              setOpenedMatchId(null);
              setOtherPredictions([]);
            }}
          >
            {leagues.length === 0 ? (
              <option value="">Aucune ligue disponible</option>
            ) : (
              leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconMatches size={32} />}
            title="Aucun match pour ce filtre"
          >
            Essaie une autre phase ou réinitialise la recherche.
          </EmptyState>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredMatches.map((match) => {
            const homeTeam = getTeam(match.home_team_id);
            const awayTeam = getTeam(match.away_team_id);
            const started = hasMatchStarted(match.kickoff_at);
            const isOpen = openedMatchId === match.id;

            return (
              <div key={match.id} style={{ display: 'grid', gap: 8 }}>
                <div className="card">
                  <div className="admin-match-head">
                    <span
                      className={`badge ${statusMeta[match.status]?.cls || ''}`}
                    >
                      {statusMeta[match.status]?.label || match.status}
                    </span>
                    <span className="small">
                      {phaseLabels[match.phase] || match.phase} ·{' '}
                      {new Date(match.kickoff_at).toLocaleString('fr-BE')}
                    </span>
                  </div>

                  <div className="match-header">
                    {renderTeam(homeTeam, match.home_team)}

                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 13,
                        letterSpacing: '0.08em',
                        color: 'var(--muted)',
                        padding: '6px 10px',
                        borderRadius: 999,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      VS
                    </div>

                    {renderTeam(awayTeam, match.away_team)}
                  </div>

                  {match.home_score !== null && match.away_score !== null ? (
                    <>
                      <div className="scoreboard">
                        <span />
                        <span className="sb-score">
                          <span
                            className={`sb-num${
                              match.home_score > match.away_score ? ' win' : ''
                            }`}
                          >
                            {match.home_score}
                          </span>
                          <span className="sb-sep">–</span>
                          <span
                            className={`sb-num${
                              match.away_score > match.home_score ? ' win' : ''
                            }`}
                          >
                            {match.away_score}
                          </span>
                        </span>
                        <span />
                      </div>

                      <p className="small" style={{ textAlign: 'center' }}>
                        1ʳᵉ équipe : {getFirstScoringTeam(match)} · 1ᵉʳ buteur :{' '}
                        {match.first_scorer || '—'}
                      </p>
                    </>
                  ) : started ? (
                    <p className="sb-pending" style={{ margin: '14px 0 6px' }}>
                      Match en cours…
                    </p>
                  ) : (
                    <p style={{ textAlign: 'center', margin: '12px 0 4px' }}>
                      <Countdown kickoffAt={match.kickoff_at} />
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      marginTop: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    {started ? (
                      <button
                        type="button"
                        onClick={() => togglePredictions(match)}
                      >
                        {isOpen ? 'Masquer les pronos' : 'Voir les pronos'}
                      </button>
                    ) : (
                      <span className="small">
                        Les pronos des autres seront visibles au coup d’envoi.
                      </span>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="card">
                    <h2>
                      Pronos - {match.home_team} vs {match.away_team}
                    </h2>

                    {loadingPredictions ? (
                      <p className="small">Chargement des pronos...</p>
                    ) : (
                      <OtherPredictionsList
                        predictions={otherPredictions}
                        teamName={getTeamName}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
