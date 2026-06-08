'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Team = {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
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

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setMessage('');

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

                <span className="badge">{match.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
