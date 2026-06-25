'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TournamentAwards from './components/TournamentAwards';

type Team = {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
};

type Player = {
  id: string;
  team_id: string | null;
  name: string;
  active: boolean | null;
  team_abr: string | null;
  position: string | null;
  position_order: number | null;
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
  first_scorer_id: string | null;
  status: 'scheduled' | 'live' | 'finished';
  phase: string;
  match_label: string | null;
};

type TournamentSettings = {
  id: number;
  winner_team_id: string | null;
  updated_at: string | null;
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

const statuses = ['all', 'scheduled', 'live', 'finished'];

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

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateTitle(date: Date) {
  return date.toLocaleDateString('fr-BE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getPositionLabel(position: string | null) {
  if (position === 'ATT') return '⚽ ATT';
  if (position === 'MID') return '🎯 MID';
  if (position === 'DEF') return '🛡 DEF';
  if (position === 'GK') return '🧤 GK';
  return '❔';
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersByMatch, setPlayersByMatch] = useState<Record<string, Player[]>>({});
  const [dirtyMatchIds, setDirtyMatchIds] = useState<Record<string, boolean>>({});
  const [loadingPlayersForMatch, setLoadingPlayersForMatch] = useState<string | null>(null);
  const [openScorerForMatch, setOpenScorerForMatch] = useState<string | null>(null);
  const [playerSearchByMatch, setPlayerSearchByMatch] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings | null>(null);
  const [winnerTeamId, setWinnerTeamId] = useState('');

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

    if (!user) {
      setMessage('Connecte-toi avec ton compte admin.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      setMessage(`Erreur profil : ${profileError.message}`);
      return;
    }

    if (!profile?.is_admin) {
      setMessage('Accès refusé : ton compte n’est pas admin.');
      return;
    }

    setIsAdmin(true);

    const [
      { data: matchesData, error: matchesError },
      { data: teamsData, error: teamsError },
      { data: settingsData, error: settingsError },
    ] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_at', { ascending: true }),
      supabase.from('teams').select('*').order('name', { ascending: true }),
      supabase.from('tournament_settings').select('*').eq('id', 1).maybeSingle(),
    ]);

    if (matchesError) {
      setMessage(`Erreur matchs : ${matchesError.message}`);
      return;
    }

    if (teamsError) {
      setMessage(`Erreur équipes : ${teamsError.message}`);
      return;
    }

    if (settingsError) {
      setMessage(`Erreur paramètres tournoi : ${settingsError.message}`);
      return;
    }

    const teamsById: Record<string, Team> = {};

    (teamsData || []).forEach((team: Team) => {
      teamsById[team.id] = team;
    });

    const loadedMatches = (matchesData || []) as Match[];

    setTeams(teamsById);
    setTournamentSettings(settingsData as TournamentSettings);
    setWinnerTeamId(settingsData?.winner_team_id || '');
    setMatches(loadedMatches);
    setDirtyMatchIds({});

    setSelectedDate((currentDate) => {
      const currentDateKey = toDateKey(currentDate);
      const stillHasMatchesOnCurrentDate = loadedMatches.some((match) => {
        return toDateKey(new Date(match.kickoff_at)) === currentDateKey;
      });

      if (stillHasMatchesOnCurrentDate) return currentDate;

      const firstMatchToEncode =
        loadedMatches.find((match) => match.status !== 'finished') || loadedMatches[0];

      return firstMatchToEncode ? new Date(firstMatchToEncode.kickoff_at) : currentDate;
    });

    const scorerIds = Array.from(
      new Set(
        loadedMatches
          .map((match) => match.first_scorer_id)
          .filter(Boolean)
      )
    ) as string[];

    if (scorerIds.length > 0) {
      const { data: scorerPlayers, error: scorerPlayersError } = await supabase
        .from('players')
        .select('id, team_id, name, active, team_abr, position, position_order')
        .in('id', scorerIds);

      if (scorerPlayersError) {
        setMessage(`Erreur chargement buteurs : ${scorerPlayersError.message}`);
        return;
      }

      setPlayers(scorerPlayers || []);
    } else {
      setPlayers([]);
    }
  }

  const availablePhases = useMemo(() => {
    return Array.from(new Set(matches.map((match) => match.phase).filter(Boolean)));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const q = search.toLowerCase().trim();

    return matches.filter((match) => {
      const homeName = getTeamName(match.home_team_id, match.home_team).toLowerCase();
      const awayName = getTeamName(match.away_team_id, match.away_team).toLowerCase();
      const homeCode = getTeamCode(match.home_team_id).toLowerCase();
      const awayCode = getTeamCode(match.away_team_id).toLowerCase();

      const matchesPhase = phaseFilter === 'all' || match.phase === phaseFilter;

      const matchesStatus =
        statusFilter === 'all' || match.status === statusFilter || dirtyMatchIds[match.id];

      const matchesSearch =
        !q ||
        homeName.includes(q) ||
        awayName.includes(q) ||
        homeCode.includes(q) ||
        awayCode.includes(q);

      return matchesPhase && matchesStatus && matchesSearch;
    });
  }, [matches, phaseFilter, statusFilter, search, teams, dirtyMatchIds]);

  const selectedDateKey = toDateKey(selectedDate);

  const matchesForSelectedDate = useMemo(() => {
    return filteredMatches.filter((match) => {
      return toDateKey(new Date(match.kickoff_at)) === selectedDateKey;
    });
  }, [filteredMatches, selectedDateKey]);

  function getTeamName(teamId: string | null, fallback: string) {
    if (!teamId) return fallback;
    return teams[teamId]?.name || fallback;
  }

  function getTeamCode(teamId: string | null) {
    if (!teamId) return '';
    return teams[teamId]?.code || '';
  }

  function getTeamCodeByName(teamName: string) {
    const normalizedName = teamName.trim().toLowerCase();

    const codeByName: Record<string, string> = {
      mexique: 'MEX',
      'afrique du sud': 'RSA',
      'corée du sud': 'KOR',
      tchéquie: 'CZE',
      canada: 'CAN',
      'bosnie-herzégovine': 'BIH',
      qatar: 'QAT',
      suisse: 'SUI',
      brésil: 'BRA',
      maroc: 'MAR',
      haïti: 'HAI',
      écosse: 'SCO',
      'états-unis': 'USA',
      paraguay: 'PAR',
      australie: 'AUS',
      turquie: 'TUR',
      allemagne: 'GER',
      curaçao: 'CUW',
      "côte d'ivoire": 'CIV',
      équateur: 'ECU',
      'pays-bas': 'NED',
      japon: 'JPN',
      suède: 'SWE',
      tunisie: 'TUN',
      belgique: 'BEL',
      égypte: 'EGY',
      iran: 'IRN',
      'nouvelle-zélande': 'NZL',
      espagne: 'ESP',
      'cap-vert': 'CPV',
      'arabie saoudite': 'KSA',
      uruguay: 'URU',
      france: 'FRA',
      sénégal: 'SEN',
      irak: 'IRQ',
      norvège: 'NOR',
      argentine: 'ARG',
      algérie: 'ALG',
      autriche: 'AUT',
      jordanie: 'JOR',
      portugal: 'POR',
      'rd congo': 'COD',
      ouzbékistan: 'UZB',
      ouzbekistan: 'UZB',
      colombie: 'COL',
      angleterre: 'ENG',
      croatie: 'CRO',
      ghana: 'GHA',
      panama: 'PAN',
    };

    return codeByName[normalizedName] || null;
  }

  function getFlagUrl(team: Team | null, fallbackName: string) {
    const code = team?.code || getTeamCodeByName(fallbackName);
    const flagCode = code ? flagsByCode[code.trim().toUpperCase()] : null;

    return flagCode ? `https://flagcdn.com/w160/${flagCode}.png` : null;
  }

  function getPlayerAbr(player: Player) {
    return player.team_abr || (player.team_id ? teams[player.team_id]?.code : null) || '???';
  }

  function getMatchPlayers(match: Match) {
    return playersByMatch[match.id] || [];
  }

  function getFilteredMatchPlayers(match: Match) {
    const query = (playerSearchByMatch[match.id] || '').toLowerCase().trim();

    return getMatchPlayers(match).filter((player) => {
      const label = `${player.name} ${getPlayerAbr(player)} ${player.position || ''}`;
      return label.toLowerCase().includes(query);
    });
  }

  async function openScorerDropdown(match: Match) {
    if (openScorerForMatch === match.id) {
      setOpenScorerForMatch(null);
      return;
    }

    setOpenScorerForMatch(match.id);

    if (playersByMatch[match.id]) return;

    const teamIds = [match.home_team_id, match.away_team_id].filter(Boolean) as string[];

    if (teamIds.length === 0) {
      setPlayersByMatch((current) => ({
        ...current,
        [match.id]: [],
      }));
      return;
    }

    setLoadingPlayersForMatch(match.id);

    const { data, error } = await supabase
      .from('players')
      .select('id, team_id, name, active, team_abr, position, position_order')
      .in('team_id', teamIds)
      .or('active.eq.true,active.is.null')
      .order('position_order', { ascending: true })
      .order('team_abr', { ascending: true })
      .order('name', { ascending: true })
      .range(0, 200);

    setLoadingPlayersForMatch(null);

    if (error) {
      setMessage(`Erreur joueurs : ${error.message}`);
      return;
    }

    const sortedPlayers = (data || []).sort((a: Player, b: Player) => {
      const orderA = a.position_order ?? 99;
      const orderB = b.position_order ?? 99;

      if (orderA !== orderB) return orderA - orderB;

      const teamA = getPlayerAbr(a);
      const teamB = getPlayerAbr(b);

      if (teamA !== teamB) return teamA.localeCompare(teamB);
      return a.name.localeCompare(b.name);
    });

    setPlayersByMatch((current) => ({
      ...current,
      [match.id]: sortedPlayers,
    }));

    setPlayers((current) => {
      const existingIds = new Set(current.map((player) => player.id));
      const newPlayers = sortedPlayers.filter((player) => !existingIds.has(player.id));
      return [...current, ...newPlayers];
    });
  }

  function editMatch(id: string, field: keyof Match, value: string) {
    setDirtyMatchIds((current) => ({
      ...current,
      [id]: true,
    }));

    setMatches((current) =>
      current.map((match) => {
        if (match.id !== id) return match;

        if (field === 'home_score' || field === 'away_score') {
          return {
            ...match,
            [field]: value === '' ? null : Number(value),
          };
        }

        if (field === 'status') {
          return {
            ...match,
            status: value as Match['status'],
          };
        }

        return {
          ...match,
          [field]: value === '' ? null : value,
        };
      })
    );
  }

  function selectScorer(match: Match, playerId: string) {
    editMatch(match.id, 'first_scorer_id', playerId);
    setOpenScorerForMatch(null);
    setPlayerSearchByMatch((current) => ({
      ...current,
      [match.id]: '',
    }));
  }

  async function updateWinnerTeam() {
    const { error } = await supabase
      .from('tournament_settings')
      .upsert(
        {
          id: 1,
          winner_team_id: winnerTeamId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      setMessage(`Erreur champion officiel : ${error.message}`);
      return;
    }

    setMessage('Champion officiel mis à jour.');
    await load();
  }

  async function saveMatch(match: Match) {
    setMessage('');

    const { data, error } = await supabase
      .from('matches')
      .update({
        home_score: match.home_score,
        away_score: match.away_score,
        first_scoring_team_id: match.first_scoring_team_id || null,
        first_scorer_id: match.first_scorer_id || null,
        status: match.status,
        home_team_id: match.home_team_id || null,
        away_team_id: match.away_team_id || null,
      })
      .eq('id', match.id)
      .select('id, home_score, away_score, first_scoring_team_id, first_scorer_id, status')
      .maybeSingle();

    if (error) {
      setMessage(`Erreur sauvegarde : ${error.message}`);
      return;
    }

    if (!data) {
      setMessage("Aucune ligne modifiée. Vérifie les policies RLS de la table matches ou l'id du match.");
      return;
    }

    setDirtyMatchIds((current) => {
      const next = { ...current };
      delete next[match.id];
      return next;
    });

    setMessage('Résultat sauvegardé. Les points ont été recalculés automatiquement.');
    await load();
  }

  async function syncTheSportsDB() {
    setMessage('Synchronisation en cours...');

    try {
      const response = await fetch('/api/admin/thesportsdb/sync-events');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      setMessage(`Synchronisation terminée : ${result.count} match(s) traité(s).`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur synchronisation TheSportsDB');
    }
  }

  function renderStatusBadge(status: Match['status']) {
    if (status === 'finished') return <span className="badge finished">🏁 Terminé</span>;
    if (status === 'live') return <span className="badge fire">🔴 Live</span>;
    return <span className="badge pending">🟡 À venir</span>;
  }

  function renderMatchCard(match: Match) {
    const homeName = getTeamName(match.home_team_id, match.home_team);
    const awayName = getTeamName(match.away_team_id, match.away_team);
    const homeCode = getTeamCode(match.home_team_id) || getTeamCodeByName(match.home_team) || '---';
    const awayCode = getTeamCode(match.away_team_id) || getTeamCodeByName(match.away_team) || '---';

    const homeTeam = match.home_team_id ? teams[match.home_team_id] : null;
    const awayTeam = match.away_team_id ? teams[match.away_team_id] : null;

    const availablePlayers = getMatchPlayers(match);
    const filteredPlayers = getFilteredMatchPlayers(match);
    const scorerDropdownOpen = openScorerForMatch === match.id;

    const selectedPlayer = match.first_scorer_id
      ? [...players, ...(playersByMatch[match.id] || [])].find(
          (player) => player.id === match.first_scorer_id
        )
      : null;

    const selectedScorerLabel = selectedPlayer
      ? `${selectedPlayer.name} — ${getPlayerAbr(selectedPlayer)}`
      : 'Aucun buteur';

    const cardStateClass =
      match.status === 'finished' ? 'good' : match.status === 'live' ? 'saved' : '';

    return (
      <div className={`card prediction-card ${cardStateClass}`} key={match.id}>
        <div className="prediction-badges">
          {renderStatusBadge(match.status)}

          {dirtyMatchIds[match.id] && (
            <span className="badge fire">⚠️ Modification non sauvegardée</span>
          )}
        </div>

        <p className="small">
          {phaseLabels[match.phase] || match.phase} ·{' '}
          {new Date(match.kickoff_at).toLocaleString('fr-BE')}
        </p>

        {match.match_label && (
          <div
            style={{
              display: 'inline-block',
              margin: '0 auto 14px auto',
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(94,234,212,0.15)',
              border: '1px solid rgba(94,234,212,0.3)',
              color: '#5eead4',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            🏆 {match.match_label}
          </div>
        )}

        <div className="match-header">
          <div className="team-side">
            <div className="team-flag">
              {getFlagUrl(homeTeam, match.home_team) ? (
                <img src={getFlagUrl(homeTeam, match.home_team)!} alt={`Drapeau ${homeName}`} />
              ) : (
                '🏳️'
              )}
            </div>

            <div style={{ fontWeight: 900, fontSize: '1.8rem', letterSpacing: '1px' }}>
              {homeCode}
            </div>

            <div className="team-code">{homeName}</div>
          </div>

          <div style={{ fontWeight: 900, fontSize: 24, color: '#5eead4' }}>VS</div>

          <div className="team-side">
            <div className="team-flag">
              {getFlagUrl(awayTeam, match.away_team) ? (
                <img src={getFlagUrl(awayTeam, match.away_team)!} alt={`Drapeau ${awayName}`} />
              ) : (
                '🏳️'
              )}
            </div>

            <div style={{ fontWeight: 900, fontSize: '1.8rem', letterSpacing: '1px' }}>
              {awayCode}
            </div>

            <div className="team-code">{awayName}</div>
          </div>
        </div>

        <div className="score-box" style={{ justifyContent: 'center', marginBottom: 14 }}>
          <input
            type="number"
            min="0"
            max="30"
            inputMode="numeric"
            placeholder="0"
            value={match.home_score ?? ''}
            onFocus={(e) => {
              if (e.target.value === '0') e.target.value = '';
            }}
            onChange={(e) => editMatch(match.id, 'home_score', e.target.value)}
          />

          <div className="score-separator">-</div>

          <input
            type="number"
            min="0"
            max="30"
            inputMode="numeric"
            placeholder="0"
            value={match.away_score ?? ''}
            onFocus={(e) => {
              if (e.target.value === '0') e.target.value = '';
            }}
            onChange={(e) => editMatch(match.id, 'away_score', e.target.value)}
          />
        </div>

        <div className="compact-row">
          <div>
            <label>Première équipe qui marque</label>
            <select
              value={match.first_scoring_team_id ?? ''}
              onChange={(e) => editMatch(match.id, 'first_scoring_team_id', e.target.value)}
            >
              <option value="">Aucune sélection</option>

              {match.home_team_id && (
                <option value={match.home_team_id}>
                  {homeCode} — {homeName}
                </option>
              )}

              {match.away_team_id && (
                <option value={match.away_team_id}>
                  {awayCode} — {awayName}
                </option>
              )}
            </select>
          </div>

          <div>
            <label>Premier buteur</label>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => openScorerDropdown(match)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(15,23,42,0.9)',
                  color: 'white',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                }}
              >
                {selectedScorerLabel}
                <span style={{ float: 'right' }}>⌄</span>
              </button>

              {scorerDropdownOpen && (
                <div
                  style={{
                    marginTop: 8,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: '#0f172a',
                    borderRadius: 12,
                    padding: 10,
                    maxHeight: 320,
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                  }}
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="Rechercher un joueur..."
                    value={playerSearchByMatch[match.id] || ''}
                    onChange={(e) =>
                      setPlayerSearchByMatch((current) => ({
                        ...current,
                        [match.id]: e.target.value,
                      }))
                    }
                    style={{ marginBottom: 8 }}
                  />

                  {loadingPlayersForMatch === match.id && (
                    <p className="small">Chargement des joueurs...</p>
                  )}

                  <div style={{ maxHeight: 230, overflowY: 'auto', display: 'grid', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => selectScorer(match, '')}
                      style={{
                        textAlign: 'left',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Aucun buteur
                    </button>

                    {filteredPlayers.map((player) => (
                      <button
                        type="button"
                        key={player.id}
                        onClick={() => selectScorer(match, player.id)}
                        style={{
                          textAlign: 'left',
                          background:
                            match.first_scorer_id === player.id
                              ? 'rgba(94, 234, 212, 0.18)'
                              : 'transparent',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          padding: '9px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        {getPositionLabel(player.position)} · {player.name} — {getPlayerAbr(player)}
                      </button>
                    ))}
                  </div>

                  <p className="small" style={{ marginTop: 8 }}>
                    {filteredPlayers.length} joueur(s) affiché(s) sur {availablePlayers.length}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label>Statut</label>
            <select value={match.status} onChange={(e) => editMatch(match.id, 'status', e.target.value)}>
              <option value="scheduled">scheduled</option>
              <option value="live">live</option>
              <option value="finished">finished</option>
            </select>
          </div>
        </div>

        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
            Modifier les équipes du match
          </summary>

          <div className="grid" style={{ marginTop: 12 }}>
            <div>
              <label>Équipe domicile</label>
              <select
                value={match.home_team_id || ''}
                onChange={(e) => editMatch(match.id, 'home_team_id', e.target.value)}
              >
                <option value="">Sélectionner...</option>

                {Object.values(teams).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.code} - {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Équipe extérieure</label>
              <select
                value={match.away_team_id || ''}
                onChange={(e) => editMatch(match.id, 'away_team_id', e.target.value)}
              >
                <option value="">Sélectionner...</option>

                {Object.values(teams).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.code} - {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </details>

        {playersByMatch[match.id] && playersByMatch[match.id].length === 0 && (
          <p className="small error">Aucun joueur trouvé pour ce match.</p>
        )}

        <button style={{ marginTop: 14, width: '100%' }} onClick={() => saveMatch(match)}>
          💾 Sauvegarder résultat
        </button>
      </div>
    );
  }

  function renderDateNavigation() {
    return (
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="secondary"
            onClick={() => setSelectedDate((date) => addDays(date, -1))}
          >
            ◀ Jour précédent
          </button>

          <h2 style={{ margin: 0, textAlign: 'center' }}>{formatDateTitle(selectedDate)}</h2>

          <button
            type="button"
            className="secondary"
            onClick={() => setSelectedDate((date) => addDays(date, 1))}
          >
            Jour suivant ▶
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="container">
      <h1>Admin — Résultats</h1>

      {isAdmin && (
    <Link href="/admin/correction" className="admin-action-btn">
      Correction pronos
    </Link>
  )}
      
      {message && (
        <p
          className={
            message.includes('sauvegardé') ||
            message.includes('recalculés') ||
            message.includes('mis à jour') ||
            message.includes('terminée')
              ? 'success'
              : 'error'
          }
        >
          {message}
        </p>
      )}

      {isAdmin && (
        <>
          <div className="card">
            <h2>⚡ Synchronisation API</h2>

            <p className="small">
              Permet de récupérer automatiquement les scores et statuts depuis TheSportsDB.
              Le premier buteur et la première équipe qui marque restent modifiables manuellement.
            </p>

            <button type="button" onClick={syncTheSportsDB}>
              Synchroniser TheSportsDB
            </button>
          </div>

          <div className="card">
            <h2>Filtres</h2>

            <div className="grid">
              <div>
                <label>Phase</label>
                <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
                  <option value="all">Toutes les phases</option>

                  {availablePhases.map((phase) => (
                    <option key={phase} value={phase}>
                      {phaseLabels[phase] || phase}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Statut</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status === 'all' ? 'Tous les statuts' : status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Recherche équipe</label>
                <input
                  placeholder="Belgique, France, BEL..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {renderDateNavigation()}

          <div className="card">
            <h2>🏆 Champion officiel</h2>

            <p className="small">
              Ce choix déclenche les points bonus du pronostic champion dans le classement.
            </p>

            <select value={winnerTeamId} onChange={(e) => setWinnerTeamId(e.target.value)}>
              <option value="">Aucun champion officiel</option>

              {Object.values(teams).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.code ? `${team.code} — ` : ''}
                  {team.name}
                </option>
              ))}
            </select>

            <button type="button" onClick={updateWinnerTeam} style={{ marginTop: 12 }}>
              Sauvegarder le champion officiel
            </button>

            {tournamentSettings?.winner_team_id && (
              <p className="small" style={{ marginTop: 10 }}>
                Champion actuellement enregistré.
              </p>
            )}
          </div>

          <TournamentAwards />

          {matchesForSelectedDate.length === 0 ? (
            <div className="card">
              <p>Aucun match ne correspond aux filtres pour ce jour-là.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {matchesForSelectedDate.map((match) => renderMatchCard(match))}
            </div>
          )}

          {renderDateNavigation()}
        </>
      )}
    </main>
  );
}
