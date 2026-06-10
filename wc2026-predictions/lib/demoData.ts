/* Demo dataset used when Supabase env vars are absent (maquette mode). */

export const DEMO_USER = {
  id: 'demo-user-0001',
  email: 'demo@cdm2026.app',
};

const today = new Date();
function at(daysFromNow: number, hour = 21, minute = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const demoTeams = [
  { id: 't-fra', name: 'France', code: 'FRA', logo_url: null },
  { id: 't-bel', name: 'Belgique', code: 'BEL', logo_url: null },
  { id: 't-bra', name: 'Brésil', code: 'BRA', logo_url: null },
  { id: 't-arg', name: 'Argentine', code: 'ARG', logo_url: null },
  { id: 't-esp', name: 'Espagne', code: 'ESP', logo_url: null },
  { id: 't-eng', name: 'Angleterre', code: 'ENG', logo_url: null },
  { id: 't-por', name: 'Portugal', code: 'POR', logo_url: null },
  { id: 't-ned', name: 'Pays-Bas', code: 'NED', logo_url: null },
  { id: 't-ger', name: 'Allemagne', code: 'GER', logo_url: null },
  { id: 't-mar', name: 'Maroc', code: 'MAR', logo_url: null },
  { id: 't-usa', name: 'États-Unis', code: 'USA', logo_url: null },
  { id: 't-mex', name: 'Mexique', code: 'MEX', logo_url: null },
];

export const demoMatches = [
  {
    id: 'm-1',
    home_team: 'France',
    away_team: 'Belgique',
    home_team_id: 't-fra',
    away_team_id: 't-bel',
    kickoff_at: at(0, 21, 0),
    home_score: null,
    away_score: null,
    first_scoring_team_id: null,
    first_scorer: null,
    status: 'scheduled',
    phase: 'group_j1',
    match_label: null,
  },
  {
    id: 'm-2',
    home_team: 'Brésil',
    away_team: 'Espagne',
    home_team_id: 't-bra',
    away_team_id: 't-esp',
    kickoff_at: at(0, 18, 0),
    home_score: null,
    away_score: null,
    first_scoring_team_id: null,
    first_scorer: null,
    status: 'scheduled',
    phase: 'group_j1',
    match_label: null,
  },
  {
    id: 'm-3',
    home_team: 'Argentine',
    away_team: 'Angleterre',
    home_team_id: 't-arg',
    away_team_id: 't-eng',
    kickoff_at: at(1, 21, 0),
    home_score: null,
    away_score: null,
    first_scoring_team_id: null,
    first_scorer: null,
    status: 'scheduled',
    phase: 'group_j1',
    match_label: null,
  },
  {
    id: 'm-4',
    home_team: 'Portugal',
    away_team: 'Maroc',
    home_team_id: 't-por',
    away_team_id: 't-mar',
    kickoff_at: at(2, 18, 0),
    home_score: null,
    away_score: null,
    first_scoring_team_id: null,
    first_scorer: null,
    status: 'scheduled',
    phase: 'group_j2',
    match_label: null,
  },
  {
    id: 'm-past-1',
    home_team: 'Allemagne',
    away_team: 'Pays-Bas',
    home_team_id: 't-ger',
    away_team_id: 't-ned',
    kickoff_at: at(-2, 21, 0),
    home_score: 2,
    away_score: 1,
    first_scoring_team_id: 't-ger',
    first_scorer: 'Florian Wirtz',
    status: 'finished',
    phase: 'group_j1',
    match_label: null,
  },
  {
    id: 'm-past-2',
    home_team: 'États-Unis',
    away_team: 'Mexique',
    home_team_id: 't-usa',
    away_team_id: 't-mex',
    kickoff_at: at(-3, 18, 0),
    home_score: 1,
    away_score: 1,
    first_scoring_team_id: 't-mex',
    first_scorer: 'Santiago Giménez',
    status: 'finished',
    phase: 'group_j1',
    match_label: 'Match d’ouverture',
  },
];

export const demoPlayers = [
  { id: 'p-1', team_id: 't-fra', name: 'Kylian Mbappé', active: true, team_abr: 'FRA', position: 'ATT', position_order: 1 },
  { id: 'p-2', team_id: 't-fra', name: 'Ousmane Dembélé', active: true, team_abr: 'FRA', position: 'ATT', position_order: 1 },
  { id: 'p-3', team_id: 't-fra', name: 'Aurélien Tchouaméni', active: true, team_abr: 'FRA', position: 'MID', position_order: 2 },
  { id: 'p-4', team_id: 't-bel', name: 'Romelu Lukaku', active: true, team_abr: 'BEL', position: 'ATT', position_order: 1 },
  { id: 'p-5', team_id: 't-bel', name: 'Kevin De Bruyne', active: true, team_abr: 'BEL', position: 'MID', position_order: 2 },
  { id: 'p-6', team_id: 't-bel', name: 'Thibaut Courtois', active: true, team_abr: 'BEL', position: 'GK', position_order: 4 },
  { id: 'p-7', team_id: 't-bra', name: 'Vinícius Júnior', active: true, team_abr: 'BRA', position: 'ATT', position_order: 1 },
  { id: 'p-8', team_id: 't-bra', name: 'Rodrygo', active: true, team_abr: 'BRA', position: 'ATT', position_order: 1 },
  { id: 'p-9', team_id: 't-esp', name: 'Lamine Yamal', active: true, team_abr: 'ESP', position: 'ATT', position_order: 1 },
  { id: 'p-10', team_id: 't-esp', name: 'Pedri', active: true, team_abr: 'ESP', position: 'MID', position_order: 2 },
  { id: 'p-11', team_id: 't-arg', name: 'Lionel Messi', active: true, team_abr: 'ARG', position: 'ATT', position_order: 1 },
  { id: 'p-12', team_id: 't-arg', name: 'Julián Álvarez', active: true, team_abr: 'ARG', position: 'ATT', position_order: 1 },
  { id: 'p-13', team_id: 't-eng', name: 'Jude Bellingham', active: true, team_abr: 'ENG', position: 'MID', position_order: 2 },
  { id: 'p-14', team_id: 't-eng', name: 'Harry Kane', active: true, team_abr: 'ENG', position: 'ATT', position_order: 1 },
  { id: 'p-15', team_id: 't-por', name: 'Cristiano Ronaldo', active: true, team_abr: 'POR', position: 'ATT', position_order: 1 },
  { id: 'p-16', team_id: 't-mar', name: 'Achraf Hakimi', active: true, team_abr: 'MAR', position: 'DEF', position_order: 3 },
];

export const demoLeagues = [
  { id: 'l-1', name: 'Les Potes 2026', code: 'POTES26', owner_id: DEMO_USER.id, created_at: at(-20, 12, 0) },
  { id: 'l-2', name: 'Bureau Zenor', code: 'ZENOR26', owner_id: 'other-1', created_at: at(-18, 12, 0) },
];

export const demoLeaderboard = [
  { user_id: 'other-2', username: 'Sophie', total_points: 87, predictions_count: 12, exact_scores_count: 4, correct_results_count: 9, first_scorers_count: 3, champion_bonus_points: 20 },
  { user_id: DEMO_USER.id, username: 'Toi (démo)', total_points: 74, predictions_count: 11, exact_scores_count: 3, correct_results_count: 8, first_scorers_count: 2, champion_bonus_points: 0 },
  { user_id: 'other-1', username: 'Marc', total_points: 68, predictions_count: 12, exact_scores_count: 2, correct_results_count: 9, first_scorers_count: 4, champion_bonus_points: 0 },
  { user_id: 'other-3', username: 'Lucas', total_points: 55, predictions_count: 10, exact_scores_count: 2, correct_results_count: 7, first_scorers_count: 1, champion_bonus_points: 0 },
  { user_id: 'other-4', username: 'Emma', total_points: 41, predictions_count: 9, exact_scores_count: 1, correct_results_count: 6, first_scorers_count: 0, champion_bonus_points: 0 },
];

export const demoProfile = {
  id: DEMO_USER.id,
  email: DEMO_USER.email,
  username: 'Toi (démo)',
  is_admin: true,
  created_at: at(-25, 10, 0),
};

export const demoPredictions = [
  {
    id: 'pr-1',
    user_id: DEMO_USER.id,
    match_id: 'm-1',
    predicted_home_score: 2,
    predicted_away_score: 1,
    predicted_first_scorer: 'Kylian Mbappé',
    predicted_first_scorer_id: 'p-1',
    predicted_first_scoring_team_id: 't-fra',
    double_bonus: true,
    points: 0,
    exact_score: false,
    correct_result: false,
    first_scorer_correct: false,
  },
  {
    id: 'pr-past-1',
    user_id: DEMO_USER.id,
    match_id: 'm-past-1',
    predicted_home_score: 2,
    predicted_away_score: 1,
    predicted_first_scorer: 'Florian Wirtz',
    predicted_first_scorer_id: null,
    predicted_first_scoring_team_id: 't-ger',
    double_bonus: false,
    points: 11,
    exact_score: true,
    correct_result: true,
    first_scorer_correct: true,
  },
  {
    id: 'pr-past-2',
    user_id: DEMO_USER.id,
    match_id: 'm-past-2',
    predicted_home_score: 2,
    predicted_away_score: 0,
    predicted_first_scorer: 'Christian Pulisic',
    predicted_first_scorer_id: null,
    predicted_first_scoring_team_id: 't-usa',
    double_bonus: false,
    points: 0,
    exact_score: false,
    correct_result: false,
    first_scorer_correct: false,
  },
];

export const demoOtherPredictions = [
  { user_id: 'other-2', username: 'Sophie', predicted_home_score: 1, predicted_away_score: 1, predicted_first_scoring_team_id: 't-bel', predicted_first_scorer: 'Kevin De Bruyne', predicted_first_scorer_id: 'p-5' },
  { user_id: 'other-1', username: 'Marc', predicted_home_score: 3, predicted_away_score: 0, predicted_first_scoring_team_id: 't-fra', predicted_first_scorer: 'Ousmane Dembélé', predicted_first_scorer_id: 'p-2' },
  { user_id: 'other-3', username: 'Lucas', predicted_home_score: 2, predicted_away_score: 2, predicted_first_scoring_team_id: 't-fra', predicted_first_scorer: null, predicted_first_scorer_id: null },
];

export const demoChampionPrediction = {
  id: 'cp-1',
  user_id: DEMO_USER.id,
  initial_champion_team_id: 't-fra',
  second_champion_team_id: null,
  initial_locked_at: at(-25, 10, 0),
  second_locked_at: null,
};

export const demoAwardPrediction = {
  id: 'ap-1',
  user_id: DEMO_USER.id,
  best_player_id: 'p-1',
  top_scorer_id: 'p-1',
  top_assister_id: 'p-5',
  best_goalkeeper_id: 'p-6',
  locked_at: at(-25, 10, 0),
};

/* Maps a queried table/view name to its demo rows. */
export const demoTables: Record<string, any[]> = {
  teams: demoTeams,
  matches: demoMatches,
  players: demoPlayers,
  leagues: demoLeagues,
  leaderboard: demoLeaderboard,
  predictions: demoPredictions,
  profiles: [demoProfile],
  champion_predictions: [demoChampionPrediction],
  award_predictions: [demoAwardPrediction],
  league_members: demoLeagues.map((l) => ({ league_id: l.id, user_id: DEMO_USER.id, leagues: l })),
  league_members_public: demoLeagues.flatMap((l) =>
    demoLeaderboard.map((p) => ({ league_id: l.id, user_id: p.user_id, leagues: l }))
  ),
};
