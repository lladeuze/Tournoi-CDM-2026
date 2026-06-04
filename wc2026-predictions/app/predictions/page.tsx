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
  status: string;
  phase: string;
};

type Prediction = {
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_first_scorer: string | null;
  predicted_first_scorer_id: string | null;
  predicted_first_scoring_team_id: string | null;
  double_bonus: boolean;
  points: number;
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

const visiblePhaseFilters = ['group_j1', 'group_j2', 'group_j3'];

const bonusAllowedPhases = [
  'group_j1',
  'group_j2',
  'group_j3',
  'round_of_32',
  'round_of_16',
  'quarter',
];

export default function PredictionsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedPhases, setSelectedPhases] = useState<string[]>(visiblePhaseFilters);
  const [playerSearchByMatch, setPlayerSearchByMatch] = useState<Record<string, string>>({});
  const [openScorerForMatch, setOpenScorerForMatch] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setMessage('Connecte-toi pour encoder tes pronostics.');
      return;
    }

    setUserId(user.id);

    const [
      { data: matchesData, error: matchesError },
      { data: predictionsData, error: predictionsError },
      { data: teamsData, error: teamsError },
      { data: playersData, error: playersError },
    ] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_at', { ascending: true }),
      supabase.from('predictions').select('*').eq('user_id', user.id),
      supabase.from('teams').select('*').order('name', { ascending: true }),
      supabase
        .from('players')
        .select('id, team_id, name, active, team_abr')
        .or('active.eq.true,active.is.null')
        .order('team_abr', { ascending: true })
        .order('name', { ascending: true })
        .range(0, 5000),
    ]);

    if (matchesError) return setMessage(`Erreur matchs: ${matchesError.message}`);
    if (predictionsError) return setMessage(`Erreur pronostics: ${predictionsError.message}`);
    if (teamsError) return setMessage(`Erreur équipes: ${teamsError.message}`);
    if (playersError) return setMessage(`Erreur joueurs: ${playersError.message}`);

    setMatches(matchesData || []);
    setPlayers(playersData || []);

    const teamsById: Record<string, Team> = {};
    (teamsData || []).forEach((team: Team) => {
      teamsById[team.id] = team;
    });
    setTeams(teamsById);

    const byMatch: Record<string, Prediction> = {};
    (predictionsData || []).forEach((prediction: Prediction) => {
      byMatch[prediction.match_id] = prediction;
    });
    setPredictions(byMatch);
  }

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => selectedPhases.includes(match.phase));
  }, [matches, selectedPhases]);

  const matchesByPhase = useMemo(() => {
    const grouped: Record<string, Match[]> = {};

    filteredMatches.forEach((match) => {
      if (!grouped[match.phase]) grouped[match.phase] = [];
      grouped[match.phase].push(match);
    });

    return grouped;
  }, [filteredMatches]);

  const bonusUsedByPhase = useMemo(() => {
    const used: Record<string, string> = {};

    matches.forEach((match) => {
      const prediction = predictions[match.id];
      if (prediction?.double_bonus) {
        used[match.phase] = match.id;
      }
    });

    return used;
  }, [matches, predictions]);

  function togglePhase(phase: string) {
    setSelectedPhases((current) =>
      current.includes(phase)
        ? current.filter((p) => p !== phase)
        : [...current, phase]
    );
  }

  function getTeamCode(teamId: string | null) {
    if (!teamId) return null;
    return teams[teamId]?.code || null;
  }

  function getPlayerAbr(player: Player) {
    return player.team_abr || (player.team_id ? teams[player.team_id]?.code : null) || '???';
  }

  function getMatchPlayers(match: Match) {
    const teamIds = [match.home_team_id, match.away_team_id]
      .filter(Boolean)
      .map(String);

    const teamCodes = [
      getTeamCode(match.home_team_id),
      getTeamCode(match.away_team_id),
    ]
      .filter(Boolean)
      .map(String);

    return players
      .filter((player) => {
        const playerTeamId = player.team_id ? String(player.team_id) : '';
        const playerAbr = player.team_abr ? String(player.team_abr) : '';

        return teamIds.includes(playerTeamId) || teamCodes.includes(playerAbr);
      })
      .sort((a, b) => {
        const teamA = getPlayerAbr(a);
        const teamB = getPlayerAbr(b);

        if (teamA !== teamB) return teamA.localeCompare(teamB);
        return a.name.localeCompare(b.name);
      });
  }

  function getFilteredMatchPlayers(match: Match) {
    const search = (playerSearchByMatch[match.id] || '').toLowerCase().trim();

    return getMatchPlayers(match).filter((player) => {
      const label = `${player.name} ${getPlayerAbr(player)}`;
      return label.toLowerCase().includes(search);
    });
  }

  function update(match: Match, field: keyof Prediction, value: string | boolean) {
    setPredictions((current) => {
      const existing = current[match.id];

      const next: Prediction = {
        match_id: match.id,
        predicted_home_score: existing?.predicted_home_score ?? 0,
        predicted_away_score: existing?.predicted_away_score ?? 0,
        predicted_first_scorer: existing?.predicted_first_scorer ?? null,
        predicted_first_scorer_id: existing?.predicted_first_scorer_id ?? null,
        predicted_first_scoring_team_id:
          existing?.predicted_first_scoring_team_id ?? null,
        double_bonus: existing?.double_bonus ?? false,
        points: existing?.points ?? 0,
      };

      if (field === 'predicted_home_score') {
        next.predicted_home_score = Number(value);
      }

      if (field === 'predicted_away_score') {
        next.predicted_away_score = Number(value);
      }

      if (field === 'predicted_first_scorer_id') {
        const playerId = String(value) || null;
        const player = players.find((p) => p.id === playerId);

        next.predicted_first_scorer_id = playerId;
        next.predicted_first_scorer = player?.name || null;
      }

      if (field === 'predicted_first_scoring_team_id') {
        next.predicted_first_scoring_team_id = String(value) || null;
      }

      if (field === 'double_bonus') {
        next.double_bonus = Boolean(value);
      }

      return {
        ...current,
        [match.id]: next,
      };
    });
  }

  function selectScorer(match: Match, playerId: string) {
    update(match, 'predicted_first_scorer_id', playerId);
    setOpenScorerForMatch(null);
    setPlayerSearchByMatch((current) => ({
      ...current,
      [match.id]: '',
    }));
  }

  async function save(match: Match) {
    if (!userId) return;

    if (new Date(match.kickoff_at).getTime() <= Date.now()) {
      return setMessage('Trop tard : le match a déjà commencé.');
    }

    const p = predictions[match.id];

    if (!p) {
      return setMessage('Encode un score avant de sauver.');
    }

    const wantsBonus = p.double_bonus;
    const bonusAlreadyUsedForPhase = bonusUsedByPhase[match.phase];

    if (
      wantsBonus &&
      bonusAlreadyUsedForPhase &&
      bonusAlreadyUsedForPhase !== match.id
    ) {
      return setMessage(
        `Tu as déjà utilisé ton bonus x2 pour ${
          phaseLabels[match.phase] || match.phase
        }.`
      );
    }

    if (wantsBonus && !bonusAllowedPhases.includes(match.phase)) {
      return setMessage('Le bonus x2 n’est pas disponible pour cette phase.');
    }

    const { error } = await supabase.from('predictions').upsert(
      {
        user_id: userId,
        match_id: match.id,
        predicted_home_score: p.predicted_home_score,
        predicted_away_score: p.predicted_away_score,
        predicted_first_scorer: p.predicted_first_scorer || null,
        predicted_first_scorer_id: p.predicted_first_scorer_id || null,
        predicted_first_scoring_team_id:
          p.predicted_first_scoring_team_id || null,
        double_bonus: p.double_bonus,
      },
      { onConflict: 'user_id,match_id' }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Prono sauvegardé.');
      load();
    }
  }

  return (
    <main className="container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <h1>Mes pronostics</h1>

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          {visiblePhaseFilters.map((phase) => {
            const active = selectedPhases.includes(phase);

            return (
              <button
                key={phase}
                type="button"
                onClick={() => togglePhase(phase)}
                style={{
                  border: active
                    ? '1px solid rgba(94, 234, 212, 0.7)'
                    : '1px solid rgba(255,255,255,0.12)',
                  background: active
                    ? 'rgba(94, 234, 212, 0.22)'
                    : 'rgba(255,255,255,0.04)',
                  color: active ? '#5eead4' : '#cbd5e1',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {phaseLabels[phase].replace('Poules ', '')}
              </button>
            );
          })}
        </div>
      </div>

      {message && (
        <p className={message.includes('sauvegardé') ? 'success' : 'error'}>
          {message}
        </p>
      )}

      {visiblePhaseFilters.map((phase) => {
        const phaseMatches = matchesByPhase[phase] || [];

        if (phaseMatches.length === 0) return null;

        return (
          <section key={phase} style={{ marginTop: 32 }}>
            <h2
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                marginBottom: 18,
              }}
            >
              {phaseLabels[phase]}
            </h2>

            <div className="grid">
              {phaseMatches.map((match) => {
                const locked = new Date(match.kickoff_at).getTime() <= Date.now();
                const p = predictions[match.id];

                const homeTeam = match.home_team_id ? teams[match.home_team_id] : null;
                const awayTeam = match.away_team_id ? teams[match.away_team_id] : null;

                const availablePlayers = getMatchPlayers(match);
                const filteredAvailablePlayers = getFilteredMatchPlayers(match);

                const selectedPlayer = p?.predicted_first_scorer_id
                  ? players.find((player) => player.id === p.predicted_first_scorer_id)
                  : null;

                const bonusUsedForPhase = bonusUsedByPhase[match.phase];
                const bonusUnavailable =
                  !!bonusUsedForPhase && bonusUsedForPhase !== match.id;

                const scorerDropdownOpen = openScorerForMatch === match.id;

                return (
                  <div className="card" key={match.id}>
                    <p className="small">
                      {phaseLabels[match.phase] || match.phase} ·{' '}
                      {new Date(match.kickoff_at).toLocaleString('fr-BE')}
                    </p>

                    <h2>
                      {homeTeam?.name || match.home_team}
                      {' - '}
                      {awayTeam?.name || match.away_team}
                    </h2>

                    <div className="grid">
                      <div>
                        <label>{homeTeam?.name || match.home_team}</label>
                        <input
                          disabled={locked}
                          type="number"
                          min="0"
                          value={p?.predicted_home_score ?? 0}
                          onChange={(e) =>
                            update(match, 'predicted_home_score', e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label>{awayTeam?.name || match.away_team}</label>
                        <input
                          disabled={locked}
                          type="number"
                          min="0"
                          value={p?.predicted_away_score ?? 0}
                          onChange={(e) =>
                            update(match, 'predicted_away_score', e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <label>Première équipe qui marque</label>
                    <select
                      disabled={locked}
                      value={p?.predicted_first_scoring_team_id ?? ''}
                      onChange={(e) =>
                        update(match, 'predicted_first_scoring_team_id', e.target.value)
                      }
                    >
                      <option value="">Aucune sélection</option>

                      {match.home_team_id && (
                        <option value={match.home_team_id}>
                          {homeTeam?.name || match.home_team}
                        </option>
                      )}

                      {match.away_team_id && (
                        <option value={match.away_team_id}>
                          {awayTeam?.name || match.away_team}
                        </option>
                      )}
                    </select>

                    <label>Premier buteur</label>

                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          setOpenScorerForMatch((current) =>
                            current === match.id ? null : match.id
                          )
                        }
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(15,23,42,0.9)',
                          color: 'white',
                          borderRadius: 10,
                          padding: '12px 14px',
                          cursor: locked ? 'not-allowed' : 'pointer',
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

                            {filteredAvailablePlayers.map((player) => (
                              <button
                                type="button"
                                key={player.id}
                                onClick={() => selectScorer(match, player.id)}
                                style={{
                                  textAlign: 'left',
                                  background:
                                    p?.predicted_first_scorer_id === player.id
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
                            {filteredAvailablePlayers.length} joueur(s) affiché(s) sur{' '}
                            {availablePlayers.length}
                          </p>
                        </div>
                      )}
                    </div>

                    {availablePlayers.length === 0 && (
                      <p className="small error">
                        Aucun joueur trouvé pour ce match. Vérifie les codes :{' '}
                        {getTeamCode(match.home_team_id) || '???'} /{' '}
                        {getTeamCode(match.away_team_id) || '???'}.
                      </p>
                    )}

                    {bonusAllowedPhases.includes(match.phase) && (
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          disabled={locked || bonusUnavailable}
                          checked={p?.double_bonus ?? false}
                          onChange={(e) =>
                            update(match, 'double_bonus', e.target.checked)
                          }
                        />

                        Bonus x2

                        {bonusUnavailable && (
                          <span className="small">
                            déjà utilisé pour {phaseLabels[match.phase] || match.phase}
                          </span>
                        )}
                      </label>
                    )}

                    <p className="small">Points actuels : {p?.points ?? 0}</p>

                    <button disabled={locked} onClick={() => save(match)}>
                      {locked ? 'Verrouillé' : 'Sauvegarder'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
