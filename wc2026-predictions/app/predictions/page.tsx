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

type Champion = {
  id: string;
  user_id: string;
  initial_champion_team_id: string | null;
  second_champion_team_id: string | null;
  initial_locked_at: string | null;
  second_locked_at: string | null;
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
  const [championPrediction, setChampionPrediction] =useState<ChampionPrediction | null>(null);
  const [initialChampionTeamId, setInitialChampionTeamId] = useState('');
  const [secondChampionTeamId, setSecondChampionTeamId] = useState('');

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
      { data: championData, error: championError },
    ] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_at', { ascending: true }),
      supabase.from('predictions').select('*').eq('user_id', user.id),
      supabase.from('teams').select('*').order('name', { ascending: true }),
      supabase.from('champion_predictions').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    if (matchesError) return setMessage(`Erreur matchs: ${matchesError.message}`);
    if (predictionsError) return setMessage(`Erreur pronostics: ${predictionsError.message}`);
    if (teamsError) return setMessage(`Erreur équipes: ${teamsError.message}`);
    if (championError) {return setMessage(`Erreur champion : ${championError.message}`);
}

if (championData) {
  setChampionPrediction(championData);
  setInitialChampionTeamId(championData.initial_champion_team_id || '');
  setSecondChampionTeamId(championData.second_champion_team_id || '');
}

    const loadedMatches = matchesData || [];
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

    setSelectedDate((currentDate) => {
  const currentDateKey = toDateKey(currentDate);

  const stillHasMatchesOnCurrentDate = loadedMatches.some((match) => {
    return (
      match.status !== 'finished' &&
      toDateKey(new Date(match.kickoff_at)) === currentDateKey
    );
  });

  if (stillHasMatchesOnCurrentDate) {
    return currentDate;
  }

  const firstUpcoming = loadedMatches.find((match) => match.status !== 'finished');

  return firstUpcoming ? new Date(firstUpcoming.kickoff_at) : currentDate;
});
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
  const normalizedName = teamName.trim().toLowerCase();

  const codeByName: Record<string, string> = {
    'mexique': 'MEX',
    'afrique du sud': 'RSA',
    'corée du sud': 'KOR',
    'tchéquie': 'CZE',
    'canada': 'CAN',
    'bosnie-herzégovine': 'BIH',
    'qatar': 'QAT',
    'suisse': 'SUI',
    'brésil': 'BRA',
    'maroc': 'MAR',
    'haïti': 'HAI',
    'écosse': 'SCO',
    'états-unis': 'USA',
    'paraguay': 'PAR',
    'australie': 'AUS',
    'turquie': 'TUR',
    'allemagne': 'GER',
    'curaçao': 'CUW',
    "côte d'ivoire": 'CIV',
    'équateur': 'ECU',
    'pays-bas': 'NED',
    'japon': 'JPN',
    'suède': 'SWE',
    'tunisie': 'TUN',
    'belgique': 'BEL',
    'égypte': 'EGY',
    'iran': 'IRN',
    'nouvelle-zélande': 'NZL',
    'espagne': 'ESP',
    'cap-vert': 'CPV',
    'arabie saoudite': 'KSA',
    'uruguay': 'URU',
    'france': 'FRA',
    'sénégal': 'SEN',
    'irak': 'IRQ',
    'norvège': 'NOR',
    'argentine': 'ARG',
    'algérie': 'ALG',
    'autriche': 'AUT',
    'jordanie': 'JOR',
    'portugal': 'POR',
    'rd congo': 'COD',
    'ouzbékistan': 'UZB',
    'ouzbekistan': 'UZB',
    'colombie': 'COL',
    'angleterre': 'ENG',
    'croatie': 'CRO',
    'ghana': 'GHA',
    'panama': 'PAN',
  };

  return codeByName[normalizedName] || null;
}

