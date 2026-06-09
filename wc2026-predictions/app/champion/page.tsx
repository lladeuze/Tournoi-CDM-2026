'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  position: string | null;
  position_order: number | null;
};

type Match = {
  id: string;
  kickoff_at: string;
  phase: string;
  status: string;
};

type ChampionPrediction = {
  id: string;
  user_id: string;
  initial_champion_team_id: string | null;
  second_champion_team_id: string | null;
  initial_locked_at: string | null;
  second_locked_at: string | null;
};

type AwardPrediction = {
  id: string;
  user_id: string;
  best_player_id: string | null;
  top_scorer_id: string | null;
  top_assister_id: string | null;
  best_goalkeeper_id: string | null;
  locked_at: string | null;
};

type AwardKey =
  | 'best_player'
  | 'top_scorer'
  | 'top_assist'
  | 'best_goalkeeper';

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

function getFlagUrl(team: Team) {
  const code = team.code?.trim().toUpperCase();
  const flagCode = code ? flagsByCode[code] : null;
  return flagCode ? `https://flagcdn.com/w160/${flagCode}.png` : null;
}

function formatDate(date: Date | null) {
  if (!date) return 'Date inconnue';

  return date.toLocaleString('fr-BE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPositionLabel(position: string | null) {
  if (position === 'ATT') return '⚽ ATT';
  if (position === 'MID') return '🎯 MID';
  if (position === 'DEF') return '🛡 DEF';
  if (position === 'GK') return '🧤 GK';
  return '❔';
}



const [openAwardKey, setOpenAwardKey] = useState<AwardKey | null>(null);




export default function ChampionPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [championPrediction, setChampionPrediction] =
    useState<ChampionPrediction | null>(null);
  const [awardPrediction, setAwardPrediction] =
    useState<AwardPrediction | null>(null);

  const [initialChampionTeamId, setInitialChampionTeamId] = useState('');
  const [secondChampionTeamId, setSecondChampionTeamId] = useState('');
  const [selectionMode, setSelectionMode] = useState<'initial' | 'second'>(
    'initial'
  );

  const [bestPlayerId, setBestPlayerId] = useState('');
  const [topScorerId, setTopScorerId] = useState('');
  const [topAssistId, setTopAssistId] = useState('');
  const [bestGoalkeeperId, setBestGoalkeeperId] = useState('');

  const [teamSearch, setTeamSearch] = useState('');

  const [awardSearchByKey, setAwardSearchByKey] = useState<
    Record<AwardKey, string>
  >({
    best_player: '',
    top_scorer: '',
    top_assist: '',
    best_goalkeeper: '',
  });

  const [awardTeamFilterByKey, setAwardTeamFilterByKey] = useState<
    Record<AwardKey, string>
  >({
    best_player: '',
    top_scorer: '',
    top_assist: '',
    best_goalkeeper: '',
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage('');

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setMessage(`Erreur utilisateur : ${userError.message}`);
      setLoading(false);
      return;
    }

    const user = userData.user;

    if (!user) {
      setMessage('Connecte-toi pour pronostiquer ton champion.');
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [
      { data: teamsData, error: teamsError },
      { data: playersData, error: playersError },
      { data: matchesData, error: matchesError },
      { data: championData, error: championError },
      { data: awardData, error: awardError },
    ] = await Promise.all([
      supabase.from('teams').select('*').order('name', { ascending: true }),

      supabase
        .from('players')
        .select('id, team_id, name, active, team_abr, position, position_order')
        .or('active.eq.true,active.is.null')
        .order('team_abr', { ascending: true })
        .order('position_order', { ascending: true })
        .order('name', { ascending: true }),

      supabase.from('matches').select('id, kickoff_at, phase, status'),

      supabase
        .from('champion_predictions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),

      supabase
        .from('award_predictions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (teamsError) {
      setMessage(`Erreur équipes : ${teamsError.message}`);
      setLoading(false);
      return;
    }

    if (playersError) {
      setMessage(`Erreur joueurs : ${playersError.message}`);
      setLoading(false);
      return;
    }

    if (matchesError) {
      setMessage(`Erreur matchs : ${matchesError.message}`);
      setLoading(false);
      return;
    }

    if (championError) {
      setMessage(`Erreur champion : ${championError.message}`);
      setLoading(false);
      return;
    }

    if (awardError) {
      setMessage(`Erreur trophées : ${awardError.message}`);
      setLoading(false);
      return;
    }

    setTeams((teamsData || []) as Team[]);
    setPlayers((playersData || []) as Player[]);
    setMatches((matchesData || []) as Match[]);

    if (championData) {
      setChampionPrediction(championData as ChampionPrediction);
      setInitialChampionTeamId(championData.initial_champion_team_id || '');
      setSecondChampionTeamId(championData.second_champion_team_id || '');
    }

    if (awardData) {
      setAwardPrediction(awardData as AwardPrediction);
      setBestPlayerId(awardData.best_player_id || '');
      setTopScorerId(awardData.top_scorer_id || '');
      setTopAssistId(awardData.top_assister_id || '');
      setBestGoalkeeperId(awardData.best_goalkeeper_id || '');
    }

    setLoading(false);
  }

  const teamsById = useMemo(() => {
    const result: Record<string, Team> = {};

    teams.forEach((team) => {
      result[team.id] = team;
    });

    return result;
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const search = teamSearch.trim().toLowerCase();

    if (!search) return teams;

    return teams.filter((team) => {
      return `${team.name} ${team.code || ''}`.toLowerCase().includes(search);
    });
  }, [teams, teamSearch]);

  const initialChampionTeam = useMemo(() => {
    return teams.find((team) => team.id === initialChampionTeamId) || null;
  }, [teams, initialChampionTeamId]);

  const secondChampionTeam = useMemo(() => {
    return teams.find((team) => team.id === secondChampionTeamId) || null;
  }, [teams, secondChampionTeamId]);

  function getFirstMatchDate() {
    if (matches.length === 0) return null;

    return new Date(
      Math.min(...matches.map((match) => new Date(match.kickoff_at).getTime()))
    );
  }

  function getLastGroupJ1MatchDate() {
    const groupJ1Matches = matches.filter(
      (match) => match.phase === 'group_j1'
    );

    if (groupJ1Matches.length === 0) return null;

    return new Date(
      Math.max(
        ...groupJ1Matches.map((match) =>
          new Date(match.kickoff_at).getTime()
        )
      )
    );
  }

  function canEditInitialChampion() {
    return true;
  }

  function canEditSecondChampion() {
    const now = new Date();

    const openingDate = new Date('2026-06-28T00:00:00+02:00');
    const closingDate = new Date('2026-06-29T18:00:00+02:00');

    return now >= openingDate && now <= closingDate;
  }

  function canEditAwardPredictions() {
    const firstMatchDate = getFirstMatchDate();

    if (!firstMatchDate) return false;

    return new Date().getTime() < firstMatchDate.getTime();
  }

  function getCurrentSelectedTeamId() {
    return selectionMode === 'initial'
      ? initialChampionTeamId
      : secondChampionTeamId;
  }

  function selectTeam(team: Team) {
    if (selectionMode === 'initial') {
      setInitialChampionTeamId(team.id);
      setMessage(`${team.name} sélectionné comme champion initial.`);
    } else {
      setSecondChampionTeamId(team.id);
      setMessage(`${team.name} sélectionné comme champion après groupes.`);
    }
  }

  function getPlayerTeam(player: Player) {
    return player.team_id ? teamsById[player.team_id] || null : null;
  }

  function getPlayerAbr(player: Player) {
    const team = getPlayerTeam(player);
    return player.team_abr || team?.code || '---';
  }

  function getSelectedPlayerLabel(playerId: string) {
    const player = players.find((p) => p.id === playerId);

    if (!player) return 'Aucune sélection';

    return `${getPositionLabel(player.position)} · ${player.name} — ${getPlayerAbr(
      player
    )}`;
  }

  function getFilteredPlayersForAward(key: AwardKey) {
    const search = awardSearchByKey[key].trim().toLowerCase();
    const selectedTeamId = awardTeamFilterByKey[key];

    let source = players;

    if (key === 'best_goalkeeper') {
      source = source.filter((player) => player.position === 'GK');
    }

    if (selectedTeamId) {
      source = source.filter((player) => player.team_id === selectedTeamId);
    }

    if (search) {
      source = source.filter((player) => {
        const team = getPlayerTeam(player);
        const label = `${player.name} ${player.team_abr || ''} ${
          team?.name || ''
        } ${team?.code || ''} ${player.position || ''}`;

        return label.toLowerCase().includes(search);
      });
    }

    return source.slice(0, 80);
  }

  function updateAwardSearch(key: AwardKey, value: string) {
    setAwardSearchByKey((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateAwardTeamFilter(key: AwardKey, value: string) {
    setAwardTeamFilterByKey((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function selectAwardPlayer(key: AwardKey, playerId: string) {
    if (key === 'best_player') setBestPlayerId(playerId);
    if (key === 'top_scorer') setTopScorerId(playerId);
    if (key === 'top_assist') setTopAssistId(playerId);
    if (key === 'best_goalkeeper') setBestGoalkeeperId(playerId);
  }

  function getAwardSelectedId(key: AwardKey) {
    if (key === 'best_player') return bestPlayerId;
    if (key === 'top_scorer') return topScorerId;
    if (key === 'top_assist') return topAssistId;
    return bestGoalkeeperId;
  }

  async function saveChampionPrediction(type: 'initial' | 'second') {
    if (!userId) return;

    const isInitial = type === 'initial';

    if (isInitial && !canEditInitialChampion()) {
      setMessage('Le champion initial est verrouillé.');
      return;
    }

    if (!isInitial && !canEditSecondChampion()) {
      setMessage(
        'Le deuxième champion ne peut être choisi qu’entre le 28 juin 2026 à 00h00 et le 29 juin 2026 à 18h00.'
      );
      return;
    }

    const selectedTeamId = isInitial
      ? initialChampionTeamId
      : secondChampionTeamId;

    const payload = {
      user_id: userId,
      initial_champion_team_id: isInitial
        ? selectedTeamId
        : championPrediction?.initial_champion_team_id ||
          initialChampionTeamId ||
          null,
      second_champion_team_id: isInitial
        ? championPrediction?.second_champion_team_id ||
          secondChampionTeamId ||
          null
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
        : 'Champion après groupes sauvegardé.'
    );

    await load();
  }

  async function saveAwardPrediction() {
    if (!userId) return;

    if (!canEditAwardPredictions()) {
      setMessage(
        'Les pronostics des trophées sont verrouillés car la compétition a commencé.'
      );
      return;
    }

    const { error } = await supabase.from('award_predictions').upsert(
      {
        user_id: userId,
        best_player_id: bestPlayerId || null,
        top_scorer_id: topScorerId || null,
        top_assister_id: topAssistId || null,
        best_goalkeeper_id: bestGoalkeeperId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      setMessage(`Erreur trophées : ${error.message}`);
      return;
    }

    setMessage('Pronostics des trophées sauvegardés.');
    await load();
  }

  function renderAwardSelector(title: string, key: AwardKey) {
  const selectedId = getAwardSelectedId(key);
  const filteredPlayers = getFilteredPlayersForAward(key);
  const disabled = !canEditAwardPredictions();
  const isOpen = openAwardKey === key;

  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: 18,
        background: 'rgba(15,23,42,0.75)',
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      {selectedId ? (
        <p>
          ✅ <strong>{getSelectedPlayerLabel(selectedId)}</strong>
        </p>
      ) : (
        <p className="small">Aucun joueur sélectionné.</p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpenAwardKey(isOpen ? null : key)}
        style={{ width: '100%', marginTop: 12 }}
      >
        {isOpen ? 'Fermer la sélection' : 'Choisir le joueur'}
      </button>

      {isOpen && (
        <div style={{ marginTop: 16 }}>
          <label>Pays / équipe</label>
          <select
            disabled={disabled}
            value={awardTeamFilterByKey[key]}
            onChange={(e) => updateAwardTeamFilter(key, e.target.value)}
          >
            <option value="">Tous les pays</option>

            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.code || '---'} — {team.name}
              </option>
            ))}
          </select>

          <label>Rechercher un joueur</label>
          <input
            disabled={disabled}
            type="text"
            placeholder="Écris un nom, une équipe ou un poste..."
            value={awardSearchByKey[key]}
            onChange={(e) => updateAwardSearch(key, e.target.value)}
          />

          <div
            style={{
              display: 'grid',
              gap: 6,
              maxHeight: 300,
              overflowY: 'auto',
              marginTop: 12,
            }}
          >
            <button
              type="button"
              disabled={disabled}
              className={!selectedId ? '' : 'secondary'}
              onClick={() => {
                selectAwardPlayer(key, '');
                setOpenAwardKey(null);
              }}
              style={{ textAlign: 'left' }}
            >
              Aucune sélection
            </button>

            {filteredPlayers.map((player) => {
              const selected = selectedId === player.id;

              return (
                <button
                  key={player.id}
                  type="button"
                  disabled={disabled}
                  className={selected ? '' : 'secondary'}
                  onClick={() => {
                    selectAwardPlayer(key, player.id);
                    setOpenAwardKey(null);
                  }}
                  style={{
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <span>
                    {selected ? '✅ ' : ''}
                    {getPositionLabel(player.position)} · {player.name}
                  </span>

                  <span className="small">{getPlayerAbr(player)}</span>
                </button>
              );
            })}

            {filteredPlayers.length === 0 && (
              <p className="small">Aucun joueur trouvé.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

  const lastGroupJ1Date = getLastGroupJ1MatchDate();
  const lastGroupDate = new Date('2026-06-28T00:00:00+02:00');
  const firstRoundOf32Date = new Date('2026-06-29T18:00:00+02:00');
  const firstMatchDate = getFirstMatchDate();

  return (
    <main className="container">
      <h1>🏆 Champion du Monde 2026</h1>

      <Link href="/predictions">
        <button type="button" className="secondary" style={{ marginBottom: 16 }}>
          ← Retour aux pronostics
        </button>
      </Link>

      {loading && <p className="small">Chargement...</p>}

      {message && (
        <p
          className={
            message.includes('sauvegardé') || message.includes('sélectionné')
              ? 'success'
              : 'error'
          }
        >
          {message}
        </p>
      )}

      {!loading && userId && (
        <>
          <div className="card">
            <h2>📋 Règles et barème</h2>

            <div style={{ display: 'grid', gap: 10 }}>
              <p>
                <strong>🎯 Champion initial :</strong> sélection disponible
                jusqu’à la fin des matchs de J1.
              </p>

              <p className="small">
                Verrouillage prévu : {formatDate(lastGroupJ1Date)}
              </p>

              <p>
                <strong>Récompense :</strong> +20 points si ton champion
                initial remporte la Coupe du Monde.
              </p>

              <hr style={{ opacity: 0.15, width: '100%' }} />

              <p>
                <strong>🔄 Champion après groupes :</strong> disponible après la
                fin des groupes et avant le début des 16es de finale.
              </p>

              <p className="small">
                Ouverture prévue : {formatDate(lastGroupDate)}
                <br />
                Fermeture prévue : {formatDate(firstRoundOf32Date)}
              </p>

              <p>
                <strong>Récompense :</strong> +10 points si ton deuxième choix
                devient champion.
              </p>

              <hr style={{ opacity: 0.15, width: '100%' }} />

              <p>
                <strong>🏅 Trophées individuels :</strong> +10 points par
                trophée correctement pronostiqué, soit jusqu’à +40 points bonus.
              </p>

              <p className="small">
                Verrouillage prévu : {formatDate(firstMatchDate)}
              </p>
            </div>
          </div>

          <div className="card">
            <h2>🏅 Pronostics trophées individuels</h2>

            <p className="small">
              Tu peux filtrer par pays ou rechercher directement un joueur.
            </p>

            {awardPrediction?.locked_at && (
              <p className="small">
                Dernière sauvegarde :{' '}
                {formatDate(new Date(awardPrediction.locked_at))}
              </p>
            )}

            <div className="grid">
              {renderAwardSelector('Meilleur joueur de la CDM', 'best_player')}
              {renderAwardSelector('Meilleur buteur', 'top_scorer')}
              {renderAwardSelector('Meilleur passeur', 'top_assist')}
              {renderAwardSelector('Meilleur gardien', 'best_goalkeeper')}
            </div>

            <button
              type="button"
              onClick={saveAwardPrediction}
              disabled={!canEditAwardPredictions()}
              style={{ marginTop: 16 }}
            >
              Sauvegarder mes trophées
            </button>

            {!canEditAwardPredictions() && (
              <p className="small" style={{ marginTop: 12 }}>
                🔒 Les pronostics des trophées sont verrouillés.
              </p>
            )}
          </div>

          <div className="grid">
            <div className="card">
              <h2>🎯 Champion initial (+20 pts)</h2>

              {initialChampionTeam ? (
                <p>
                  ✅ {initialChampionTeam.code} — {initialChampionTeam.name}
                </p>
              ) : (
                <p className="small">Aucun champion initial sélectionné.</p>
              )}

              <button
                type="button"
                onClick={() => saveChampionPrediction('initial')}
                disabled={!canEditInitialChampion() || !initialChampionTeamId}
                style={{ marginTop: 12 }}
              >
                Sauvegarder mon champion initial
              </button>
            </div>

            <div className="card">
              <h2>🔄 Champion après groupes (+10 pts)</h2>

              {secondChampionTeam ? (
                <p>
                  ✅ {secondChampionTeam.code} — {secondChampionTeam.name}
                </p>
              ) : (
                <p className="small">Aucun deuxième champion sélectionné.</p>
              )}

              <button
                type="button"
                onClick={() => saveChampionPrediction('second')}
                disabled={!canEditSecondChampion() || !secondChampionTeamId}
                style={{ marginTop: 12 }}
              >
                Sauvegarder mon champion après groupes
              </button>
            </div>
          </div>

          <div className="card">
            <h2>🎯 Je sélectionne actuellement</h2>

            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginTop: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setSelectionMode('initial')}
                className={selectionMode === 'initial' ? '' : 'secondary'}
              >
                Champion initial (+20 pts)
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('second')}
                className={selectionMode === 'second' ? '' : 'secondary'}
              >
                Champion après groupes (+10 pts)
              </button>
            </div>

            <p className="small" style={{ marginTop: 12 }}>
              Les équipes choisies ci-dessous seront appliquées à :
              <strong>
                {selectionMode === 'initial'
                  ? ' Champion initial'
                  : ' Champion après groupes'}
              </strong>
            </p>
          </div>

          <div className="card">
            <h2>
              🌍 Sélection des équipes —{' '}
              {selectionMode === 'initial'
                ? 'Champion initial'
                : 'Champion après groupes'}
            </h2>

            <label>Rechercher un pays</label>
            <input
              type="text"
              placeholder="Écris Belgique, FRA, Brésil..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
            />

            {teams.length === 0 ? (
              <p className="error">
                Aucune équipe chargée. Vérifie que la table teams est accessible
                avec les droits RLS.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {filteredTeams.map((team) => {
                  const flagUrl = getFlagUrl(team);
                  const selected = getCurrentSelectedTeamId() === team.id;

                  return (
                    <button
                      key={team.id}
                      type="button"
                      disabled={
                        selectionMode === 'initial'
                          ? !canEditInitialChampion()
                          : !canEditSecondChampion()
                      }
                      onClick={() => selectTeam(team)}
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        border: selected
                          ? '2px solid #5eead4'
                          : '1px solid rgba(255,255,255,0.12)',
                        background: selected
                          ? 'rgba(94,234,212,0.14)'
                          : 'rgba(255,255,255,0.04)',
                        color: 'white',
                        opacity:
                          selectionMode === 'initial'
                            ? canEditInitialChampion()
                              ? 1
                              : 0.45
                            : canEditSecondChampion()
                            ? 1
                            : 0.45,
                        cursor:
                          selectionMode === 'initial'
                            ? canEditInitialChampion()
                              ? 'pointer'
                              : 'not-allowed'
                            : canEditSecondChampion()
                            ? 'pointer'
                            : 'not-allowed',
                        display: 'grid',
                        gap: 8,
                        justifyItems: 'center',
                      }}
                    >
                      {flagUrl ? (
                        <img
                          src={flagUrl}
                          alt={`Drapeau ${team.name}`}
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

                      <strong>{team.code || '---'}</strong>
                      <span className="small">{team.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
