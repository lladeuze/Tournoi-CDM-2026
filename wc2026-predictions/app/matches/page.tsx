'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

const phaseLabels: Record<string, string> = {
  group_j1: 'Poules J1',
  group_j2: 'Poules J2',
  group_j3: 'Poules J3',
  round_of_32: '16es de finale',
  round_of_16: '8es de finale',
  quarter: 'Quarts de finale',
  semi: 'Demi-finales',
  final: 'Finale',
};

const flagsByCode: Record<string, string> = {
  MEX: 'mx',
  RSA: 'za',
  KOR: 'kr',
  CZE: 'cz',
  CAN: 'ca',
  BIH: 'ba',
  QAT: 'qa',
  SUI: 'ch',
  BRA: 'br',
  MAR: 'ma',
  HAI: 'ht',
  SCO: 'gb-sct',
  USA: 'us',
  PAR: 'py',
  AUS: 'au',
  TUR: 'tr',
  GER: 'de',
  CUW: 'cw',
  CIV: 'ci',
  ECU: 'ec',
  NED: 'nl',
  JPN: 'jp',
  SWE: 'se',
  TUN: 'tn',
  BEL: 'be',
  EGY: 'eg',
  IRN: 'ir',
  NZL: 'nz',
  ESP: 'es',
  CPV: 'cv',
  KSA: 'sa',
  URU: 'uy',
  FRA: 'fr',
  SEN: 'sn',
  IRQ: 'iq',
  NOR: 'no',
  ARG: 'ar',
  ALG: 'dz',
  AUT: 'at',
  JOR: 'jo',
  POR: 'pt',
  COD: 'cd',
  UZB: 'uz',
  COL: 'co',
  ENG: 'gb-eng',
  CRO: 'hr',
  GHA: 'gh',
  PAN: 'pa',
};

function getFlagUrl(team: Team | null) {
  const code = team?.code?.trim().toUpperCase();
  const flagCode = code ? flagsByCode[code] : null;
  return flagCode ? `https://flagcdn.com/w160/${flagCode}.png` : null;
}

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

  const [openedMatch, setOpenedMatch] = useState<Match | null>(null);
  const [otherPredictions, setOtherPredictions] = useState<OtherPrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setMessage('');

    const { data: userData } = await supabase.auth.getUser();
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

    if (match.first_scoring_team_id === match.home_team_id) return match.home_team;
    if (match.first_scoring_team_id === match.away_team_id) return match.away_team;

    return '-';
  }

  async function openPredictions(match: Match) {
    if (!selectedLeagueId) {
      setMessage('Sélectionne une ligue pour voir les pronos.');
      return;
    }

    setOpenedMatch(match);
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

  function closePredictions() {
    setOpenedMatch(null);
    setOtherPredictions([]);
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
            onChange={(event) => setSelectedLeagueId(event.target.value)}
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
          <p>Aucun match disponible pour cette phase.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredMatches.map((match) => {
            const homeTeam = getTeam(match.home_team_id);
            const awayTeam = getTeam(match.away_team_id);
            const started = hasMatchStarted(match.kickoff_at);

            return (
              <div className="card" key={match.id}>
                <p className="small">
                  {phaseLabels[match.phase] || match.phase} ·{' '}
                  {new Date(match.kickoff_at).toLocaleString('fr-BE')}
                </p>

                <div className="match-header">
                  {renderTeam(homeTeam, match.home_team)}

                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 24,
                      color: '#5eead4',
                    }}
                  >
                    VS
                  </div>

                  {renderTeam(awayTeam, match.away_team)}
                </div>

                <p
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    textAlign: 'center',
                    marginTop: 16,
                  }}
                >
                  Score : {match.home_score ?? '-'} - {match.away_score ?? '-'}
                </p>

                <p className="small">
                  Première équipe qui marque : {getFirstScoringTeam(match)}
                </p>

                <p className="small">
                  Premier buteur : {match.first_scorer || '-'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    marginTop: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="badge">{match.status}</span>

                  {started && (
                    <button
                      type="button"
                      onClick={() => openPredictions(match)}
                    >
                      Voir les pronos
                    </button>
                  )}

                  {!started && (
                    <span className="small">
                      Les pronos des autres seront visibles au coup d’envoi.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openedMatch && (
        <div className="card" style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <h2>
              Pronos - {openedMatch.home_team} vs {openedMatch.away_team}
            </h2>

            <button type="button" onClick={closePredictions}>
              Fermer
            </button>
          </div>

          {loadingPredictions ? (
            <p>Chargement des pronos...</p>
          ) : otherPredictions.length === 0 ? (
            <p>Aucun prono disponible pour cette ligue.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8 }}>Joueur</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Score</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>
                      1ère équipe
                    </th>
                    <th style={{ textAlign: 'left', padding: 8 }}>
                      1er buteur
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {otherPredictions.map((prediction) => (
                    <tr key={prediction.user_id}>
                      <td style={{ padding: 8 }}>
                        {prediction.username || 'Utilisateur'}
                      </td>

                      <td style={{ padding: 8 }}>
                        {prediction.predicted_home_score ?? '-'} -{' '}
                        {prediction.predicted_away_score ?? '-'}
                      </td>

                      <td style={{ padding: 8 }}>
                        {getTeamName(prediction.predicted_first_scoring_team_id)}
                      </td>

                      <td style={{ padding: 8 }}>
                        {prediction.predicted_first_scorer || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