function getTeamFlag(team: Team | null, fallbackName: string) {
  if (team?.code) {
    return getTeamFlagByCode(team.code);
  }

  return getTeamFlagByCode(getTeamCodeByName(fallbackName));
}
function getFlagUrl(team: Team | null, fallbackName: string) {
  const code = team?.code || getTeamCodeByName(fallbackName);
  const flagCode = code ? flagsByCode[code.trim().toUpperCase()] : null;

  return flagCode ? `https://flagcdn.com/w160/${flagCode}.png` : null;
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
      setMessage(`Erreur joueurs: ${error.message}`);
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

  function getLastGroupJ1MatchDate() {
  const groupJ1Matches = matches.filter((match) => match.phase === 'group_j1');

  if (groupJ1Matches.length === 0) return null;

  return new Date(
    Math.max(
      ...groupJ1Matches.map((match) =>
        new Date(match.kickoff_at).getTime()
      )
    )
  );
}

function getLastGroupMatchDate() {
  const groupMatches = matches.filter((match) =>
    ['group_j1', 'group_j2', 'group_j3'].includes(match.phase)
  );

  if (groupMatches.length === 0) return null;

  return new Date(
    Math.max(
      ...groupMatches.map((match) =>
        new Date(match.kickoff_at).getTime()
      )
    )
  );
}

function getFirstRoundOf32MatchDate() {
  const roundOf32Matches = matches.filter(
    (match) => match.phase === 'round_of_32'
  );

  if (roundOf32Matches.length === 0) return null;

  return new Date(
    Math.min(
      ...roundOf32Matches.map((match) =>
        new Date(match.kickoff_at).getTime()
      )
    )
  );
}

function canEditInitialChampion() {
  const lastGroupJ1Date = getLastGroupJ1MatchDate();

  if (!lastGroupJ1Date) return true;

  return Date.now() <= lastGroupJ1Date.getTime();
}

function canEditSecondChampion() {
  const lastGroupDate = getLastGroupMatchDate();
  const firstRoundOf32Date = getFirstRoundOf32MatchDate();

  if (!lastGroupDate || !firstRoundOf32Date) return false;

  return (
    Date.now() > lastGroupDate.getTime() &&
    Date.now() < firstRoundOf32Date.getTime()
  );
}

async function saveChampionPrediction(type: 'initial' | 'second') {
  if (!userId) return;

  const isInitial = type === 'initial';

  if (isInitial && !canEditInitialChampion()) {
    setMessage('Le pronostic champion initial est verrouillé.');
    return;
  }

  if (!isInitial && !canEditSecondChampion()) {
    setMessage(
      'Le deuxième pronostic champion est disponible uniquement après les groupes et avant les 16es.'
    );
    return;
  }

  const selectedTeamId = isInitial
    ? initialChampionTeamId
    : secondChampionTeamId;

  if (!selectedTeamId) {
    setMessage('Sélectionne une équipe championne.');
    return;
  }

  const payload = {
    user_id: userId,
    initial_champion_team_id: isInitial
      ? selectedTeamId
      : championPrediction?.initial_champion_team_id || null,
    second_champion_team_id: isInitial
      ? championPrediction?.second_champion_team_id || null
      : selectedTeamId,
    initial_locked_at: isInitial
      ? new Date().toISOString()
      : championPrediction?.initial_locked_at || null,
    second_locked_at: isInitial
      ? championPrediction?.second_locked_at || null
      : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('champion_predictions')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    setMessage(`Erreur champion : ${error.message}`);
    return;
  }

  setMessage(
    isInitial
      ? 'Champion initial sauvegardé.'
      : 'Deuxième champion sauvegardé.'
  );

  await load();
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

    return (
      <div
        className={`card prediction-card ${cardStateClass} ${
          readOnly ? 'locked' : ''
        }`}
        key={match.id}
      >
        <div className="points-pill">{p?.points ?? 0} pts</div>

        <div className="prediction-badges">
          {!p && mode === 'upcoming' && (
            <span className="badge pending">🟡 À pronostiquer</span>
          )}

          {p && mode === 'upcoming' && !readOnly && (
            <span className="badge saved">✅ Enregistré</span>
          )}

          {readOnly && mode === 'upcoming' && (
            <span className="badge locked">🔒 Verrouillé</span>
          )}

          {mode === 'history' && (
            <span className="badge finished">🏁 Résultat disponible</span>
          )}

          {p?.double_bonus && <span className="badge fire">🔥 BONUS x2</span>}

          {p?.points >= 11 && <span className="badge perfect">🏆 PERFECT</span>}
        </div>

        <p className="small">
          {phaseLabels[match.phase] || match.phase} ·{' '}
          {new Date(match.kickoff_at).toLocaleString('fr-BE')}
        </p>

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

  <div style={{ fontWeight: 900, fontSize: 24, color: '#5eead4' }}>
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

        
        <div
          className="score-box"
          style={{ justifyContent: 'center', marginBottom: 14 }}
        >
          <input
            disabled={readOnly}
            type="number"
            min="0"
            value={p?.predicted_home_score ?? 0}
            onChange={(e) =>
              update(match, 'predicted_home_score', e.target.value)
            }
          />

          <div className="score-separator">-</div>

          <input
            disabled={readOnly}
            type="number"
            min="0"
            value={p?.predicted_away_score ?? 0}
            onChange={(e) =>
              update(match, 'predicted_away_score', e.target.value)
            }
          />
        </div>

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
                  {getTeamFlag(homeTeam, match.home_team)} {homeTeam?.name || match.home_team}
                </option>
              )}

              {match.away_team_id && (
                <option value={match.away_team_id}>
                  {getTeamFlag(awayTeam, match.away_team)} {awayTeam?.name || match.away_team}
                </option>
              )}
            </select>
          </div>

          <div>
            <label>Premier buteur</label>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => openScorerDropdown(match)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(15,23,42,0.9)',
                  color: 'white',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                }}
              >
                {selectedScorerLabel}
                <span style={{ float: 'right' }}>⌄</span>
              </button>

              {scorerDropdownOpen && !readOnly && (
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
          </div>

          {bonusAllowedPhases.includes(match.phase) && mode === 'upcoming' && (
            <label
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              <input
                type="checkbox"
                disabled={readOnly || bonusUnavailable}
                checked={p?.double_bonus ?? false}
                onChange={(e) => update(match, 'double_bonus', e.target.checked)}
                style={{ width: 'auto' }}
              />

              <span>{p?.double_bonus ? '🔥 Bonus x2 activé' : 'Bonus x2'}</span>
            </label>
          )}
        </div>

        {mode === 'upcoming' && (
          <button disabled={readOnly} onClick={() => save(match)}>
            {readOnly ? 'Verrouillé' : p ? 'Mettre à jour' : 'Sauvegarder'}
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="container">
      <h1>Mes pronostics</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setViewMode('upcoming')}
          className={viewMode === 'upcoming' ? '' : 'secondary'}
        >
          📅 À venir
        </button>

        <button
          type="button"
          onClick={() => setViewMode('history')}
          className={viewMode === 'history' ? '' : 'secondary'}
        >
          🏁 Historique
        </button>
      </div>

      {message && (
        <p className={message.includes('sauvegardé') ? 'success' : 'error'}>
          {message}
        </p>
      )}

      {viewMode === 'upcoming' && (
        <>
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

              <h2 style={{ margin: 0, textAlign: 'center' }}>
                {formatDateTitle(selectedDate)}
              </h2>

              <button
                type="button"
                className="secondary"
                onClick={() => setSelectedDate((date) => addDays(date, 1))}
              >
                Jour suivant ▶
              </button>
            </div>
          </div>

          <div className="card">
  <h2>🏆 Mon champion du monde</h2>

  <p className="small">
    Choisis ton champion avant la fin de la J1 pour tenter de gagner 20 points.
    Après les groupes, tu pourras faire un deuxième choix pour 10 points.
  </p>

  <div style={{ display: 'grid', gap: 16 }}>
    <div>
      <label>Champion initial — 20 pts</label>

      <select
        disabled={!canEditInitialChampion()}
        value={initialChampionTeamId}
        onChange={(e) => setInitialChampionTeamId(e.target.value)}
      >
        <option value="">Sélectionner une équipe</option>

        {Object.values(teams).map((team) => (
          <option key={team.id} value={team.id}>
            {team.code} — {team.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={!canEditInitialChampion()}
        onClick={() => saveChampionPrediction('initial')}
        style={{ marginTop: 10 }}
      >
        {canEditInitialChampion()
          ? 'Sauvegarder mon champion initial'
          : 'Champion initial verrouillé'}
      </button>
    </div>

    <hr style={{ opacity: 0.15, width: '100%' }} />

    <div>
      <label>Deuxième champion — 10 pts</label>

      <select
        disabled={!canEditSecondChampion()}
        value={secondChampionTeamId}
        onChange={(e) => setSecondChampionTeamId(e.target.value)}
      >
        <option value="">Sélectionner une équipe</option>

        {Object.values(teams).map((team) => (
          <option key={team.id} value={team.id}>
            {team.code} — {team.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={!canEditSecondChampion()}
        onClick={() => saveChampionPrediction('second')}
        style={{ marginTop: 10 }}
      >
        {canEditSecondChampion()
          ? 'Sauvegarder mon deuxième champion'
          : 'Deuxième champion verrouillé'}
      </button>
    </div>
  </div>
</div>





          
          {matchesForSelectedDate.length === 0 ? (
            <div className="card">
              <p>Aucun match prévu ce jour-là.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {matchesForSelectedDate.map((match) =>
                renderMatchCard(match, 'upcoming')
              )}
            </div>
          )}
        </>
      )}

      {viewMode === 'history' && (
  <>
    {historyMatches.length === 0 ? (
      <div className="card">
        <p>Aucun match terminé pour le moment.</p>
      </div>
    ) : (
      <div style={{ display: 'grid', gap: 16 }}>
        {historyMatches.map((match) =>
          renderMatchCard(match, 'history')
        )}
      </div>
    )}
  </>
)}
    </main>
  );
}
