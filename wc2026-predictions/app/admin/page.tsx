'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

const allStatuses = ['all', 'scheduled', 'live', 'finished'];

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [message, setMessage] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

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
      { data: playersData, error: playersError },
    ] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_at', { ascending: true }),
      supabase.from('teams').select('*').order('name', { ascending: true }),
      supabase
        .from('players')
        .select('id, team_id, name, active, team_abr')
        .or('active.eq.true,active.is.null')
        .order('team_abr', { ascending: true })
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

    if (playersError) {
      setMessage(`Erreur joueurs : ${playersError.message}`);
      return;
    }

    const teamsById: Record<string, Team> = {};

    (teamsData || []).forEach((team: Team) => {
      teamsById[team.id] = team;
    });

    setTeams(teamsById);
    setPlayers(playersData || []);
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

  function getPlayersForMatch(match: Match) {
    const teamIds = [match.home_team_id, match.away_team_id].filter(Boolean);

    return players.filter((player) => {
      return player.team_id && teamIds.includes(player.team_id);
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

        return {
          ...match,
          [field]: value === '' ? null : value,
        };
      })
    );
  }

  async function saveMatch(match: Match) {
    const { error } = await supabase
      .from('matches')
      .update({
        home_score: match.home_score,
        away_score: match.away_score,
        first_scoring_team_id: match.first_scoring_team_id,
        first_scorer_id: match.first_scorer_id,
        status: match.status,
      })
      .eq('id', match.id);

    if (error) {
      setMessage(`Erreur sauvegarde : ${error.message}`);
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
            message.includes('sauvegardé') || message.includes('recalculés')
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
                  {allStatuses.map((status) => (
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

          {filteredMatches.map((match) => {
            const homeName = getTeamName(match.home_team_id, match.home_team);
            const awayName = getTeamName(match.away_team_id, match.away_team);
            const homeCode = getTeamCode(match.home_team_id);
            const awayCode = getTeamCode(match.away_team_id);
            const matchPlayers = getPlayersForMatch(match);

            return (
              <div className="card" key={match.id}>
                <p className="small">
                  {phaseLabels[match.phase] || match.phase} ·{' '}
                  {new Date(match.kickoff_at).toLocaleString('fr-BE')}
                </p>

                <h2>
                  {homeCode ? `${homeCode} ` : ''}
                  {homeName} - {awayName}
                  {awayCode ? ` ${awayCode}` : ''}
                </h2>

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
                    <label>Premier buteur</label>
                    <select
                      value={match.first_scorer_id ?? ''}
                      onChange={(e) => editMatch(match.id, 'first_scorer_id', e.target.value)}
                    >
                      <option value="">Aucun buteur</option>

                      {matchPlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                          {player.team_abr ? ` — ${player.team_abr}` : ''}
                        </option>
                      ))}
                    </select>

                    {matchPlayers.length === 0 && (
                      <p className="small error">Aucun joueur trouvé pour ce match.</p>
                    )}
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
