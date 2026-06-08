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
  top_assist_id: string | null;
  best_goalkeeper_id: string | null;
  locked_at: string | null;
};

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

function getPlayerLabel(player: Player) {
  return `${player.team_abr || '---'} — ${player.name}`;
}

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
      setTopAssistId(awardData.top_assist_id || '');
      setBestGoalkeeperId(awardData.best_goalkeeper_id || '');
    }

    setLoading(false);
  }

  const initialChampionTeam = useMemo(() => {
    return teams.find((team) => team.id === initialChampionTeamId) || null;
  }, [teams, initialChampionTeamId]);

  const secondChampionTeam = useMemo(() => {
    return teams.find((team) => team.id === secondChampionTeamId) || null;
  }, [teams, secondChampionTeamId]);

  const goalkeepers = useMemo(() => {
    return players.filter((player) => player.position === 'GK');
  }, [players]);

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
        top_assist_id: topAssistId || null,
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

              <p className="small">
                Si tu choisis la même équipe aux deux moments, tu restes
                éligible uniquement aux +20 points.
              </p>

              <hr style={{ opacity: 0.15, width: '100%' }} />

              <p>
                <strong>🏅 Trophées individuels :</strong> meilleur joueur,
                meilleur buteur, meilleur passeur et meilleur gardien doivent
                être pronostiqués avant le premier match.
              </p>

              <p>
                <strong>Récompense :</strong> +10 points par trophée individuel
                correctement pronostiqué, soit jusqu’à +40 points bonus.
              </p>

              <p className="small">
                Verrouillage prévu : {formatDate(firstMatchDate)}
              </p>
            </div>
          </div>

          <div className="card">
            <h2>🏅 Pronostics trophées individuels</h2>

            <p className="small">
              Ces pronostics doivent être encodés avant le premier match de la
              compétition.
            </p>

            <p className="small">
              Barème : +10 points par bon pronostic, soit jusqu’à 40 points
              bonus.
            </p>

            <p className="small">
              Verrouillage prévu : {formatDate(firstMatchDate)}
            </p>

            {awardPrediction?.locked_at && (
              <p className="small">
                Dernière sauvegarde :{' '}
                {formatDate(new Date(awardPrediction.locked_at))}
              </p>
            )}

            <div className="grid">
              <div>
                <label>Meilleur joueur de la CDM</label>
                <select
                  disabled={!canEditAwardPredictions()}
                  value={bestPlayerId}
                  onChange={(e) => setBestPlayerId(e.target.value)}
                >
                  <option value="">Aucune sélection</option>

                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {getPlayerLabel(player)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Meilleur buteur</label>
                <select
                  disabled={!canEditAwardPredictions()}
                  value={topScorerId}
                  onChange={(e) => setTopScorerId(e.target.value)}
                >
                  <option value="">Aucune sélection</option>

                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {getPlayerLabel(player)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Meilleur passeur</label>
                <select
                  disabled={!canEditAwardPredictions()}
                  value={topAssistId}
                  onChange={(e) => setTopAssistId(e.target.value)}
                >
                  <option value="">Aucune sélection</option>

                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {getPlayerLabel(player)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Meilleur gardien</label>
                <select
                  disabled={!canEditAwardPredictions()}
                  value={bestGoalkeeperId}
                  onChange={(e) => setBestGoalkeeperId(e.target.value)}
                >
                  <option value="">Aucune sélection</option>

                  {goalkeepers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {getPlayerLabel(player)}
                    </option>
                  ))}
                </select>
              </div>
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
                }}
              >
                {teams.map((team) => {
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
