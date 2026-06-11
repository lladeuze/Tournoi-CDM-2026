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

    setTeams(teamsById);
    setTournamentSettings(settingsData as TournamentSettings);
    setWinnerTeamId(settingsData?.winner_team_id || '');
    setMatches(matchesData || []);
    setDirtyMatchIds({});

    const scorerIds = Array.from(
      new Set(
        (matchesData || [])
          .map((match: Match) => match.first_scorer_id)
          .filter(Boolean)
      )
    ) as string[];

    if (scorerIds.length > 0) {
      const { data: scorerPlayers, error: scorerPlayersError } = await supabase
        .from('players')
        .select('id, team_id, name, active, team_abr')
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

      const matchesPhase = phaseFilter === 'all' || match.phase === phaseFilter;

      const matchesStatus =
        statusFilter === 'all' || match.status === statusFilter || dirtyMatchIds[match.id];

      const matchesSearch = !q || homeName.includes(q) || awayName.includes(q);

      return matchesPhase && matchesStatus && matchesSearch;
    });
  }, [matches, phaseFilter, statusFilter, search, teams, dirtyMatchIds]);

  function getTeamName(teamId: string | null, fallback: string) {
    if (!teamId) return fallback;
    return teams[teamId]?.name || fallback;
  }

  function getTeamCode(teamId: string | null) {
    if (!teamId) return '';
    return teams[teamId]?.code || '';
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
      const label = `${player.name} ${getPlayerAbr(player)}`;
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
      .select('id, team_id, name, active, team_abr')
      .in('team_id', teamIds)
      .or('active.eq.true,active.is.null')
      .order('team_abr', { ascending: true })
      .order('name', { ascending: true })
      .range(0, 200);

    setLoadingPlayersForMatch(null);

    if (error) {
      setMessage(`Erreur joueurs : ${error.message}`);
      return;
    }

    const sortedPlayers = (data || []).sort((a: Player, b: Player) => {
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
      setMessage(
        "Aucune ligne modifiée. Vérifie les policies RLS de la table matches ou l'id du match."
      );
      return;
    }

    setMessage('Résultat sauvegardé. Les points ont été recalculés automatiquement.');
    await load();
  }

  return (
    <main className="container">
      <h1>Admin — Résultats</h1>

      {message && (
        <p
          className={
            message.includes('sauvegardé') ||
            message.includes('recalculés') ||
            message.includes('mis à jour')
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
                  placeholder="Belgique, France..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

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

          {filteredMatches.map((match) => {
            const homeName = getTeamName(match.home_team_id, match.home_team);
            const awayName = getTeamName(match.away_team_id, match.away_team);
            const homeCode = getTeamCode(match.home_team_id);
            const awayCode = getTeamCode(match.away_team_id);

            const availablePlayers = getMatchPlayers(match);
            const filteredPlayers = getFilteredMatchPlayers(match);
            const scorerDropdownOpen = openScorerForMatch === match.id;

            const selectedPlayer = match.first_scorer_id
              ? [...players, ...(playersByMatch[match.id] || [])].find(
                  (player) => player.id === match.first_scorer_id
                )
              : null;

            return (
              <div className="card" key={match.id}>
                <p className="small">
                  {phaseLabels[match.phase] || match.phase} ·{' '}
                  {new Date(match.kickoff_at).toLocaleString('fr-BE')}
                </p>

                {dirtyMatchIds[match.id] && (
                  <p className="small" style={{ color: '#facc15', fontWeight: 700 }}>
                    Modification en cours — n’oublie pas de sauvegarder.
                  </p>
                )}

                {match.match_label && (
                  <div
                    style={{
                      display: 'inline-block',
                      marginBottom: 10,
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

                <h2>
                  {homeCode ? `${homeCode} ` : ''}
                  {homeName} - {awayName}
                  {awayCode ? ` ${awayCode}` : ''}
                </h2>

                <div className="grid">
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

                <div className="grid">
                  <div>
                    <label>Score {homeName}</label>
                    <input
                      type="number"
                      min="0"
                      value={match.home_score ?? ''}
                      onChange={(e) => editMatch(match.id, 'home_score', e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Score {awayName}</label>
                    <input
                      type="number"
                      min="0"
                      value={match.away_score ?? ''}
                      onChange={(e) => editMatch(match.id, 'away_score', e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Première équipe qui marque</label>
                    <select
                      value={match.first_scoring_team_id ?? ''}
                      onChange={(e) =>
                        editMatch(match.id, 'first_scoring_team_id', e.target.value)
                      }
                    >
                      <option value="">Aucune sélection</option>

                      {match.home_team_id && (
                        <option value={match.home_team_id}>
                          {homeCode ? `${homeCode} — ` : ''}
                          {homeName}
                        </option>
                      )}

                      {match.away_team_id && (
                        <option value={match.away_team_id}>
                          {awayCode ? `${awayCode} — ` : ''}
                          {awayName}
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label>Statut</label>
                    <select
                      value={match.status}
                      onChange={(e) => editMatch(match.id, 'status', e.target.value)}
                    >
                      <option value="scheduled">scheduled</option>
                      <option value="live">live</option>
                      <option value="finished">finished</option>
                    </select>
                  </div>
                </div>

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
                    {selectedPlayer
                      ? `${selectedPlayer.name} — ${getPlayerAbr(selectedPlayer)}`
                      : 'Aucun buteur'}
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

                      <div
                        style={{
                          maxHeight: 230,
                          overflowY: 'auto',
                          display: 'grid',
                          gap: 4,
                        }}
                      >
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
                            {player.name} — {getPlayerAbr(player)}
                          </button>
                        ))}
                      </div>

                      <p className="small" style={{ marginTop: 8 }}>
                        {filteredPlayers.length} joueur(s) affiché(s) sur{' '}
                        {availablePlayers.length}
                      </p>
                    </div>
                  )}
                </div>

                {playersByMatch[match.id] && playersByMatch[match.id].length === 0 && (
                  <p className="small error">Aucun joueur trouvé pour ce match.</p>
                )}

                <button style={{ marginTop: 12 }} onClick={() => saveMatch(match)}>
                  Sauvegarder résultat
                </button>
              </div>
            );
          })}

          {filteredMatches.length === 0 && (
            <div className="card">
              <p>Aucun match ne correspond aux filtres.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
