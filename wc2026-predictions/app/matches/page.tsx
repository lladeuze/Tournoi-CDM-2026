'use client';

import { useEffect, useState } from 'react';
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
  first_scorer: string | null;
  status: string;
  match_label: string | null;
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

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [
      { data: matchesData },
      { data: teamsData },
    ] = await Promise.all([
      supabase
        .from('matches')
        .select('*')
        .order('kickoff_at', { ascending: true }),

      supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true }),
    ]);

    const teamsById: Record<string, Team> = {};

    (teamsData || []).forEach((team: Team) => {
      teamsById[team.id] = team;
    });

    setTeams(teamsById);
    setMatches((matchesData || []) as Match[]);
  }

  function getTeam(teamId: string | null) {
    if (!teamId) return null;
    return teams[teamId] || null;
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

        <div className="team-code">
          {team?.name || fallbackName}
        </div>
      </div>
    );
  }

  return (
    <main className="container">
      <h1>Matchs</h1>

      <div style={{ display: 'grid', gap: 16 }}>
        {matches.map((match) => {
          const homeTeam = getTeam(match.home_team_id);
          const awayTeam = getTeam(match.away_team_id);

          return (
            <div className="card" key={match.id}>
              <p className="small">
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
                Premier buteur : {match.first_scorer || '-'}
              </p>

              <span className="badge">{match.status}</span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
