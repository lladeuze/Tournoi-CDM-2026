'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TournamentAwards from './components/TournamentAwards';
import { IconPlus, IconMinus } from '@/app/components/icons';
import ScorerPicker from '@/app/components/ScorerPicker';
import { useToast } from '@/app/components/Toast';
import { phaseLabels } from '@/lib/phases';

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

const statuses = ['all', 'scheduled', 'live', 'finished'];

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersByMatch, setPlayersByMatch] = useState<Record<string, Player[]>>({});
  const [loadingPlayersForMatch, setLoadingPlayersForMatch] = useState<string | null>(null);
  const [openScorerForMatch, setOpenScorerForMatch] = useState<string | null>(null);
  const [playerSearchByMatch, setPlayerSearchByMatch] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [tournamentSettings, setTournamentSettings] =useState<TournamentSettings | null>(null);
  const [winnerTeamId, setWinnerTeamId] = useState('');
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const toast = useToast();

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
  supabase.from('tournament_settings').select('*').eq('id', 1).maybeSingle()
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
      const matchesStatus = statusFilter === 'all' || match.status === statusFilter;
      const matchesSearch = !q || homeName.includes(q) || awayName.includes(q);

      return matchesPhase && matchesStatus && matchesSearch;
    });
  }, [matches, phaseFilter, statusFilter, search, teams]);

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

    const teamIds = [match.home_team_id, match.away_team_id].filter(Boolean);

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

    const sortedPlayers = ((data || []) as Player[]).sort((a, b) => {
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
    toast.error(`Erreur champion officiel : ${error.message}`);
    return;
  }

  toast.success('Champion officiel mis à jour ✓');
  await load();
}

  async function saveMatch(match: Match) {
    setSavingMatchId(match.id);

    const { error } = await supabase
      .from('matches')
      .update({
        home_score: match.home_score,
        away_score: match.away_score,
        first_scoring_team_id: match.first_scoring_team_id,
        first_scorer_id: match.first_scorer_id,
        status: match.status,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
      })
      .eq('id', match.id);

    setSavingMatchId(null);

    if (error) {
      toast.error(`Erreur sauvegarde : ${error.message}`);
      return;
    }

    toast.success('Résultat sauvegardé · points recalculés ✓');
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
          <div
            className="card"
            style={{
              padding: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 8,
            }}
          >
            <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
              <option value="all">Toutes les phases</option>
              {availablePhases.map((phase) => (
                <option key={phase} value={phase}>
                  {phaseLabels[phase] || phase}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'all'
                    ? 'Tous les statuts'
                    : statusMeta[status]?.label || status}
                </option>
              ))}
            </select>

            <input
              placeholder="Rechercher une équipe…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="card">
  <h2>Champion officiel</h2>

  <p className="small">
    Ce choix déclenche les points bonus du pronostic champion dans le classement.
  </p>

  <select
    value={winnerTeamId}
    onChange={(e) => setWinnerTeamId(e.target.value)}
  >
    <option value="">Aucun champion officiel</option>

    {Object.values(teams).map((team) => (
      <option key={team.id} value={team.id}>
        {team.code ? `${team.code} — ` : ''}
        {team.name}
      </option>
    ))}
  </select>

  <button
    type="button"
    onClick={updateWinnerTeam}
    style={{ marginTop: 12 }}
  >
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
              ? players.find((player) => player.id === match.first_scorer_id)
              : null;

            return (
              <div className="card" key={match.id}>
                <div className="admin-match-head">
                  <span className={`badge ${statusMeta[match.status]?.cls || ''}`}>
                    {statusMeta[match.status]?.label || match.status}
                  </span>
                  <span className="small">
                    {phaseLabels[match.phase] || match.phase} ·{' '}
                    {new Date(match.kickoff_at).toLocaleString('fr-BE')}
                  </span>
                </div>

                {match.match_label && (
                  <span className="badge" style={{ marginTop: 10 }}>
                    {match.match_label}
                  </span>
                )}

                <h2 style={{ marginTop: 8 }}>
                  {homeCode ? `${homeCode} ` : ''}
                  {homeName} — {awayName}
                  {awayCode ? ` ${awayCode}` : ''}
                </h2>

                <div className="grid">
  <div>
    <label>Équipe domicile</label>

    <select
      value={match.home_team_id || ''}
      onChange={(e) =>
        editMatch(match.id, 'home_team_id', e.target.value)
      }
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
      onChange={(e) =>
        editMatch(match.id, 'away_team_id', e.target.value)
      }
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

                



                
                <label>Score final</label>
                <div
                  className="score-row"
                  style={{ justifyContent: 'flex-start', marginTop: 4 }}
                >
                  <div className="stepper">
                    <button
                      type="button"
                      className="step-btn"
                      aria-label="Moins"
                      onClick={() =>
                        editMatch(
                          match.id,
                          'home_score',
                          String(Math.max(0, (match.home_score ?? 0) - 1))
                        )
                      }
                    >
                      <IconMinus size={18} />
                    </button>
                    <input
                      className="step-val"
                      type="number"
                      min="0"
                      value={match.home_score ?? ''}
                      onChange={(e) =>
                        editMatch(match.id, 'home_score', e.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="step-btn"
                      aria-label="Plus"
                      onClick={() =>
                        editMatch(
                          match.id,
                          'home_score',
                          String((match.home_score ?? 0) + 1)
                        )
                      }
                    >
                      <IconPlus size={18} />
                    </button>
                  </div>

                  <span className="score-dash">–</span>

                  <div className="stepper">
                    <button
                      type="button"
                      className="step-btn"
                      aria-label="Moins"
                      onClick={() =>
                        editMatch(
                          match.id,
                          'away_score',
                          String(Math.max(0, (match.away_score ?? 0) - 1))
                        )
                      }
                    >
                      <IconMinus size={18} />
                    </button>
                    <input
                      className="step-val"
                      type="number"
                      min="0"
                      value={match.away_score ?? ''}
                      onChange={(e) =>
                        editMatch(match.id, 'away_score', e.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="step-btn"
                      aria-label="Plus"
                      onClick={() =>
                        editMatch(
                          match.id,
                          'away_score',
                          String((match.away_score ?? 0) + 1)
                        )
                      }
                    >
                      <IconPlus size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid">
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
                      <option value="scheduled">À venir</option>
                      <option value="live">En direct</option>
                      <option value="finished">Terminé</option>
                    </select>
                  </div>
                </div>

                <label>Premier buteur</label>

                <ScorerPicker
                  open={scorerDropdownOpen}
                  onToggle={() => openScorerDropdown(match)}
                  onClose={() => setOpenScorerForMatch(null)}
                  players={availablePlayers}
                  loading={loadingPlayersForMatch === match.id}
                  selectedId={match.first_scorer_id ?? null}
                  selectedLabel={
                    selectedPlayer
                      ? `${selectedPlayer.name} — ${getPlayerAbr(selectedPlayer)}`
                      : 'Aucun buteur'
                  }
                  onSelect={(id) => selectScorer(match, id)}
                  getLabel={(player) =>
                    `${player.name} — ${getPlayerAbr(player)}`
                  }
                />

                {playersByMatch[match.id] && playersByMatch[match.id].length === 0 && (
                  <p className="small error">Aucun joueur trouvé pour ce match.</p>
                )}

                <button
                  style={{ width: '100%', marginTop: 16 }}
                  disabled={savingMatchId === match.id}
                  onClick={() => saveMatch(match)}
                >
                  {savingMatchId === match.id
                    ? 'Enregistrement…'
                    : 'Sauvegarder le résultat'}
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
