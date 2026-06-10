'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Team = {
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

type TournamentSettings = {
  id: number;
  winner_team_id: string | null;
  best_player_id: string | null;
  top_scorer_id: string | null;
  top_assister_id: string | null;
  best_goalkeeper_id: string | null;
  updated_at: string | null;
};

type AwardKey =
  | 'best_player_id'
  | 'top_scorer_id'
  | 'top_assister_id'
  | 'best_goalkeeper_id';

const awardLabels: Record<AwardKey, string> = {
  best_player_id: 'Meilleur joueur',
  top_scorer_id: 'Meilleur buteur',
  top_assister_id: 'Meilleur passeur',
  best_goalkeeper_id: 'Meilleur gardien',
};

function getPositionLabel(position: string | null) {
  if (position === 'ATT') return 'ATT';
  if (position === 'MID') return 'MID';
  if (position === 'DEF') return 'DEF';
  if (position === 'GK') return 'GK';
  return '';
}

export default function TournamentAwards() {
  const [settings, setSettings] = useState<TournamentSettings | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [openAwardKey, setOpenAwardKey] = useState<AwardKey | null>(null);

  const [values, setValues] = useState<Record<AwardKey, string>>({
    best_player_id: '',
    top_scorer_id: '',
    top_assister_id: '',
    best_goalkeeper_id: '',
  });

  const [searchByAward, setSearchByAward] = useState<Record<AwardKey, string>>({
    best_player_id: '',
    top_scorer_id: '',
    top_assister_id: '',
    best_goalkeeper_id: '',
  });

  const [teamFilterByAward, setTeamFilterByAward] = useState<
    Record<AwardKey, string>
  >({
    best_player_id: '',
    top_scorer_id: '',
    top_assister_id: '',
    best_goalkeeper_id: '',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage('');

    const [
      { data: settingsData, error: settingsError },
      { data: teamsData, error: teamsError },
      { data: playersData, error: playersError },
    ] = await Promise.all([
      supabase
        .from('tournament_settings')
        .select(
          'id, winner_team_id, best_player_id, top_scorer_id, top_assister_id, best_goalkeeper_id, updated_at'
        )
        .eq('id', 1)
        .maybeSingle(),

      supabase.from('teams').select('id, name, code').order('name'),

      supabase
        .from('players')
        .select('id, team_id, name, active, team_abr, position, position_order')
        .or('active.eq.true,active.is.null')
        .order('team_abr', { ascending: true })
        .order('position_order', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    if (settingsError) {
      setMessage(`Erreur paramètres tournoi : ${settingsError.message}`);
      setLoading(false);
      return;
    }

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

    const teamsById: Record<string, Team> = {};
    (teamsData || []).forEach((team: Team) => {
      teamsById[team.id] = team;
    });

    setTeams(teamsById);
    setPlayers((playersData || []) as Player[]);

    if (settingsData) {
      setSettings(settingsData as TournamentSettings);
      setValues({
        best_player_id: settingsData.best_player_id || '',
        top_scorer_id: settingsData.top_scorer_id || '',
        top_assister_id: settingsData.top_assister_id || '',
        best_goalkeeper_id: settingsData.best_goalkeeper_id || '',
      });
    }

    setLoading(false);
  }

  const teamsList = useMemo(() => {
    return Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  function getPlayerAbr(player: Player) {
    return (
      player.team_abr ||
      (player.team_id ? teams[player.team_id]?.code : null) ||
      '---'
    );
  }

  function getSelectedPlayerLabel(playerId: string) {
    if (!playerId) return 'Aucune sélection';

    const player = players.find((p) => p.id === playerId);

    if (!player) return 'Joueur introuvable';

    return `${getPositionLabel(player.position)} · ${
      player.name
    } — ${getPlayerAbr(player)}`;
  }

  function getFilteredPlayers(awardKey: AwardKey) {
    const search = searchByAward[awardKey].trim().toLowerCase();
    const teamId = teamFilterByAward[awardKey];

    let source = players;

    if (awardKey === 'best_goalkeeper_id') {
      source = source.filter((player) => player.position === 'GK');
    }

    if (teamId) {
      source = source.filter((player) => player.team_id === teamId);
    }

    if (search) {
      source = source.filter((player) => {
        const team = player.team_id ? teams[player.team_id] : null;

        const label = `${player.name} ${player.team_abr || ''} ${
          team?.name || ''
        } ${team?.code || ''} ${player.position || ''}`;

        return label.toLowerCase().includes(search);
      });
    }

    return source.slice(0, 80);
  }

  function updateAwardValue(awardKey: AwardKey, playerId: string) {
    setValues((current) => ({
      ...current,
      [awardKey]: playerId,
    }));
  }

  async function saveAwards() {
    setMessage('');

    const { error } = await supabase.from('tournament_settings').upsert(
      {
        id: 1,
        winner_team_id: settings?.winner_team_id || null,
        best_player_id: values.best_player_id || null,
        top_scorer_id: values.top_scorer_id || null,
        top_assister_id: values.top_assister_id || null,
        best_goalkeeper_id: values.best_goalkeeper_id || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      setMessage(`Erreur trophées officiels : ${error.message}`);
      return;
    }

    setMessage('Trophées individuels officiels sauvegardés.');
    await load();
  }

  function renderAwardSelector(awardKey: AwardKey) {
    const filteredPlayers = getFilteredPlayers(awardKey);
    const selectedId = values[awardKey];
    const isOpen = openAwardKey === awardKey;

    return (
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 18,
          background: 'var(--elevated)',
        }}
      >
        <h3 style={{ marginTop: 0 }}>{awardLabels[awardKey]}</h3>

        {selectedId ? (
          <p>
            <strong>{getSelectedPlayerLabel(selectedId)}</strong>
          </p>
        ) : (
          <p className="small">Aucun joueur sélectionné.</p>
        )}

        <button
          type="button"
          onClick={() => setOpenAwardKey(isOpen ? null : awardKey)}
          style={{ width: '100%', marginTop: 12 }}
        >
          {isOpen ? 'Fermer la sélection' : 'Choisir le joueur'}
        </button>

        {isOpen && (
          <div style={{ marginTop: 16 }}>
            <label>Pays / équipe</label>
            <select
              value={teamFilterByAward[awardKey]}
              onChange={(e) =>
                setTeamFilterByAward((current) => ({
                  ...current,
                  [awardKey]: e.target.value,
                }))
              }
            >
              <option value="">Tous les pays</option>

              {teamsList.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.code || '---'} — {team.name}
                </option>
              ))}
            </select>

            <label>Rechercher un joueur</label>
            <input
              type="text"
              placeholder="Nom, pays, code ou poste..."
              value={searchByAward[awardKey]}
              onChange={(e) =>
                setSearchByAward((current) => ({
                  ...current,
                  [awardKey]: e.target.value,
                }))
              }
            />

            <div
              style={{
                display: 'grid',
                gap: 6,
                maxHeight: 280,
                overflowY: 'auto',
                marginTop: 12,
              }}
            >
              <button
                type="button"
                className={!selectedId ? '' : 'secondary'}
                onClick={() => {
                  updateAwardValue(awardKey, '');
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
                    className={selected ? '' : 'secondary'}
                    onClick={() => {
                      updateAwardValue(awardKey, player.id);
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
                      {selected ? '' : ''}
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

  return (
    <div className="card">
      <h2>Trophées individuels officiels</h2>

      <p className="small">
        Ces choix servent à attribuer les +10 points par trophée correctement
        pronostiqué.
      </p>

      {loading && <p className="small">Chargement des trophées...</p>}

      {message && (
        <p className={message.includes('sauvegardés') ? 'success' : 'error'}>
          {message}
        </p>
      )}

      {!loading && (
        <>
          <div className="grid">
            {renderAwardSelector('best_player_id')}
            {renderAwardSelector('top_scorer_id')}
            {renderAwardSelector('top_assister_id')}
            {renderAwardSelector('best_goalkeeper_id')}
          </div>

          <button type="button" onClick={saveAwards} style={{ marginTop: 16 }}>
            Sauvegarder les trophées officiels
          </button>
        </>
      )}
    </div>
  );
}
