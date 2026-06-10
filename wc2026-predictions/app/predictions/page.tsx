'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconMinus,
  IconMatches,
  IconTrophy,
} from '@/app/components/icons';
import ScorerPicker from '@/app/components/ScorerPicker';
import Countdown from '@/app/components/Countdown';
import { SkeletonCards } from '@/app/components/Skeleton';
import EmptyState from '@/app/components/EmptyState';
import OtherPredictionsList from '@/app/components/OtherPredictionsList';
import { useToast } from '@/app/components/Toast';
import { flagsByCode, teamCodeFromName, teamFlagUrl } from '@/lib/flags';
import {
  phaseLabels,
  bonusAllowedPhases,
  positionLabel as getPositionLabel,
} from '@/lib/phases';

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
  status: string;
  phase: string;
  match_label: string | null;
  home_score?: number | null;
  away_score?: number | null;
  first_scorer?: string | null;
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

type OtherPrediction = {
  user_id: string;
  username: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_first_scoring_team_id: string | null;
  predicted_first_scorer: string | null;
  predicted_first_scorer_id: string | null;
};

type ViewMode = 'upcoming' | 'history';

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

export default function PredictionsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersByMatch, setPlayersByMatch] = useState<Record<string, Player[]>>({});
  const [loadingPlayersForMatch, setLoadingPlayersForMatch] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [playerSearchByMatch, setPlayerSearchByMatch] = useState<Record<string, string>>({});
  const [openScorerForMatch, setOpenScorerForMatch] = useState<string | null>(null);

  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [openedPredictionsMatchId, setOpenedPredictionsMatchId] = useState<string | null>(null);
  const [otherPredictions, setOtherPredictions] = useState<OtherPrediction[]>([]);
  const [loadingOtherPredictions, setLoadingOtherPredictions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setMessage('Connecte-toi pour encoder tes pronostics.');
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [
      { data: matchesData, error: matchesError },
      { data: predictionsData, error: predictionsError },
      { data: teamsData, error: teamsError },
      { data: leagueMembersData, error: leaguesError },
    ] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_at', { ascending: true }),
      supabase.from('predictions').select('*').eq('user_id', user.id),
      supabase.from('teams').select('*').order('name', { ascending: true }),
      supabase
        .from('league_members')
        .select(`
          league_id,
          leagues (
            id,
            name,
            code
          )
        `)
        .eq('user_id', user.id),
    ]);

    if (matchesError) return setMessage(`Erreur matchs: ${matchesError.message}`);
    if (predictionsError) return setMessage(`Erreur pronostics: ${predictionsError.message}`);
    if (teamsError) return setMessage(`Erreur équipes: ${teamsError.message}`);
    if (leaguesError) return setMessage(`Erreur ligues: ${leaguesError.message}`);

    const loadedMatches = (matchesData || []) as Match[];
    setMatches(loadedMatches);

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

    const myLeagues =
      leagueMembersData
        ?.map((row: any) => row.leagues)
        .filter(Boolean) || [];

    setLeagues(myLeagues);

    if (myLeagues.length > 0) {
      setSelectedLeagueId((current) => current || myLeagues[0].id);
    }

    setSelectedDate((currentDate) => {
      const currentDateKey = toDateKey(currentDate);

      const stillHasMatchesOnCurrentDate = loadedMatches.some((match) => {
        return (
          match.status !== 'finished' &&
          toDateKey(new Date(match.kickoff_at)) === currentDateKey
        );
      });

      if (stillHasMatchesOnCurrentDate) return currentDate;

      const firstUpcoming = loadedMatches.find((match) => match.status !== 'finished');

      return firstUpcoming ? new Date(firstUpcoming.kickoff_at) : currentDate;
    });

    setLoading(false);
  }

  const upcomingMatches = useMemo(() => {
    return matches.filter((match) => match.status !== 'finished');
  }, [matches]);

  const historyMatches = useMemo(() => {
    return matches
      .filter((match) => match.status === 'finished')
      .sort(
        (a, b) =>
          new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime()
      );
  }, [matches]);

  const selectedDateKey = toDateKey(selectedDate);

  const matchesForSelectedDate = useMemo(() => {
    return upcomingMatches.filter((match) => {
      return toDateKey(new Date(match.kickoff_at)) === selectedDateKey;
    });
  }, [upcomingMatches, selectedDateKey]);

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

  function getPlayerAbr(player: Player) {
    return player.team_abr || (player.team_id ? teams[player.team_id]?.code : null) || '???';
  }

  function getTeamFlagByCode(code?: string | null) {
    const normalizedCode = code?.trim().toUpperCase();

    if (!normalizedCode) return '🏳️';

    return flagsByCode[normalizedCode] || '🏳️';
  }

  function getTeamCodeByName(teamName: string) {
    return teamCodeFromName(teamName);
  }

  function getFlagUrl(team: Team | null, fallbackName: string) {
    return teamFlagUrl(team, fallbackName);
  }

  function getMatchPlayers(match: Match) {
    return playersByMatch[match.id] || [];
  }

  function getFilteredMatchPlayers(match: Match) {
    const search = (playerSearchByMatch[match.id] || '').toLowerCase().trim();

    return getMatchPlayers(match).filter((player) => {
      const label = `${player.name} ${getPlayerAbr(player)}`;
      return label.toLowerCase().includes(search);
    });
  }

  function getTeamName(teamId: string | null) {
    if (!teamId) return '-';
    return teams[teamId]?.name || '-';
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
      .select('id, team_id, name, active, team_abr, position, position_order')
      .in('team_id', teamIds)
      .or('active.eq.true,active.is.null')
      .order('position_order', { ascending: true })
      .order('team_abr', { ascending: true })
      .order('name', { ascending: true })
      .range(0, 200);

    setLoadingPlayersForMatch(null);

    if (error) {
      setMessage(`Erreur joueurs: ${error.message}`);
      return;
    }

    const sortedPlayers = ((data || []) as Player[]).sort((a, b) => {
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

  async function toggleOtherPredictions(match: Match) {
    if (openedPredictionsMatchId === match.id) {
      setOpenedPredictionsMatchId(null);
      setOtherPredictions([]);
      setLoadingOtherPredictions(false);
      return;
    }

    if (!selectedLeagueId) {
      setMessage('Aucune ligue sélectionnée. Vérifie que tu appartiens bien à une ligue.');
      return;
    }

    setOpenedPredictionsMatchId(match.id);
    setOtherPredictions([]);
    setLoadingOtherPredictions(true);
    setMessage('');

    const { data, error } = await supabase.rpc(
      'get_match_predictions_for_league',
      {
        p_match_id: match.id,
        p_league_id: selectedLeagueId,
      }
    );

    setLoadingOtherPredictions(false);

    if (error) {
      setMessage(`Erreur pronos : ${error.message}`);
      return;
    }

    setOtherPredictions((data || []) as OtherPrediction[]);
  }

  async function save(match: Match) {
    if (!userId) return;

    if (new Date(match.kickoff_at).getTime() <= Date.now()) {
      return toast.error('Trop tard : le match a déjà commencé.');
    }

    const p = predictions[match.id];

    if (!p) {
      return toast.error('Encode un score avant de sauver.');
    }

    const wantsBonus = p.double_bonus;
    const bonusAlreadyUsedForPhase = bonusUsedByPhase[match.phase];

    if (
      wantsBonus &&
      bonusAlreadyUsedForPhase &&
      bonusAlreadyUsedForPhase !== match.id
    ) {
      return toast.error(
        `Tu as déjà utilisé ton bonus x2 pour ${
          phaseLabels[match.phase] || match.phase
        }.`
      );
    }

    if (wantsBonus && !bonusAllowedPhases.includes(match.phase)) {
      return toast.error('Le bonus x2 n’est pas disponible pour cette phase.');
    }

    setSavingMatchId(match.id);

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

    setSavingMatchId(null);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Prono sauvegardé ✓');
      load();
    }
  }

  function renderOtherPredictions(match: Match) {
    return (
      <div className="card">
        <h2>
          Pronos - {match.home_team} vs {match.away_team}
        </h2>

        {loadingOtherPredictions ? (
          <p className="small">Chargement des pronos...</p>
        ) : (
          <OtherPredictionsList
            predictions={otherPredictions}
            teamName={getTeamName}
          />
        )}
      </div>
    );
  }

  function renderMatchCard(match: Match, mode: ViewMode) {
    const locked = new Date(match.kickoff_at).getTime() <= Date.now();
    const p = predictions[match.id];

    const homeTeam = match.home_team_id ? teams[match.home_team_id] : null;
    const awayTeam = match.away_team_id ? teams[match.away_team_id] : null;

    const availablePlayers = getMatchPlayers(match);
    const filteredAvailablePlayers = getFilteredMatchPlayers(match);

    const selectedPlayer = p?.predicted_first_scorer_id
      ? players.find((player) => player.id === p.predicted_first_scorer_id) ||
        getMatchPlayers(match).find(
          (player) => player.id === p.predicted_first_scorer_id
        )
      : null;

    const selectedScorerLabel = selectedPlayer
      ? `${selectedPlayer.name} — ${getPlayerAbr(selectedPlayer)}`
      : p?.predicted_first_scorer
      ? p.predicted_first_scorer
      : 'Aucun buteur';

    const bonusUsedForPhase = bonusUsedByPhase[match.phase];
    const bonusUnavailable =
      !!bonusUsedForPhase && bonusUsedForPhase !== match.id;

    const scorerDropdownOpen = openScorerForMatch === match.id;

    const cardStateClass =
      p?.points >= 11
        ? 'perfect'
        : p?.points >= 7
        ? 'good'
        : p
        ? 'saved'
        : '';

    const readOnly = mode === 'history' || locked;
    const isOtherPredictionsOpen = openedPredictionsMatchId === match.id;

    return (
      <div key={match.id} style={{ display: 'grid', gap: 8 }}>
        <div
          className={`card prediction-card ${cardStateClass} ${
            readOnly ? 'locked' : ''
          }`}
        >
          <div className="points-pill">{p?.points ?? 0} pts</div>

          <div className="prediction-badges">
            {!p && mode === 'upcoming' && (
              <span className="badge pending">À pronostiquer</span>
            )}

            {p && mode === 'upcoming' && !readOnly && (
              <span className="badge saved">Enregistré</span>
            )}

            {readOnly && mode === 'upcoming' && (
              <span className="badge locked">Verrouillé</span>
            )}

            {mode === 'history' && (
              <span className="badge finished">Résultat disponible</span>
            )}

            {p?.double_bonus && <span className="badge fire">Bonus ×2</span>}

            {p?.points >= 11 && <span className="badge perfect">Perfect</span>}
          </div>

          <p className="small">
            {phaseLabels[match.phase] || match.phase} ·{' '}
            {new Date(match.kickoff_at).toLocaleString('fr-BE')}
          </p>

          {mode === 'upcoming' && !locked && (
            <p style={{ margin: '0 0 6px' }}>
              <Countdown kickoffAt={match.kickoff_at} />
            </p>
          )}

          {match.match_label && (
            <div
              style={{
                display: 'inline-block',
                margin: '0 auto 14px auto',
                padding: '6px 14px',
                borderRadius: 999,
                background: 'color-mix(in srgb, var(--gold) 16%, transparent)',
                border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
                color: 'var(--gold)',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              {match.match_label}
            </div>
          )}

          <div className="match-header">
            <div className="team-side">
              <div className="team-flag">
                {getFlagUrl(homeTeam, match.home_team) ? (
                  <img
                    src={getFlagUrl(homeTeam, match.home_team)!}
                    alt={`Drapeau ${homeTeam?.name || match.home_team}`}
                  />
                ) : (
                  '🏳️'
                )}
              </div>

              <div
                style={{
                  fontWeight: 900,
                  fontSize: '1.8rem',
                  letterSpacing: '1px',
                }}
              >
                {homeTeam?.code || getTeamCodeByName(match.home_team) || '---'}
              </div>

              <div className="team-code">{homeTeam?.name || match.home_team}</div>
            </div>

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

            <div className="team-side">
              <div className="team-flag">
                {getFlagUrl(awayTeam, match.away_team) ? (
                  <img
                    src={getFlagUrl(awayTeam, match.away_team)!}
                    alt={`Drapeau ${awayTeam?.name || match.away_team}`}
                  />
                ) : (
                  '🏳️'
                )}
              </div>

              <div
                style={{
                  fontWeight: 900,
                  fontSize: '1.8rem',
                  letterSpacing: '1px',
                }}
              >
                {awayTeam?.code || getTeamCodeByName(match.away_team) || '---'}
              </div>

              <div className="team-code">{awayTeam?.name || match.away_team}</div>
            </div>
          </div>

          {mode === 'history' && (
            <div className="compare">
              <div className="compare-box">
                <div className="lbl">Ton prono</div>
                <div className="val">
                  {p?.predicted_home_score ?? '-'} – {p?.predicted_away_score ?? '-'}
                </div>
              </div>
              <div className="compare-box result">
                <div className="lbl">Résultat</div>
                <div className="val">
                  {match.home_score ?? '-'} – {match.away_score ?? '-'}
                </div>
              </div>
            </div>
          )}

          {mode !== 'history' && (
          <div className="score-row">
            <div className="stepper">
              <button
                type="button"
                className="step-btn"
                aria-label="Moins"
                disabled={readOnly || (p?.predicted_home_score ?? 0) <= 0}
                onClick={() =>
                  update(
                    match,
                    'predicted_home_score',
                    String(Math.max(0, (p?.predicted_home_score ?? 0) - 1))
                  )
                }
              >
                <IconMinus size={18} />
              </button>

              <input
                className="step-val"
                disabled={readOnly}
                type="number"
                min="0"
                max="20"
                inputMode="numeric"
                placeholder="0"
                value={p?.predicted_home_score ?? ''}
                onFocus={(e) => {
                  if (e.target.value === '0') e.target.value = '';
                }}
                onChange={(e) =>
                  update(
                    match,
                    'predicted_home_score',
                    e.target.value === '' ? '0' : e.target.value
                  )
                }
              />

              <button
                type="button"
                className="step-btn"
                aria-label="Plus"
                disabled={readOnly || (p?.predicted_home_score ?? 0) >= 20}
                onClick={() =>
                  update(
                    match,
                    'predicted_home_score',
                    String(Math.min(20, (p?.predicted_home_score ?? 0) + 1))
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
                disabled={readOnly || (p?.predicted_away_score ?? 0) <= 0}
                onClick={() =>
                  update(
                    match,
                    'predicted_away_score',
                    String(Math.max(0, (p?.predicted_away_score ?? 0) - 1))
                  )
                }
              >
                <IconMinus size={18} />
              </button>

              <input
                className="step-val"
                disabled={readOnly}
                type="number"
                min="0"
                max="20"
                inputMode="numeric"
                placeholder="0"
                value={p?.predicted_away_score ?? ''}
                onFocus={(e) => {
                  if (e.target.value === '0') e.target.value = '';
                }}
                onChange={(e) =>
                  update(
                    match,
                    'predicted_away_score',
                    e.target.value === '' ? '0' : e.target.value
                  )
                }
              />

              <button
                type="button"
                className="step-btn"
                aria-label="Plus"
                disabled={readOnly || (p?.predicted_away_score ?? 0) >= 20}
                onClick={() =>
                  update(
                    match,
                    'predicted_away_score',
                    String(Math.min(20, (p?.predicted_away_score ?? 0) + 1))
                  )
                }
              >
                <IconPlus size={18} />
              </button>
            </div>
          </div>
          )}

          <div className="compact-row">
            <div>
              <label>Première équipe qui marque</label>
              <select
                disabled={readOnly}
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
            </div>

            <div>
              <label>Premier buteur</label>

              <ScorerPicker
                open={scorerDropdownOpen}
                onToggle={() => openScorerDropdown(match)}
                onClose={() => setOpenScorerForMatch(null)}
                players={availablePlayers}
                loading={loadingPlayersForMatch === match.id}
                selectedId={p?.predicted_first_scorer_id ?? null}
                selectedLabel={selectedScorerLabel}
                disabled={readOnly}
                onSelect={(id) => selectScorer(match, id)}
                getLabel={(player) =>
                  `${
                    getPositionLabel(player.position)
                      ? `${getPositionLabel(player.position)} · `
                      : ''
                  }${player.name} — ${getPlayerAbr(player)}`
                }
              />
            </div>

            {bonusAllowedPhases.includes(match.phase) && mode === 'upcoming' && (
              <button
                type="button"
                className={`bonus-toggle${p?.double_bonus ? ' on' : ''}`}
                disabled={readOnly || bonusUnavailable}
                aria-pressed={p?.double_bonus ?? false}
                onClick={() =>
                  update(match, 'double_bonus', !(p?.double_bonus ?? false))
                }
              >
                <span className="bonus-switch" aria-hidden="true" />
                <span>
                  {bonusUnavailable && !p?.double_bonus
                    ? 'Bonus ×2 déjà utilisé cette phase'
                    : p?.double_bonus
                    ? 'Bonus ×2 activé'
                    : 'Activer le bonus ×2'}
                </span>
              </button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginTop: 14,
              flexWrap: 'wrap',
            }}
          >
            {mode === 'upcoming' && (
              <button
                disabled={readOnly || savingMatchId === match.id}
                onClick={() => save(match)}
              >
                {savingMatchId === match.id
                  ? 'Enregistrement…'
                  : readOnly
                  ? 'Verrouillé'
                  : p
                  ? 'Mettre à jour'
                  : 'Sauvegarder'}
              </button>
            )}

            {readOnly && (
              <button type="button" onClick={() => toggleOtherPredictions(match)}>
                {isOtherPredictionsOpen
                  ? 'Ne plus voir les pronos'
                  : 'Voir les pronos'}
              </button>
            )}
          </div>
        </div>

        {isOtherPredictionsOpen && renderOtherPredictions(match)}
      </div>
    );
  }

  return (
    <main className="container">
      <h1>Mes pronostics</h1>

      <div className="segmented" style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => {
            setViewMode('upcoming');
            setOpenedPredictionsMatchId(null);
            setOtherPredictions([]);
          }}
          className={viewMode === 'upcoming' ? 'active' : ''}
        >
          À venir
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('history');
            setOpenedPredictionsMatchId(null);
            setOtherPredictions([]);
          }}
          className={viewMode === 'history' ? 'active' : ''}
        >
          Historique
        </button>
      </div>

      {leagues.length > 0 && (
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 14,
          }}
        >
          <span className="small" style={{ flexShrink: 0, fontWeight: 700 }}>
            Ligue
          </span>
          <select
            value={selectedLeagueId}
            onChange={(event) => {
              setSelectedLeagueId(event.target.value);
              setOpenedPredictionsMatchId(null);
              setOtherPredictions([]);
            }}
          >
            {leagues.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {message && <p className="error">{message}</p>}

      {loading && (
        <div style={{ marginTop: 16 }}>
          <SkeletonCards count={3} />
        </div>
      )}

      {!loading && viewMode === 'upcoming' && (
        <div className="view-anim" key="upcoming">
          <div className="card date-nav">
            <button
              type="button"
              className="icon-btn"
              aria-label="Jour précédent"
              onClick={() => setSelectedDate((date) => addDays(date, -1))}
            >
              <IconChevronLeft size={20} />
            </button>

            <div className="date-nav-title">{formatDateTitle(selectedDate)}</div>

            <button
              type="button"
              className="icon-btn"
              aria-label="Jour suivant"
              onClick={() => setSelectedDate((date) => addDays(date, 1))}
            >
              <IconChevronRight size={20} />
            </button>
          </div>

          <div className="card">
            <h2>Pronostic Champion du Monde</h2>

            <p className="small">
              Pronostique le vainqueur de la Coupe du Monde 2026 et gagne
              jusqu’à 20 points bonus.
            </p>

            <Link href="/champion">
              <button type="button" style={{ width: '100%', marginTop: 12 }}>
                Gérer mon pronostic Champion
              </button>
            </Link>
          </div>

          {matchesForSelectedDate.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<IconMatches size={32} />}
                title="Aucun match ce jour-là"
              >
                Change de date avec les flèches pour trouver les prochains matchs.
              </EmptyState>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 16 }}>
                {matchesForSelectedDate.map((match) =>
                  renderMatchCard(match, 'upcoming')
                )}
              </div>

              <div className="card date-nav">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Jour précédent"
                  onClick={() => {
                    setSelectedDate((date) => addDays(date, -1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <IconChevronLeft size={20} />
                </button>

                <div className="date-nav-title">
                  {formatDateTitle(selectedDate)}
                </div>

                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Jour suivant"
                  onClick={() => {
                    setSelectedDate((date) => addDays(date, 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <IconChevronRight size={20} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!loading && viewMode === 'history' && (
        <div className="view-anim" key="history">
          {historyMatches.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<IconTrophy size={32} />}
                title="Aucun match terminé"
              >
                Tes résultats apparaîtront ici après les premiers matchs.
              </EmptyState>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {historyMatches.map((match) => renderMatchCard(match, 'history'))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
