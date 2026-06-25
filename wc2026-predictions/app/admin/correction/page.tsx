'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  is_admin: boolean | null;
};

type Team = {
  id: string;
  name: string;
  code: string | null;
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
  status: string;
  phase: string | null;
};

type Player = {
  id: string;
  name: string;
  team_id: string;
  team_abr: string | null;
  position: string | null;
  position_order: number | null;
};

type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_first_scorer: string | null;
  predicted_first_scorer_id: string | null;
  predicted_first_scoring_team_id: string | null;
  double_bonus: boolean | null;
};

export default function CorrectionPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Player[]>([]);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');

  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [firstScoringTeamId, setFirstScoringTeamId] = useState('');
  const [firstScorerId, setFirstScorerId] = useState('');
  const [doubleBonus, setDoubleBonus] = useState(false);

  const [message, setMessage] = useState('');

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) ?? null,
    [matches, selectedMatchId]
  );

  const availablePlayers = useMemo(() => {
    if (!selectedMatch) return [];

    const teamIds = [
      selectedMatch.home_team_id,
      selectedMatch.away_team_id,
    ].filter(Boolean);

    return players.filter((p) => teamIds.includes(p.team_id));
  }, [players, selectedMatch]);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (selectedUserId && selectedMatchId) {
      loadExistingPrediction();
    }
  }, [selectedUserId, selectedMatchId]);

  async function init() {
    setLoading(true);
    setMessage('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!myProfile?.is_admin) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const [profilesRes, matchesRes, teamsRes, playersRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, email, is_admin')
        .order('username', { ascending: true }),

      supabase
        .from('matches')
        .select(
          'id, home_team, away_team, home_team_id, away_team_id, kickoff_at, home_score, away_score, status, phase'
        )
        .order('kickoff_at', { ascending: false }),

      supabase
        .from('teams')
        .select('id, name, code'),

      supabase
        .from('players')
        .select('id, name, team_id, team_abr, position, position_order')
        .or('active.eq.true,active.is.null')
        .order('team_abr', { ascending: true })
        .order('position_order', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (matchesRes.data) setMatches(matchesRes.data);
    if (playersRes.data) setPlayers(playersRes.data);

    if (teamsRes.data) {
      const map: Record<string, Team> = {};
      teamsRes.data.forEach((t) => {
        map[t.id] = t;
      });
      setTeams(map);
    }

    setLoading(false);
  }

  async function loadExistingPrediction() {
    setMessage('');

    const { data } = await supabase
      .from('predictions')
      .select(
        'id, user_id, match_id, predicted_home_score, predicted_away_score, predicted_first_scorer, predicted_first_scorer_id, predicted_first_scoring_team_id, double_bonus'
      )
      .eq('user_id', selectedUserId)
      .eq('match_id', selectedMatchId)
      .maybeSingle<Prediction>();

    if (data) {
      setHomeScore(String(data.predicted_home_score ?? 0));
      setAwayScore(String(data.predicted_away_score ?? 0));
      setFirstScoringTeamId(data.predicted_first_scoring_team_id ?? '');
      setFirstScorerId(data.predicted_first_scorer_id ?? '');
      setDoubleBonus(Boolean(data.double_bonus));
      setMessage('Prono existant chargé. Il sera modifié à la sauvegarde.');
    } else {
      setHomeScore('0');
      setAwayScore('0');
      setFirstScoringTeamId('');
      setFirstScorerId('');
      setDoubleBonus(false);
      setMessage('Aucun prono existant. Un nouveau prono sera créé.');
    }
  }

  async function saveCorrection() {
    if (!selectedUserId || !selectedMatchId || !selectedMatch) {
      setMessage('Sélectionne un utilisateur et un match.');
      return;
    }

    const selectedPlayer = availablePlayers.find((p) => p.id === firstScorerId);

    const payload = {
      user_id: selectedUserId,
      match_id: selectedMatchId,
      predicted_home_score: Number(homeScore),
      predicted_away_score: Number(awayScore),
      predicted_first_scoring_team_id: firstScoringTeamId || null,
      predicted_first_scorer_id: firstScorerId || null,
      predicted_first_scorer: selectedPlayer?.name ?? null,
      double_bonus: doubleBonus,
      phase: selectedMatch.phase,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('predictions')
      .upsert(payload, {
        onConflict: 'user_id,match_id',
      });

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setMessage('Correction sauvegardée. Tu peux maintenant relancer le recalcul des points.');
  }

  if (loading) {
    return <main className="page-shell">Chargement...</main>;
  }

  if (!isAdmin) {
    return (
      <main className="page-shell">
        <h1>Accès refusé</h1>
        <p>Cette page est réservée aux administrateurs.</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <h1>Correction des pronos</h1>
          <p>
            Ajouter ou modifier un prono même si le match est déjà commencé ou terminé.
          </p>
        </div>

        <Link href="/admin" className="admin-action-btn">
          Retour admin
        </Link>
      </div>

      <section className="admin-card">
        <label>Utilisateur</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">Sélectionner un utilisateur</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.username || p.email || p.id}
            </option>
          ))}
        </select>

        <label>Match</label>
        <select
          value={selectedMatchId}
          onChange={(e) => setSelectedMatchId(e.target.value)}
        >
          <option value="">Sélectionner un match</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {new Date(m.kickoff_at).toLocaleString('fr-BE')} — {m.home_team} vs{' '}
              {m.away_team} — {m.status}
            </option>
          ))}
        </select>

        {selectedMatch && (
          <>
            <div className="score-row">
              <div>
                <label>{selectedMatch.home_team}</label>
                <input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                />
              </div>

              <div>
                <label>{selectedMatch.away_team}</label>
                <input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                />
              </div>
            </div>

            <label>Première équipe qui marque</label>
            <select
              value={firstScoringTeamId}
              onChange={(e) => setFirstScoringTeamId(e.target.value)}
            >
              <option value="">Aucune / 0-0</option>

              {selectedMatch.home_team_id && (
                <option value={selectedMatch.home_team_id}>
                  {teams[selectedMatch.home_team_id]?.code || selectedMatch.home_team}
                </option>
              )}

              {selectedMatch.away_team_id && (
                <option value={selectedMatch.away_team_id}>
                  {teams[selectedMatch.away_team_id]?.code || selectedMatch.away_team}
                </option>
              )}
            </select>

            <label>Premier buteur</label>
            <select
              value={firstScorerId}
              onChange={(e) => setFirstScorerId(e.target.value)}
            >
              <option value="">Aucun buteur / 0-0</option>

              {availablePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.team_abr ? `${p.team_abr} — ` : ''}
                  {p.name}
                  {p.position ? ` (${p.position})` : ''}
                </option>
              ))}
            </select>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={doubleBonus}
                onChange={(e) => setDoubleBonus(e.target.checked)}
              />
              Bonus x2
            </label>

            <button className="admin-action-btn" onClick={saveCorrection}>
              Sauvegarder la correction
            </button>
          </>
        )}

        {message && <p className="admin-message">{message}</p>}
      </section>
    </main>
  );
}
