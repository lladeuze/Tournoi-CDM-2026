
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

export default function ChampionPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [championPrediction, setChampionPrediction] =
    useState<ChampionPrediction | null>(null);

  const [initialChampionTeamId, setInitialChampionTeamId] = useState('');
  const [secondChampionTeamId, setSecondChampionTeamId] = useState('');

  const [selectionMode, setSelectionMode] = useState<'initial' | 'second'>(
    'initial'
  );

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
      { data: matchesData, error: matchesError },
      { data: championData, error: championError },
    ] = await Promise.all([
      supabase.from('teams').select('*').order('name', { ascending: true }),
      supabase.from('matches').select('id, kickoff_at, phase, status'),
      supabase
        .from('champion_predictions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (teamsError) {
      setMessage(`Erreur équipes : ${teamsError.message}`);
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

    setTeams((teamsData || []) as Team[]);
    setMatches((matchesData || []) as Match[]);

    if (championData) {
      setChampionPrediction(championData as ChampionPrediction);
      setInitialChampionTeamId(championData.initial_champion_team_id || '');
      setSecondChampionTeamId(championData.second_champion_team_id || '');
    }

    setLoading(false);
  }

  const initialChampionTeam = useMemo(() => {
    return teams.find((team) => team.id === initialChampionTeamId) || null;
  }, [teams, initialChampionTeamId]);

  const secondChampionTeam = useMemo(() => {
    return teams.find((team) => team.id === secondChampionTeamId) || null;
  }, [teams, secondChampionTeamId]);

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
  return true;
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

  function getCurrentSelectedTeamId() {
    return selectionMode === 'initial'
      ? initialChampionTeamId
      : secondChampionTeamId;
  }

  function selectTeam(teamId: string) {
    if (selectionMode === 'initial') {
      setInitialChampionTeamId(teamId);
    } else {
      setSecondChampionTeamId(teamId);
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
        'Le deuxième champion est disponible uniquement après les groupes et avant les 16es.'
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
        : 'Deuxième champion sauvegardé.'
    );

    await load();
  }

  const lastGroupJ1Date = getLastGroupJ1MatchDate();
  const lastGroupDate = getLastGroupMatchDate();
  const firstRoundOf32Date = getFirstRoundOf32MatchDate();

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
        <p className={message.includes('sauvegardé') ? 'success' : 'error'}>
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
                <strong>🔄 Deuxième pronostic :</strong> disponible après la fin
                des groupes et avant le début des 16es de finale.
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
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <div className="card">
  <h2>🎯 Champion initial (+20 pts)</h2>

  {initialChampionTeam ? (
    <p>
      ✅ {initialChampionTeam.code} — {initialChampionTeam.name}
    </p>
  ) : (
    <p className="small">
      Aucun champion initial sélectionné.
    </p>
  )}

  <button
    type="button"
    onClick={() => saveChampionPrediction('initial')}
    disabled={!initialChampionTeamId}
    style={{ marginTop: 12 }}
  >
    Sauvegarder mon champion initial
  </button>
</div>
            </div>

            <div className="card">
              <div className="card">
  <h2>🔄 Champion après groupes (+10 pts)</h2>

  {secondChampionTeam ? (
    <p>
      ✅ {secondChampionTeam.code} — {secondChampionTeam.name}
    </p>
  ) : (
    <p className="small">
      Aucun deuxième champion sélectionné.
    </p>
  )}

  <button
    type="button"
    onClick={() => saveChampionPrediction('second')}
    disabled={!secondChampionTeamId}
    style={{ marginTop: 12 }}
  >
    Sauvegarder mon deuxième champion
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
      className={
        selectionMode === 'initial' ? '' : 'secondary'
      }
    >
      Champion initial (+20 pts)
    </button>

    <button
      type="button"
      onClick={() => setSelectionMode('second')}
      className={
        selectionMode === 'second' ? '' : 'secondary'
      }
    >
      Champion après groupes (+10 pts)
    </button>
  </div>

  <p
    className="small"
    style={{ marginTop: 12 }}
  >
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

                const disabled =
                  selectionMode === 'initial'
                    ? !canEditInitialChampion()
                    : !canEditSecondChampion();

                return (
                  <button
                    key={team.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectTeam(team.id)}
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
                      cursor: disabled ? 'not-allowed' : 'pointer',
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
          </div>
        </>
      )}
    </main>
  );
}
