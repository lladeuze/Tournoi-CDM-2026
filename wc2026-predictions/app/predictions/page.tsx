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
  team_id: string;
  name: string;
  active: boolean | null;
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

      // Important : accepte active = true OU active = null
      supabase
        .from('players')
        .select('id, team_id, name, active')
        .or('active.eq.true,active.is.null')
        .order('name', { ascending: true }),
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

  function getMatchPlayers(match: Match) {
    const teamIds = [match.home_team_id, match.away_team_id]
      .filter(Boolean)
      .map(String);

    return players.filter((player) => teamIds.includes(String(player.team_id)));
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
      <h1>Mes pronostics</h1>

      {message && (
        <p className={message.includes('sauvegardé') ? 'success' : 'error'}>
          {message}
        </p>
      )}

      <div className="grid">
        {matches.map((match) => {
          const locked = new Date(match.kickoff_at).getTime() <= Date.now();
          const p = predictions[match.id];

          const homeTeam = match.home_team_id ? teams[match.home_team_id] : null;
          const awayTeam = match.away_team_id ? teams[match.away_team_id] : null;

          const availablePlayers = getMatchPlayers(match);

          const bonusUsedForPhase = bonusUsedByPhase[match.phase];
          const bonusUnavailable =
            !!bonusUsedForPhase && bonusUsedForPhase !== match.id;

          return (
            <div className="card" key={match.id}>
              <p className="small">
                {phaseLabels[match.phase] || match.phase} ·{' '}
                {new Date(match.kickoff_at).toLocaleString('fr-BE')}
              </p>

              <h2>
                {homeTeam?.logo_url && (
                  <img
                    src={homeTeam.logo_url}
                    alt={homeTeam.name}
                    style={{
                      width: 24,
                      height: 24,
                      objectFit: 'contain',
                      marginRight: 8,
                    }}
                  />
                )}

                {homeTeam?.name || match.home_team}
                {' - '}

                {awayTeam?.logo_url && (
                  <img
                    src={awayTeam.logo_url}
                    alt={awayTeam.name}
                    style={{
                      width: 24,
                      height: 24,
                      objectFit: 'contain',
                      marginRight: 8,
                    }}
                  />
                )}

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
              <select
                disabled={locked}
                value={p?.predicted_first_scorer_id ?? ''}
                onChange={(e) =>
                  update(match, 'predicted_first_scorer_id', e.target.value)
                }
              >
                <option value="">Aucun buteur</option>

                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} — {teams[player.team_id]?.name || 'Équipe inconnue'}
                  </option>
                ))}
              </select>

              {availablePlayers.length === 0 && (
                <p className="small error">
                  Aucun joueur trouvé pour ce match.
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
    </main>
  );
}
